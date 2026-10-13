#!/usr/bin/env python3
"""ADR-0156 Phase 4 rewrite probe (hard case). Gives the model Part 1 plus the STORED Silver Nightingale position map (whose culprit truePosition states the act:
"dosed the glass") and the Parent86 rule paragraph, and asks only for whatAnObserverSees per entry. Isolates the one skill the full Part 2 replay did not exercise.
usage: phase4_probe.py <sample> [blueprint]   env: ANTHROPIC_API_KEY. Nothing is written to the database."""
import os, json, re, sys, urllib.request, urllib.error
K = os.environ['ANTHROPIC_API_KEY']; PRICE_IN, PRICE_OUT = 3.0/1e6, 15.0/1e6
sample = sys.argv[1]; bpfile = sys.argv[2] if len(sys.argv) > 2 else 'temp-files/MM Live - Parent86 (Observer Field).blueprint.json'
base = 'temp-files/charctx/'
pk = next(p for p in json.load(open(base+'packages.json')) if p['id'].startswith('178de25c'))
dec = json.JSONDecoder(); objs = []; i = 0; mc = pk['master_context']
while i < len(mc):
    while i < len(mc) and mc[i].isspace(): i += 1
    if i >= len(mc): break
    o, j = dec.raw_decode(mc, i); objs.append(o); i = j
part1 = json.dumps(objs[0], ensure_ascii=False); kmp = {}
for o in objs: kmp = o.get('timelineFramework', {}).get('keyMomentPositions', kmp)
bp = json.load(open(bpfile))
def walk(flow):
    for m in flow:
        yield m
        for r in m.get('routes', []) or []: yield from walk(r.get('flow', []))
t = next(m for m in walk(bp['flow']) if m['id'] == 3000)['mapper']['messages'][0]['content'][0]['text']
rule = t[t.index('**WHAT AN OBSERVER SEES'):t.index('## 7. MOTIVE DISTRIBUTION')].strip()
entries = [{k: e[k] for k in ('character', 'truePosition', 'besideOrNear', 'canBeSeenBy')} for e in kmp]
prompt = ("You are writing part of a murder mystery design. Part 1 (already decided):\n" + part1 + "\n\nThe position map below is already written. Add the field whatAnObserverSees to every entry, following this rule exactly:\n\n" + rule +
          "\n\nEntries:\n" + json.dumps(entries, ensure_ascii=False, indent=1) + "\n\nOutput only a JSON array of {\"character\": ..., \"whatAnObserverSees\": ...}, one per entry, in the same order.")
body = {"model": "claude-sonnet-5-5", "max_tokens": 8000, "thinking": {"type": "adaptive"}, "output_config": {"effort": "medium"}, "messages": [{"role": "user", "content": prompt}]}
req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(body).encode(), headers={'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
try: r = json.load(urllib.request.urlopen(req, timeout=600))
except urllib.error.HTTPError as e: sys.exit(f'HTTP {e.code} {e.read()[:300]}')
text = ''.join(b.get('text', '') for b in r['content'] if b['type'] == 'text')
u = r['usage']; cost = u['input_tokens']*PRICE_IN + u['output_tokens']*PRICE_OUT
fn = f"{base}phase4_out/probe_{sample}.json"
json.dump({'entries': entries, 'usage': u, 'raw': text}, open(fn, 'w'))
print(f"saved {fn} in {u['input_tokens']} out {u['output_tokens']} est ${cost:.3f}")
