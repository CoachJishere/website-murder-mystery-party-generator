#!/usr/bin/env python3
"""ADR-0136 calibration, DETECTIVE style. Report-only. Reuses pilot.py's client/meter/schema; swaps in detective rules and adds one
package-documents review call (game overview, detective script, evidence cards, materials)."""
import json, os, sys, tempfile
import pilot as P

DOC_FIELDS = ["game_overview", "detective_script", "evidence_cards", "materials"]
P.BRANCH_FIELDS = P.BRANCH_FIELDS + DOC_FIELDS

DET_INSTRUCTIONS = """You are the final quality reviewer for a paid murder-mystery party package. A host prints each character's sheet and reads the detective script aloud with friends, so any slip a guest notices breaks the illusion. You review ONE item at a time (either one character's sheet, or the package's shared documents) and report only genuine defects.

HOW THE GAME WORKS (these are by design, never defects):
- Detective style: the solution is fixed. The SOLUTION line below names the murderer (and accomplice, if any); red herrings carry suspicious secrets that have nothing to do with the murder. Guests do not know the solution.
- Each character has ONE script per round (round2_script, round3_script, round4_script) and a final_statement, plus an accusation sheet. The murderer's and accomplice's scripts deny, deflect or mislead in rounds 2-4; their final_statement may confess or deny. That lying is by design, not a contradiction. The accusation sheet of a guilty character may contain private deflection tips.
- Rounds: round 2 is motives, round 3 is method, round 4 is opportunity. One evidence card is revealed per round.
- Questions ("To X") and rumors legitimately mention other characters' public motives and relationships.
- Do not judge writing style, tone or length. Do not report section headers, missing headers, pointform, markdown, or stray quote or tag characters (separate tools handle those).

WHAT TO REPORT (category):
- single_generation_slip: a garbled or ungrammatical sentence, a wrong or doubled word, a typo, a sentence that contradicts itself inside one field, stray text that does not belong, a time reference that is wrong for the game (the whole game is one night).
- wrong_fact: a statement that contradicts master_context or the roster dossier: another character's job or relationship, a location, an amount, a date, who did what to whom, the victim's name, or the speaker's own role. For the shared documents also: evidence described differently from master_context (what it is, who owns it, where it was found).
- cross_field_contradiction: two fields of THIS character disagree on a concrete fact (years of service, who did what, an amount), not the murderer's deliberate lies.
- pronoun_drift: the victim is referred to with a pronoun or gendered noun that breaks the package convention (below).
- secret_leak: an INNOCENT character's text, or any shared document read before the reveal, shows or hints at the solution (who the murderer is, the murderer's secret or hidden method) or at another character's hidden secret that this speaker could not know. In round 2 a script must not rely on round 3 or 4 evidence.
- language_slip: English words or another script inside prose written in another language, or formal/informal address (tu/vous, tú/usted, du/Sie) that changes inside one character's text.
- other: anything else a careful reader would call plainly wrong. Use sparingly.

VICTIM PRONOUN CONVENTION: use the victim's name. Use a pronoun only if master_context refers to the victim with one consistent gender. If master_context uses no pronoun, mixes genders, or never states a gender, the victim is gender-neutral (they/them/their) and any he/she/him/her/his/hers/man/woman/boy/girl/guy/lady for the victim is pronoun_drift. Other characters keep their own pronouns.

IGNORE THESE (handled by other tools or by design, never report them): ally or rival entries compared with the relationship matrix; section headers, quote marks, tags and stray characters.
READ EVERY FIELD WITH EQUAL CARE: description, background and relationships are short, but a slip there is as visible to a guest as a slip in a script. Check them sentence by sentence.

RULES:
1. Quote exactly: exact_quote must be copied character-for-character from the field and be the smallest span that shows the defect (usually a few words to one sentence, at most 200 characters). It must appear in that field.
2. suggested_replacement is the corrected version of exact_quote only (same meaning, minimal edit, same language). Leave it empty if the fix needs a judgment call.
3. Report each distinct defect once; list repeated wrong pronouns separately.
4. Precision matters more than coverage: report only what you are confident is wrong. Never list a finding whose explanation would conclude the text is acceptable, plausible, minor, weak, in character or by design: omit it instead. Report nothing when the item is clean (empty findings list). Report only medium or high severity (medium = a careful reader would notice and a host would want it fixed; high = a guest would stop and ask).
5. field must be the exact field name shown in brackets before the text.
6. Write explanations in English, at most 30 words.
"""
P.INSTRUCTIONS = DET_INSTRUCTIONS
P.V3_EXTRA = ""

def build_prefix_det(pkg, chars):
    chars = [c for c in chars if c["character_name"] != "PACKAGE DOCUMENTS"]
    mc = pkg["master_context"]; mc = mc if isinstance(mc, str) else json.dumps(mc, ensure_ascii=False)
    dec = json.JSONDecoder(); i = 0; objs = []
    while i < len(mc):
        while i < len(mc) and mc[i].isspace(): i += 1
        if i >= len(mc): break
        o, i = dec.raw_decode(mc, i); objs.append(o)
    for o in objs: o.pop("accomplicePairings", None)
    mc = "\n".join(json.dumps(o, ensure_ascii=False, indent=1) for o in objs)
    victim = (objs[0].get("victimProfile") or {}).get("name", "(see master_context)")
    by_role = lambda r: [c["character_name"] for c in chars if c.get("character_role") == r]
    sol = f"SOLUTION (hidden from guests): murderer = {', '.join(by_role('murderer')) or '?'}; accomplice = {', '.join(by_role('accomplice')) or 'none'}; red herrings = {', '.join(by_role('redHerring')) or 'none'}."
    roster = [f"### {c['character_name']}\nrole: {c.get('character_role')}\ndescription: {(c.get('description') or '').strip()}\nsecret: {(c.get('secret') or '').strip()}" for c in chars]
    ctx = (f"PACKAGE: {pkg.get('title')}\nVICTIM: {victim}\nGAME STYLE: detective style\n{sol}\n\n=== master_context (canonical facts) ===\n{mc}\n\n=== ROSTER DOSSIER ===\n" + "\n\n".join(roster))
    return [{"type": "text", "text": P.INSTRUCTIONS}, {"type": "text", "text": ctx, "cache_control": {"type": "ephemeral"}}]
P.build_prefix = build_prefix_det

def character_block_det(c):
    if c["character_name"] == "PACKAGE DOCUMENTS":
        parts = ["ITEM UNDER REVIEW: the package's shared documents (read aloud or shown to everyone)\n"]
    else:
        parts = [f"CHARACTER UNDER REVIEW: {c['character_name']} (role: {c.get('character_role')})\n"]
    for f in P.BRANCH_FIELDS:
        v = c.get(f)
        if f == "evidence_cards" and v and not isinstance(v, str): v = json.dumps(v, ensure_ascii=False)
        if isinstance(v, str) and v.strip(): parts.append(f"[{f}]\n{v.strip()}\n")
    return "\n".join(parts)
P.character_block = character_block_det

if __name__ == "__main__":
    path, label, out = sys.argv[1:4]
    d = json.load(open(path)); pkg = d["pkg"]
    doc = {"character_name": "PACKAGE DOCUMENTS", "character_role": None}
    for f in DOC_FIELDS: doc[f] = pkg.get(f)
    d["chars"] = d["chars"] + [doc]
    tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False); json.dump(d, tmp); tmp.close()
    P.run(tmp.name, label, out)
