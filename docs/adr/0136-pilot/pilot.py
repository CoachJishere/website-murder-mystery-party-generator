#!/usr/bin/env python3
"""ADR-0136 calibration pilot: per-character LLM quality review, report-only. Never writes to the database."""
import json, os, sys, time, threading
from concurrent.futures import ThreadPoolExecutor
import anthropic

MODEL = "claude-sonnet-5-5"
PRICE = {"in": 2.00, "cw": 2.50, "cr": 0.20, "out": 10.00}   # USD per million tokens (Sonnet 5.5, from the API skill's table)
HARD_CAP_USD = float(os.environ.get("PILOT_CAP", "5.00"))

BRANCH_FIELDS = ["description","background","relationships","secret","introduction","rumors","round2_questions","round2_innocent","round2_guilty","round2_accomplice",
 "round3_questions","round3_innocent","round3_guilty","round3_accomplice","round4_questions","round4_innocent","round4_guilty","round4_accomplice",
 "final_innocent","final_guilty","final_accomplice","accusations","reveal_confession_guilty","reveal_confession_accomplice",
 "round2_script","round3_script","round4_script","final_statement"]

CATEGORIES = ["single_generation_slip","wrong_fact","cross_field_contradiction","pronoun_drift","secret_leak","language_slip","other"]
SCHEMA = {"type":"object","additionalProperties":False,"required":["findings"],"properties":{"findings":{"type":"array","items":{
  "type":"object","additionalProperties":False,
  "required":["field","exact_quote","category","severity","explanation","suggested_replacement"],
  "properties":{
    "field":{"type":"string"},
    "exact_quote":{"type":"string"},
    "category":{"type":"string","enum":CATEGORIES},
    "severity":{"type":"string","enum":["high","medium","low"]},
    "explanation":{"type":"string"},
    "suggested_replacement":{"type":"string"}}}}}}

INSTRUCTIONS = """You are the final quality reviewer for a paid murder-mystery party package. A host prints each character's sheet and reads it aloud with friends, so any slip a guest notices breaks the illusion. You review ONE character at a time and report only genuine defects.

HOW THE GAME WORKS (these are by design, never defects):
- Slip-style game: the murderer and accomplice are drawn at the table. Every character therefore has three versions of rounds 2-4 and of the final statement: innocent, guilty and accomplice. The versions legitimately differ. The guilty and accomplice versions deny or deflect in rounds 2-4 and in the final statement and only confess in the reveal. A guilty or accomplice character lying in rounds 2-4 is not a contradiction.
- Accomplice confessions may name a specific murderer. Do not report that.
- A name written like "Osric/Osryth" is the deliberate dual-gender naming convention. Do not report it, nor matching gendered words around it.
- Characters repeat the same motive and background across versions, in their own words.
- Rumors and questions legitimately mention other characters' public motives and secrets. Only report a secret leak when an INNOCENT-branch statement shows knowledge of the murderer's or another character's hidden secret that this speaker could not know.
- Do not judge writing style, tone, or length. Do not report section headers, missing headers, pointform, markdown, or stray quote or tag characters (separate tools handle those).

WHAT TO REPORT (category):
- single_generation_slip: a garbled or ungrammatical sentence, a wrong or doubled word, a typo, a sentence that contradicts itself inside one field, stray text that does not belong, a time reference that is wrong for the game (the whole game is one night, so "last night" for tonight is wrong).
- wrong_fact: a statement that contradicts master_context or the roster dossier: another character's job, relationship, location, amount, date, who did what to whom, or the speaker's own role (for example calling the coat-check attendant a bartender, or placing the owner behind the bar).
- cross_field_contradiction: two fields of THIS character disagree on a concrete fact (years of service, who did what, an amount), not a difference between innocent/guilty/accomplice stories.
- pronoun_drift: the victim is referred to with a pronoun or gendered noun that breaks the package convention (below).
- secret_leak: see above.
- language_slip: English words or another script inside prose written in another language, or formal/informal address (tu/vous, tú/usted, du/Sie, vosotros/ustedes) that changes inside one character's text.
- other: anything else a careful reader would call plainly wrong. Use sparingly.

VICTIM PRONOUN CONVENTION: use the victim's name. Use a pronoun only if master_context refers to the victim with one consistent gender. If master_context uses no pronoun, mixes genders, or never states a gender, the victim is gender-neutral (they/them/their) and any he/she/him/her/his/hers/man/woman/boy/girl/guy/lady for the victim is pronoun_drift. Other characters keep their own pronouns.

RULES:
1. Quote exactly: exact_quote must be copied character-for-character from the field and be the smallest span that shows the defect (usually a few words to one sentence, at most 200 characters). It must appear in that field.
2. suggested_replacement is the corrected version of exact_quote only (same meaning, minimal edit, same language). Leave it empty if the fix needs a judgment call.
3. Report each distinct defect once. If the same wrong pronoun appears in several places, list each place separately.
4. Precision matters more than coverage: report only what you are confident is wrong. If unsure, leave it out. Report nothing when the character is clean (empty findings list).
4b. Never list a finding whose explanation would conclude that the text is acceptable, plausible, minor, weak, a matter of taste, in character, or by design: if you reach that conclusion, omit the finding instead. An idiom such as "it's just a Tuesday" is not a time claim. A guilty or accomplice character who lies or denies in rounds 2-4 is by design.
4c. Severity: high = a guest would stop and ask what it means; medium = a careful reader would notice and a host would want it fixed; low = barely noticeable. Do not report low items unless you are certain they are wrong.
5. field must be the exact field name shown in brackets before the text.
6. Write explanations in English, at most 30 words.
"""


