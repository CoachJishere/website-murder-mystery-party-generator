#!/usr/bin/env python3
"""Free (no API) language audit for delivered non-English packages (ADR-0135).

Usage: python3 docs/language-pack/lang_audit.py packages.json
packages.json = a JSON list of {"lang": "de|es|fr|it|pt|nl", "pkg": {title, ...}, "chars": [mystery_characters rows]}.
Export: for each package id fetch mystery_packages (id,title) + mystery_characters (select *) with the service role client and add the
language from profiles.language (it can differ from the prose language: check "stray-EN chars" first, a column of all characters means
the PROSE is English and the package is simply an English package for a non-English profile).

Reports per package: header conformity against docs/language-pack/header-labels.json (canonical wording), English labels leaking in,
characters that mix formal and informal address, and characters with stray English words in the prose. The register patterns are
HEURISTIC and were tightened after the 2026-10-03 baseline (the first pass flagged Italian articles "Le erbe" and the French participle
"tu" as formal/informal). Treat every register hit as a candidate and read the printed sentence before believing it.
"""
import json, re, sys, collections

D = json.load(open(sys.argv[1]))
L = json.load(open('docs/language-pack/header-labels.json'))['languages']
NAME = {'es': 'Spanish', 'de': 'German', 'fr': 'French', 'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch'}
FIELDS = ['description', 'background', 'relationships', 'secret', 'introduction', 'rumors', 'round2_questions', 'round3_questions', 'round4_questions',
          'round2_script', 'round3_script', 'round4_script', 'final_statement', 'accusations', 'round2_innocent', 'round2_guilty', 'round2_accomplice',
          'round3_innocent', 'round3_guilty', 'round3_accomplice', 'round4_innocent', 'round4_guilty', 'round4_accomplice', 'final_innocent',
          'final_guilty', 'final_accomplice', 'reveal_confession_guilty', 'reveal_confession_accomplice']
HDR = r'^(#{1,3} .+|\*\*[^*\n].*\*\*:?)$'
# (formal, informal) patterns; formal = addressing the listeners politely, informal = the register ADR-0135 fixes
REG = {
    'es': (r'\b(usted|ustedes)\b', r'\b(vosotros|vosotras|vuestr[oa]s?|tú|sois|tenéis|podéis|sabéis)\b'),
    'de': (r'(?<=[a-zäöüß,;:] )(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer)\b|\b(wissen|haben|können|kennen|verstehen|sehen) Sie\b', r'\b(du|dich|dir|dein[e]?[mnrs]?|euch|euer|eure[nrms]?)\b'),
    'fr': (r'\b(vous)\b', r'\b(tu|toi|ton|ta|tes)\b'),
    'it': (r'\b(Lei|Suo|Sua|Suoi|Sue)\b', r'\b(tu|ti|tuo|tua|tuoi|tue|voi|vostro|vostra)\b'),
    'pt': (r'\b(o senhor|a senhora|os senhores|as senhoras)\b', r'\b(tu|teu|tua|você|vocês)\b'),
}
EN = r'\b(the|and|with|that|you|your|until|more|last|which|would|could)\b'

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[#*:]', '', s)).strip().lower()

def canon(lang):
    t = L[NAME[lang]]; out, prefixes = set(), []
    for k, v in t.items():
        if '[Cast Name]' in v: prefixes.append(norm(v.split('[Cast Name]')[0]))
        out.add(norm(v))
    return out, prefixes, {norm(k) for k in t}

print(f"{'package':36s} {'lang':4s} {'chars':>5s} {'hdrs':>5s} {'canon%':>6s} {'EN-hdr':>6s} {'mixed-register':>15s} {'stray-EN chars':>14s}")
bad_all = collections.defaultdict(collections.Counter); examples = []
for d in D:
    lang = d['lang']
    if lang not in REG: continue
    cset, prefixes, eng = canon(lang); fm, im = REG[lang]
    hdr = ok = en = 0; mixed = []; stray = 0; bad = collections.Counter()
    for c in d['chars']:
        txt = ''
        for f in FIELDS:
            v = c.get(f)
            if not isinstance(v, str): continue
            for ln in v.split('\n'):
                s = ln.strip()
                if re.match(HDR, s):
                    n = norm(s)
                    if not n: continue
                    hdr += 1
                    if n in cset or any(n.startswith(p) for p in prefixes if p): ok += 1
                    else:
                        if n in eng: en += 1
                        bad[s] += 1
            txt += ' ' + re.sub(HDR, '', v, flags=re.M)
        fcount, icount = len(re.findall(fm, txt)), len(re.findall(im, txt))
        thresh = 2 if lang == 'fr' else 1   # French "tu" can be a participle; require two hits
        if fcount >= 1 and icount >= thresh:
            mixed.append(c['character_name'])
            if len(examples) < 12:
                m = re.search(fm, txt); examples.append((d['pkg']['title'][:30], c['character_name'], txt[max(0, m.start()-60):m.end()+60].replace('\n', ' ')))
        if len(re.findall(EN, txt, re.I)) >= 4: stray += 1
    pct = 100 * ok / hdr if hdr else 0
    print(f"{d['pkg']['title'][:36]:36s} {lang:4s} {len(d['chars']):5d} {hdr:5d} {pct:6.0f} {en:6d} {len(mixed):15d} {stray:14d}")
    for h, n in bad.most_common(3): bad_all[lang][h] += n
print()
for lang, c in bad_all.items(): print(lang, 'most common non-canonical headers:', c.most_common(4))
print('\nRegister candidates (read each one):')
for t, ch, s in examples: print(f'  {t} / {ch}: ...{s}...')
