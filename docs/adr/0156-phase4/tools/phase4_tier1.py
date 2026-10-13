#!/usr/bin/env python3
"""ADR-0156 Phase 4 Tier 1 replay (approved by Jonathan 2026-10-13, hard cap 4.5 USD for Tier 1 + Tier 2).
Rebuilds the Part 2 prompt of module 3000 (or 4020) from the local Parent86 blueprint with the package's stored Part 1, roster and chat, calls the model with the
module's settings (Sonnet 5.5, adaptive thinking, medium effort) and saves the raw answer. Nothing is written to the database.
usage: phase4_tier1.py <package-id-prefix> <module 3000|4020> <sample-number> [blueprint-file]
env: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY (from .env, never printed); P4_CAP (USD, default 1.5 for this call)"""
import os, json, re, sys, time, urllib.request, urllib.error
PRICE_IN, PRICE_OUT = 3.0/1e6, 15.0/1e6   # assumed Sonnet-class prices; actual tokens are logged
K = os.environ['ANTHROPIC_API_KEY']; SB = os.environ['SUPABASE_SERVICE_ROLE_KEY']
URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/'
base = 'temp-files/charctx/'
pid_prefix, module, sample = sys.argv[1], int(sys.argv[2]), sys.argv[3]
bpfile = sys.argv[4] if len(sys.argv) > 4 else 'temp-files/MM Live - Parent86 (Observer Field).blueprint.json'
CAP = float(os.environ.get('P4_CAP', '1.5'))
pk = next(p for p in json.load(open(base+'packages.json')) if p['id'].startswith(pid_prefix))
def rest(q):
    r = urllib.request.Request(URL+q, headers={'apikey': SB, 'Authorization': 'Bearer '+SB})
    return json.load(urllib.request.urlopen(r, timeout=90))
row = rest(f"mystery_packages?select=title,user_conversation,extracted_characters&id=eq.{pk['id']}")[0]
conv = rest(f"conversations?select=player_count,script_type,has_accomplice,title&id=eq.{pk['conversation_id']}")[0]
roster = json.loads('[' + row['extracted_characters'] + ']') if isinstance(row['extracted_characters'], str) else row['extracted_characters']
for i, c in enumerate(roster, 1):
    if c.get('index') is None: c['index'] = i
# Part 1 = first JSON object of the stored master_context
mc = pk['master_context']; depth = 0; ins = False; esc = False; start = None
for i, ch in enumerate(mc):
    if ins:
        if esc: esc = False
        elif ch == '\\': esc = True
        elif ch == '"': ins = False
        continue
    if ch == '"': ins = True
    elif ch == '{':
        if depth == 0 and start is None: start = i
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0: part1 = mc[start:i+1]; break
bp = json.load(open(bpfile))
def walk(flow):
    for m in flow:
        yield m
        for r in m.get('routes', []) or []: yield from walk(r.get('flow', []))
tpl = next(m for m in walk(bp['flow']) if m['id'] == module)['mapper']['messages'][0]['content'][0]['text']
convtext = row['user_conversation'] or ''
vals = {'63.title': conv['title'] or row['title'], '63.playerCount': str(conv['player_count']), '63.scriptType': str(conv['script_type']),
        '63.hasAccomplice': str(bool(conv['has_accomplice'])).lower(), '63.mysteryType': pk and 'murder', '164.array': json.dumps(roster, ensure_ascii=False)}
def rep(m):
    k = m.group(1).strip()
    if k.startswith('ifempty(171.') or k.startswith('ifempty(2417.'): return part1
    if k.startswith('substring(63.conversationContent'): return convtext[-80000:]
    return vals.get(k, m.group(0))
prompt = re.sub(r'\{\{\s*([^}]+?)\s*\}\}', rep, tpl, flags=re.S)
left = re.findall(r'\{\{[^}]+\}\}', prompt)
print('prompt chars', len(prompt), 'unfilled', set(left) or '-', 'roster', len(roster), flush=True)
body = {"model": "claude-sonnet-5-5", "max_tokens": 32000, "thinking": {"type": "adaptive"}, "output_config": {"effort": "medium"}, "stream": True,
        "messages": [{"role": "user", "content": prompt}]}
req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(body).encode(),
                             headers={'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
text = []; usage = {'input_tokens': 0, 'output_tokens': 0}; stop = None
try:
    with urllib.request.urlopen(req, timeout=1500) as resp:
        for line in resp:
            line = line.decode().strip()
            if not line.startswith('data:'): continue
            ev = json.loads(line[5:])
            t = ev.get('type')
            if t == 'message_start': usage['input_tokens'] = ev['message']['usage']['input_tokens']
            elif t == 'content_block_delta' and ev['delta'].get('type') == 'text_delta': text.append(ev['delta']['text'])
            elif t == 'message_delta':
                usage['output_tokens'] = ev['usage'].get('output_tokens', usage['output_tokens']); stop = ev['delta'].get('stop_reason', stop)
except urllib.error.HTTPError as e:
    sys.exit(f'HTTP {e.code} {e.read()[:400]}')
cost = usage['input_tokens']*PRICE_IN + usage['output_tokens']*PRICE_OUT
raw = ''.join(text)
os.makedirs(base+'phase4_out', exist_ok=True)
fn = f"{base}phase4_out/{pk['id'][:8]}_{module}_{sample}.json"
json.dump({'package': pk['id'], 'module': module, 'sample': sample, 'blueprint': bpfile, 'usage': usage, 'stop': stop, 'raw': raw}, open(fn, 'w'))
print(f"saved {fn} | in {usage['input_tokens']} out {usage['output_tokens']} stop {stop} | est ${cost:.3f}")
if cost > CAP: print('WARNING: over per-call cap')