V3_EXTRA = """
IGNORE THESE (handled by other tools or by design, never report them): (a) which character a confession names as the murderer or accomplice; (b) any ally or rival listed in a relationships field compared with the relationship matrix; (c) section headers, quote marks, tags and other stray characters.
READ EVERY FIELD WITH EQUAL CARE: the description, background and relationships fields are short, but a slip there is as visible to a guest as a slip in a script. Check each of them sentence by sentence for garbled wording, wrong facts and stray paragraphs.
Report only medium or high severity findings.
"""

def parse_first_json(s):
    dec = json.JSONDecoder(); i = 0
    while i < len(s) and s[i].isspace(): i += 1
    o, _ = dec.raw_decode(s, i); return o

def build_prefix(pkg, chars):
    mc = pkg["master_context"]; mc = mc if isinstance(mc, str) else json.dumps(mc, ensure_ascii=False)
    if os.environ.get("PILOT_V") == "3":
        dec = json.JSONDecoder(); i = 0; objs = []
        while i < len(mc):
            while i < len(mc) and mc[i].isspace(): i += 1
            if i >= len(mc): break
            o, i = dec.raw_decode(mc, i); objs.append(o)
        for o in objs: o.pop("accomplicePairings", None)
        mc = "\n".join(json.dumps(o, ensure_ascii=False, indent=1) for o in objs)
    try: victim = parse_first_json(mc)["victimProfile"]["name"]
    except Exception: victim = "(see master_context)"
    roster = []
    for c in chars:
        roster.append(f"### {c['character_name']}\nrole: {c.get('character_role')}\ndescription: {(c.get('description') or '').strip()}\nsecret: {(c.get('secret') or '').strip()}")
    ctx = (f"PACKAGE: {pkg.get('title')}\nVICTIM: {victim}\nGAME STYLE: slip style (murderer and accomplice drawn at the table)\n\n"
           f"=== master_context (canonical facts for this package) ===\n{mc}\n\n=== ROSTER DOSSIER (every character: description and secret) ===\n" + "\n\n".join(roster))
    return [{"type":"text","text":INSTRUCTIONS + (V3_EXTRA if os.environ.get("PILOT_V") == "3" else "")},
            {"type":"text","text":ctx,"cache_control":{"type":"ephemeral"}}]

