#!/usr/bin/env python3
"""Build Child64 from Child63 (ADR-0156 Phase 3, 2026-10-13).

The detective route (router 200, route 0) gives each character the per-character redacted design and chat made by the `child-context` edge function
instead of the whole design. Changes, all asserted by count, nothing else touched:
 1. NEW module 414 (http:ActionSendData, "Child Context") inserted right after 400 in route 0, so the route filter on 400 (detective style) still gates it
    and the slip route never calls it. It POSTs one text/plain body (packageId, characterName, characterChatExcerpts, conversationContent joined by
    the separator in _shared/childContext.ts) with the shared secret in header x-child-context-key. handleErrors is false (as in 402/413), so a non-2xx
    answer does not raise: it just has no `redacted:true`.
 2. Modules 401, 405, 409 (detective Calls 1 to 3), three references each, switched to
        {{if(414.data.redacted; 414.data.<field>; <the old reference>)}}
    so a switched-off, culprit, fallback, failed or timed-out call yields EXACTLY today's input (the old reference), by construction.
        142.master_context -> 414.data.context      63.characterChatExcerpts -> 414.data.excerpt      63.conversationContent -> 414.data.chat
 3. One clause appended to the existing POSITIONS AT THE KEY MOMENT rule in 401/405/409 (ADR-0156 Phase 4 design 4.2): an entry for another character
    is only what this character could see of them.
 Name changed to Child64. The long INNOCENT IGNORANCE rules are deliberately unchanged for this release so any change in findings is attributable.

The shared secret: set env CHILD_CONTEXT_KEY when running this script (same value as the Supabase secret CHILD_CONTEXT_KEY). Without it the header holds the
placeholder below and the script says so; the function then answers 401 and Make keeps today's inputs, so a missing key degrades to today, never to a blank sheet.
The output is gitignored (temp-files/**/*.json); never commit a file that holds the real key.
Run from temp-files/. Do NOT import into Make until Jonathan says so.
"""
import copy
import json
import os
import sys

SRC = 'MM Live - Child (Unified)63-QuoteTalkRemoved.blueprint.json'
DST = 'MM Live - Child (Unified)64-RedactedContext.blueprint.json'
NAME = 'MM Live - Child (Unified)64-RedactedContext'
PLACEHOLDER = 'PASTE_CHILD_CONTEXT_KEY_HERE'
KEY = os.environ.get('CHILD_CONTEXT_KEY') or PLACEHOLDER
NEW_ID = 414
SEP = '\n<<<CHILD-CONTEXT-PART-7c2e91>>>\n'  # must equal BODY_SEPARATOR in supabase/functions/_shared/childContext.ts
URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/child-context'

CLAUSE_ANCHOR = 'and otherwise say nobody can vouch.'
CLAUSE = (' An entry for another character is only what this character could see of them at that moment: use it as a sighting, and never add why they '
          'were there, what they were doing out of sight, or what happened later.')

REFS = [
    ('{{142.master_context}}', '{{if(414.data.redacted; 414.data.context; 142.master_context)}}'),
    ('{{63.characterChatExcerpts}}', '{{if(414.data.redacted; 414.data.excerpt; 63.characterChatExcerpts)}}'),
    ('{{63.conversationContent}}', '{{if(414.data.redacted; 414.data.chat; 63.conversationContent)}}'),
]
DETECTIVE_CALLS = (401, 405, 409)
SLIP_CALLS = (501, 505, 509, 513, 517)

raw = open(SRC, encoding='utf-8').read()
d = json.loads(raw)
assert json.dumps(d, indent=2, ensure_ascii=False) == raw, 'source does not round-trip byte for byte'
orig = copy.deepcopy(d)


def walk(flow):
    for m in flow:
        yield m
        for r in m.get('routes', []) or []:
            yield from walk(r.get('flow', []))


mods = {m['id']: m for m in walk(d['flow'])}
assert NEW_ID not in mods, 'module id 414 is taken'
router = mods[200]
route0 = router['routes'][0]['flow']
assert [m['id'] for m in route0][:3] == [400, 401, 9001], [m['id'] for m in route0][:3]
assert mods[400]['filter']['name'] == 'Detective Style'

