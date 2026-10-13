#!/usr/bin/env python3
"""ADR-0156 Phase 2 replay (approved by Jonathan 2026-10-13, about 2 USD, omit variant only).
Runs the Child63 detective prompts (modules 401, 405, 409) for the 10 innocents of Silver Nightingale with the REDACTED context
(phase2_ctx.json, visibleMurderer=omit). Nothing is written to the database. Hard cap: abort when the estimated cost passes CAP."""
import os, json, re, sys, time, urllib.request, urllib.error
CAP = float(os.environ.get('P2_CAP', '3.0'))
PRICE_IN, PRICE_OUT = 3.0/1e6, 15.0/1e6   # estimate for a Sonnet-class model; actual tokens are logged
base = 'temp-files/charctx/'
K = os.environ['ANTHROPIC_API_KEY']; SB = os.environ['SUPABASE_SERVICE_ROLE_KEY']
URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/'
PID = '178de25c-d7b8-4e02-9210-4e63298614e9'
def rest(q):
    r = urllib.request.Request(URL+q, headers={'apikey': SB, 'Authorization': 'Bearer '+SB})
    return json.load(urllib.request.urlopen(r, timeout=90))
pkg = rest(f'mystery_packages?select=user_conversation,extracted_characters&id=eq.{PID}')[0]
conv = pkg['user_conversation']; roster = pkg['extracted_characters']
if isinstance(roster, str):
    try: roster = json.loads(roster)
    except Exception: roster = json.loads('[' + roster + ']')
if isinstance(roster, str): roster = json.loads('[' + roster + ']')
if isinstance(roster, dict): roster = roster.get('characters') or list(roster.values())
desc = {}
for c in roster:
    n = c.get('name') or c.get('character_name'); desc[n] = c.get('description') or c.get('role') or ''
bp = json.load(open('temp-files/MM Live - Child (Unified)63-QuoteTalkRemoved.blueprint.json'))
def walk(flow):
    for m in flow:
        yield m
        for r in m.get('routes', []) or []: yield from walk(r.get('flow', []))
mods = {m['id']: m for m in walk(bp['flow'])}
T = {i: mods[i]['mapper']['messages'][0]['content'][0]['text'] for i in (401, 405, 409)}
ctxs = json.load(open(base+'phase2_ctx.json'))
names = [c['name'] for c in ctxs]
def blurb(name):
    first = name.split()[0].strip("'")
    for line in conv.split('\n'):
        if '**' in line and first in line and ('played by' in line or '–' in line): return line.strip()
    return ''
total = {'in': 0, 'out': 0}
def call(tid, prompt):
    body = {"model": "claude-sonnet-5-5", "max_tokens": 12000, "thinking": {"type": "adaptive"}, "output_config": {"effort": "medium"}, "messages": [{"role": "user", "content": prompt}]}
    for attempt in range(3):
        try:
            req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(body).encode(), headers={'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
            r = json.load(urllib.request.urlopen(req, timeout=600)); break
        except urllib.error.HTTPError as e:
            print('HTTP', e.code, e.read()[:300]); time.sleep(5)
    else: raise SystemExit('api failed')
    total['in'] += r['usage']['input_tokens']; total['out'] += r['usage']['output_tokens']
    cost = total['in']*PRICE_IN + total['out']*PRICE_OUT
    text = ''.join(b.get('text', '') for b in r['content'] if b['type'] == 'text')
    print(f'  call {tid}: in {r["usage"]["input_tokens"]} out {r["usage"]["output_tokens"]} stop {r["stop_reason"]} | running est ${cost:.2f}', flush=True)
    if cost > CAP: raise SystemExit(f'CAP ${CAP} exceeded, stopping')
    return text, r
def parse(t):
    t = t.strip()
    t = re.sub(r'^```(?:json)?\s*|\s*```$', '', t)
    for cand in (t, (re.search(r'\{.*\}', t, re.S) or [None])[0] if re.search(r'\{.*\}', t, re.S) else None):
        if not cand: continue
        for c2 in (cand, re.sub(r',\s*([}\]])', r'\1', cand)):
            try: return json.loads(c2)
            except Exception: pass
    return None
def fill(tpl, name, ctx, idx, c1=None):
    d = {'142.master_context': ctx, '63.characterName': name, '63.characterDescription': desc.get(name, ''), '63.characterIndex': str(idx),
         '63.hasAccomplice': 'true', '63.mysteryType': 'murder', '63.characterChatExcerpts': blurb(name), '63.conversationContent': conv, '63.language': 'English'}
    if c1:
        for k in ('background', 'introduction', 'secret'): d[f'402.data.{k}'] = c1.get(k, '') if isinstance(c1.get(k, ''), str) else json.dumps(c1.get(k))
    def rep(m):
        k = m.group(1).strip()
        if k.startswith('if(63.language = "English"'): return ''   # Make expression: empty for English
        return d.get(k, m.group(0))
    out = re.sub(r'\{\{\s*([^}]+?)\s*\}\}', rep, tpl)
    left = re.findall(r'\{\{[^}]+\}\}', out)
    if left: print('  UNFILLED', set(left))
    return out
only = sys.argv[1:] 
os.makedirs(base+'phase2_out', exist_ok=True)
for idx, c in enumerate(ctxs, 1):
    if c['role'] in ('murderer', 'accomplice'): continue
    if only and c['name'] not in only: continue
    fn = base+'phase2_out/'+re.sub(r'\W+', '_', c['name'])+'.json'
    if os.path.exists(fn): print('skip (done)', c['name']); continue
    print('==', c['name'], c['role'], 'ctx chars', len(c['context']), flush=True)
    res = {}
    t1, _ = call(401, fill(T[401], c['name'], c['context'], idx)); c1 = parse(t1); res['call1'] = c1 or t1
    t2, _ = call(405, fill(T[405], c['name'], c['context'], idx)); res['call2'] = parse(t2) or t2; res['raw2'] = t2
    res['raw1'] = t1
    t3, _ = call(409, fill(T[409], c['name'], c['context'], idx, c1 if isinstance(c1, dict) else {})); res['call3'] = parse(t3) or t3; res['raw3'] = t3
    json.dump(res, open(fn, 'w'))
print(f"TOTAL tokens in {total['in']} out {total['out']} est ${total['in']*PRICE_IN+total['out']*PRICE_OUT:.2f}")