def character_block(c):
    parts = [f"CHARACTER UNDER REVIEW: {c['character_name']}\n"]
    for f in BRANCH_FIELDS:
        v = c.get(f)
        if isinstance(v, str) and v.strip(): parts.append(f"[{f}]\n{v.strip()}\n")
    return "\n".join(parts)

class Meter:
    def __init__(self): self.lock = threading.Lock(); self.cost = 0.0; self.tok = dict(i=0, cw=0, cr=0, o=0)
    def add(self, u):
        i = u.input_tokens or 0; cw = getattr(u, "cache_creation_input_tokens", 0) or 0; cr = getattr(u, "cache_read_input_tokens", 0) or 0; o = u.output_tokens or 0
        c = (i*PRICE["in"] + cw*PRICE["cw"] + cr*PRICE["cr"] + o*PRICE["out"]) / 1e6
        with self.lock:
            self.cost += c; self.tok["i"] += i; self.tok["cw"] += cw; self.tok["cr"] += cr; self.tok["o"] += o
        return c
METER = Meter()

def review_one(client, prefix, c, retries=1):
    if METER.cost >= HARD_CAP_USD: return {"character": c["character_name"], "skipped": "cost cap"}
    t0 = time.time()
    for attempt in range(retries + 1):
        try:
            r = client.messages.create(model=MODEL, max_tokens=12000, system=prefix,
                output_config={"effort": os.environ.get("PILOT_EFFORT","medium"), "format": {"type": "json_schema", "schema": SCHEMA}},
                messages=[{"role": "user", "content": character_block(c)}])
            cost = METER.add(r.usage)
            txt = next((b.text for b in r.content if b.type == "text"), "")
            out = {"character": c["character_name"], "stop_reason": r.stop_reason, "cost": round(cost, 4), "secs": round(time.time()-t0, 1),
                   "usage": {"in": r.usage.input_tokens, "cw": getattr(r.usage, "cache_creation_input_tokens", 0), "cr": getattr(r.usage, "cache_read_input_tokens", 0), "out": r.usage.output_tokens}}
            if r.stop_reason == "refusal": out["refusal"] = str(getattr(r, "stop_details", None)); out["findings"] = []; return out
            try: out["findings"] = json.loads(txt)["findings"]
            except Exception as e: out["parse_error"] = str(e); out["raw"] = txt[:500]; out["findings"] = []
            return out
        except anthropic.APIStatusError as e:
            if attempt == retries: return {"character": c["character_name"], "error": f"{e.status_code} {e.message}"[:300]}
            time.sleep(3)

def run(path, label, out_path, only=None):
    d = json.load(open(path)); pkg = d["pkg"]; chars = d["chars"]
    client = anthropic.Anthropic(max_retries=2)
    prefix = build_prefix(pkg, chars)
    targets = [c for c in chars if not only or c["character_name"] in only]
    results = []
    first = review_one(client, prefix, targets[0]); results.append(first)          # first call writes the cache
    print(f"[{label}] {first['character']}: {len(first.get('findings', []))} findings, ${first.get('cost')}, usage {first.get('usage')}", flush=True)
    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(lambda c: review_one(client, prefix, c), targets[1:]):
            results.append(res); print(f"[{label}] {res['character']}: {len(res.get('findings', []))} findings, ${res.get('cost')}", flush=True)
    json.dump({"label": label, "model": MODEL, "results": results, "total_cost_usd": round(METER.cost, 4), "tokens": METER.tok}, open(out_path, "w"), indent=1, ensure_ascii=False)
    print(f"[{label}] done: cumulative ${METER.cost:.3f}, tokens {METER.tok}")

if __name__ == "__main__":
    path, label, out = sys.argv[1:4]
    only = set(sys.argv[4].split("|")) if len(sys.argv) > 4 else None
    run(path, label, out, only)