# 1. the new module, modelled on 413 (an existing http:ActionSendData that calls one of our edge functions with the anon key)
m413 = mods[413]
anon = [h['value'] for h in m413['mapper']['headers'] if h['name'] == 'Authorization'][0]
assert anon.startswith('Bearer eyJ')
new = copy.deepcopy(m413)
new['id'] = NEW_ID
new['mapper']['url'] = URL
new['mapper']['data'] = SEP.join(['{{63.packageId}}', '{{63.characterName}}', '{{63.characterChatExcerpts}}', '{{63.conversationContent}}'])
new['mapper']['headers'] = [
    {'name': 'Content-Type', 'value': 'text/plain'},
    {'name': 'Authorization', 'value': anon},
    {'name': 'apikey', 'value': anon.split(' ', 1)[1]},
    {'name': 'x-child-context-key', 'value': KEY},
]
new['mapper']['timeout'] = '60'
new['mapper']['contentType'] = 'text/plain'
assert new['mapper']['bodyType'] == 'raw' and new['mapper']['parseResponse'] is True and new['parameters']['handleErrors'] is False
new['metadata']['designer'] = {'x': 1050, 'y': 0, 'name': 'Child Context (redacted design and chat)'}
new['metadata']['restore'] = {'expect': {'method': {'mode': 'chose', 'label': 'POST'}, 'bodyType': {'label': 'Raw'}, 'contentType': {'label': 'Text (text/plain)'}}}
route0.insert(1, new)

# 2 and 3. the prompt references and the clause, in the three detective calls only
for mid in DETECTIVE_CALLS:
    msgs = mods[mid]['mapper']['messages']
    assert len(msgs) == 1 and len(msgs[0]['content']) == 1
    text = msgs[0]['content'][0]['text']
    for old, newref in REFS:
        assert text.count(old) == 1, (mid, old, text.count(old))
        text = text.replace(old, newref)
    assert text.count(CLAUSE_ANCHOR) == 1, (mid, 'clause anchor', text.count(CLAUSE_ANCHOR))
    i = text.index('POSITIONS AT THE KEY MOMENT')
    assert i < text.index(CLAUSE_ANCHOR), 'anchor is not inside the POSITIONS rule'
    text = text.replace(CLAUSE_ANCHOR, CLAUSE_ANCHOR + CLAUSE)
    msgs[0]['content'][0]['text'] = text

d['name'] = NAME
out = json.dumps(d, indent=2, ensure_ascii=False)
json.loads(out)

# ---- proof that only the intended things changed -------------------------------------------------------------------------------------
# the module list of route 0 shifted by one after the insert, so compare module by module instead of by position
omods = {m['id']: m for m in walk(orig['flow'])}
nmods = {m['id']: m for m in walk(json.loads(out)['flow'])}
assert set(nmods) - set(omods) == {NEW_ID} and set(omods) <= set(nmods)
differing = sorted(i for i in omods if json.dumps({k: v for k, v in omods[i].items() if k != 'routes'}, sort_keys=True) != json.dumps({k: v for k, v in nmods[i].items() if k != 'routes'}, sort_keys=True))
assert differing == sorted(DETECTIVE_CALLS), differing
for mid in SLIP_CALLS:
    assert json.dumps(omods[mid], sort_keys=True) == json.dumps(nmods[mid], sort_keys=True), f'slip module {mid} changed'
slip_old = json.dumps(orig['flow'][-1] if False else omods[200]['routes'][1], sort_keys=True)
slip_new = json.dumps(nmods[200]['routes'][1], sort_keys=True)
assert slip_old == slip_new, 'slip route changed'
assert [m['id'] for m in nmods[200]['routes'][0]['flow']][:3] == [400, NEW_ID, 401]
for k in set(orig) | set(json.loads(out)):
    if k not in ('flow', 'name'):
        assert orig.get(k) == json.loads(out).get(k), f'top-level {k} changed'
# no old-form reference survives in the detective calls; each new form is there once
for mid in DETECTIVE_CALLS:
    t = nmods[mid]['mapper']['messages'][0]['content'][0]['text']
    for old, newref in REFS:
        assert t.count(newref) == 1
        assert t.replace(newref, '').count(old) == 0, f'{mid} still has a bare {old}'
    assert t.count(CLAUSE) == 1
# every difference inside 401/405/409 is one of the three reference swaps or the clause
for mid in DETECTIVE_CALLS:
    t = nmods[mid]['mapper']['messages'][0]['content'][0]['text']
    back = t.replace(CLAUSE, '')
    for old, newref in REFS:
        back = back.replace(newref, old)
    assert back == omods[mid]['mapper']['messages'][0]['content'][0]['text'], f'{mid}: unexplained difference'
    other_old = {k: v for k, v in omods[mid]['mapper'].items() if k != 'messages'}
    other_new = {k: v for k, v in nmods[mid]['mapper'].items() if k != 'messages'}
    assert other_old == other_new

open(DST, 'w', encoding='utf-8').write(out)
print('written', DST, len(out), 'bytes')
print('changed modules:', differing, '+ new module', NEW_ID, '+ name')
if KEY == PLACEHOLDER:
    print('WARNING: CHILD_CONTEXT_KEY was not set; the header holds the placeholder. Rebuild with the real key before importing.', file=sys.stderr)
else:
    print('header x-child-context-key set from CHILD_CONTEXT_KEY (file is gitignored; do not commit it)')
