#!/usr/bin/env python3
"""ADR-0156 Phase 4 Tier 2 checks (free). Reports separately: (1) does the sheet carry the steward-at-the-sideboard clue, (2) does any sheet leak a secret or the act.
Reads temp-files/charctx/phase4_out/tier2/*.json (and phase2_out for the Phase 2 baseline of the same characters)."""
import json, re, glob, os
base = 'temp-files/charctx/'
chars = json.load(open(base+'characters.json')); SIL = '178de25c-d7b8-4e02-9210-4e63298614e9'
cs = [c for c in chars if c['package_id'] == SIL]
run = json.load(open(base+'phase4_out/178de25c_3000_i1.json'))
p2 = json.loads(re.search(r'\{[\s\S]*\}', re.sub(r'^```(?:json)?', '', run['raw'].strip())).group(0))
kmp = p2['timelineFramework']['keyMomentPositions']
def txt(v): return v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
def words(s): return re.sub(r'[^a-z0-9 ]+', ' ', s.lower()).split()
def runs(s, n=6):
    w = words(s); return {' '.join(w[i:i+n]) for i in range(len(w)-n+1)}
# hidden material: culprits' and every other character's secret columns, the true-position tails (text after the observer sentence), Harry's identity
hidden = {}
for c in cs:
    for k in ('secret', 'secrets'):
        if c.get(k): hidden.setdefault(c['character_name'], []).append(txt(c[k]))
tails = []
for e in kmp:
    t, o = e['truePosition'], e.get('whatAnObserverSees') or ''
    if o and t.startswith(o[:30]): tails.append((e['character'], t[len(o):].strip()))
    elif not o: tails.append((e['character'], t))
ACT = re.compile(r'\b(dos(e|ed|ing)|poison(ed|ing)?|measured dose|vial|spiked|laced|tamper|pantry|crew corridor|infirmary)\b', re.I)
JOURNO = re.compile(r'\b(journalist|reporter|notebook|press|story for)\b', re.I)
CLUE = re.compile(r'(Simone|steward)', re.I)
CLUE2 = re.compile(r'(tray|sideboard|brandy|bar end|behind Reginald|Reginald.s chair|hand(s|ed|ing)? (him|Reginald))', re.I)
def sheet_text(d):
    return ' '.join(txt(d.get(k, '')) for k in ('raw1', 'raw2', 'raw3'))
def sentences(t): return re.split(r'(?<=[.!?])\s+', t)
for fn in sorted(glob.glob(base+'phase4_out/tier2/*.json')):
    name = os.path.basename(fn)[:-5].replace('_', ' ')
    d = json.load(open(fn)); t = sheet_text(d)
    print('=' * 100); print(name, '| sheet chars', len(t))
    me = next(c for c in cs if c['character_name'].replace("'", '').replace('.', '').split()[0] in name)
    print(' CLUE sentences (steward/Simone with tray/sideboard/hand):')
    hits = [s.strip() for s in sentences(t) if CLUE.search(s) and CLUE2.search(s)]
    for s in hits[:6]: print('   -', s[:260])
    if not hits: print('   (none)')
    print(' ACT/ALIBI words anywhere in the sheet:', sorted({m.group(0).lower() for m in ACT.finditer(t)}) or 'none')
    for m in ACT.finditer(t):
        a = max(0, m.start()-90); print('   ctx>', t[a:m.end()+90].replace('\n', ' '))
    print(' journalist-class words (Harry secret):', sorted({m.group(0).lower() for m in JOURNO.finditer(t)}) or 'none')
    for m in JOURNO.finditer(t):
        a = max(0, m.start()-90); print('   ctx>', t[a:m.end()+90].replace('\n', ' '))
    have = runs(t)
    for other, texts in hidden.items():
        if other == me['character_name']: continue
        for h in texts:
            if runs(h) & have: print(f'   6-WORD RUN of {other} secret appears in this sheet:', sorted(runs(h) & have)[:2])
    for who, tail in tails:
        if tail and runs(tail) & have: print(f'   6-WORD RUN of the true-position tail of {who} appears:', sorted(runs(tail) & have)[:2])
