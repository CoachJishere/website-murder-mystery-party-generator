import pickle,re,csv,collections,os
from lib import EMPH
reg=pickle.load(open('reg.pkl','rb'))
vinfo=pickle.load(open('vinfo.pkl','rb'))
DIRECT=re.compile(r"\b(must|never|always|do not|don't|only|should|ensure|avoid|exactly|forbidden|verify|stop|strip|cannot|may not|at least|no more than|at most|use|write|keep|refer|leave|include|emit|select|define|extract|set)\b",re.I)
D='detector'; H='heal'; DH='detector+heal'; PART='partial'; ADV='advisory-detector'; REV='llm-reviewer-only'; NONE='none'
# (regex over rule text, applies_to_modules predicate, covered_by, strength)
COV=[
 (r'Always respond in the same language as the master_context',r'language_instruction','P:Themed Materials','list_packages_with_materials_language_mismatch (built 2026-10-13); repair is a free manual translation',D),
 (r'Always respond in the same language',r'language_instruction','P','none in pipeline for the prose language itself (LLM reviewer language_slip only); pointform_language_mismatch and materials_language_mismatch cover two fields',REV),
 (r'RELATIONSHIP SELF-EXCLUSION',r'content_coherence_rules','C','none (no detector checks a character listing themselves as ally or rival; meta_text_leak only catches the explanatory phrasing)',NONE),
 # (text regex, section regex, family, covered_by, strength)
 (r'STRAY QUOTATION|unmatched quotation|unpaired trailing quote|trailing apostrophe|`\'\'`|two apostrophes',r'content_coherence_rules|critical_json_rules','C','list_packages_with_dangling_quote_mark + strip_dangling_quote free heal (auto-remediate-packages/glitch-strip.ts); covers 5 fields only (introduction, final_statement, final_innocent, reveal_confession_guilty/accomplice)',DH),
 (r'EMIT EACH FIELD EXACTLY ONCE|Wait, this is wrong',r'no_chain_of_thought_in_output','C','list_packages_with_meta_text_leak (inside package_completion_blocking_defects) + stripStrayGlitches free heal + regenerate delegate',DH),
 (r'bracketed authoring directions|CRITICAL:',r'no_meta_text_in_output','C','list_packages_with_meta_text_leak (patterns \\[closing paragraph, \\[insert , \\[choose) + stripStrayGlitches free heal',DH),
 (r'matrix|cast dynamics|self-referential',r'empty_relationship_case','C','list_packages_with_meta_text_leak (relationship matrix / cast dynamics / no self-entry needed patterns)',D),
 (r'Emit ONLY final in-world content|reasoning or self-correction',r'output_hygiene','P','list_packages_with_meta_text_leak + stripStrayGlitches (self-correction and bracket parts only; the invented-specifics and one-night parts of the same paragraph are NOT covered)',PART),
 (r'GRAMMATICAL PERSON',r'content_coherence_rules','C','narration_person_mismatch inside package_completion_blocking_defects (third-person opening of a sibling branch when the baseline branch is first person; does not check a character naming themselves, ADR-0103 Add. 45)',PART),
 (r'QUESTIONS: Every question',r'content_coherence_rules','C','self_directed_question gate in package_completion_blocking_defects (checks asking oneself; does not check asking the victim or repeated targets)',PART),
 (r'relationshipMatrix',r'output_schema','C','package_relationship_matrix_contradiction / list_packages_with_relationship_matrix_contradiction',D),
 (r'CHARACTER IDENTITY',r'content_coherence_rules','C','list_packages_with_identity_conflicts (only the kinship-term claim, e.g. two characters saying "my brother")',PART),
 (r'VICTIM PRONOUNS',r'content_coherence_rules','C','LLM reviewer pronoun_drift (auto-applied en/es/fr/de/it/pt/nl); no deterministic detector',REV),
 (r'VICTIM CONSISTENCY|Victim.s full name \(extracted',r'critical_reminders|constraints_to_define|output_format|output_hygiene','P','list_packages_with_victim_mismatch + unresolved_victim_name + victim_as_character',D),
 (r'EXACTLY ONE accomplice',r'accomplice_handling','P','list_packages_with_accomplice_role_mismatch (two characters stored with role accomplice)',D),
 (r'INNOCENT IGNORANCE',r'content_coherence_rules','C','LLM reviewer secret_leak only (no deterministic detector for an innocent naming the culprit in detective style)',REV),
 (r'NAME RULE FOR THIS SECTION|NAMING RULE',r'output_instructions','P','list_packages_with_reveal_name_fusion (checks murderer first name fused with victim surname; does not check the victim named in the arrest sentence)',PART),
 (r'NO FIXED CULPRIT|guilty player',r'output_instructions','P:Script','list_packages_with_slip_reveal_names_cast_member (slip style reveal naming a cast member)',D),
 (r'NO FIXED CULPRIT',r'.','P','list_packages_with_slip_reveal_names_cast_member checks only the downstream detective_script, not master_context',PART),
 (r'LANGUAGE CHECK',r'output_instructions','P','list_packages_with_materials_language_mismatch (built 2026-10-13, ADR-0103 Add. 91); repair is a free manual translation',D),
 (r'LANGUAGE PACK',r'content_coherence_rules','C','section labels: label-conformity heal (ADR-0152) + missing_branch_header; register (tu/vous, du/Sie): no in-pipeline check, offline docs/language-pack/lang_audit.py and reviewer language_slip only',PART),
 (r'literal markdown section headers|translate these into',r'language_instruction','C','section labels only: label-conformity heal (review-package-quality/label-conformity.ts, ADR-0152) + missing_branch_header detector + prepend_branch_header heal; output language of the prose itself has no in-pipeline check except pointform_language_mismatch and materials_language_mismatch',PART),
 (r'POSITIONS AT THE KEY MOMENT',r'content_coherence_rules','C','none (LLM reviewer cross_field_contradiction only)',REV),
 (r'ONE-NIGHT TIME FRAME',r'content_coherence_rules','C','none (LLM reviewer wrong_fact only)',REV),
 (r'NO INVENTED SPECIFICS|AMOUNT CALIBRATION',r'.','CP','none (LLM reviewer wrong_fact / cross_field_contradiction only)',REV),
 (r'EVIDENCE BY ROUND',r'content_coherence_rules','C','none (LLM reviewer only)',REV),
 (r'SECRET vs. ESTABLISHED MOTIVE|BLACKMAIL / SECRET LOGIC|SECRET STAKES',r'content_coherence_rules','C','none (LLM reviewer cross_field_contradiction only)',REV),
 (r'PROVENANCE RULE|culprit',r'output_instructions','P:Evidence Cards','list_packages_with_evidence_culprit_spoiler (advisory only: surname match, high false-positive rate by design, never wired to the gate)',ADV),
 (r'SINGLE QUOTES|unquoted prose|unmatched|lone trailing|trailing apostrophe',r'critical_json_rules','C','list_packages_with_dangling_quote_mark + strip_dangling_quote free heal; covers 5 fields only',DH),
 (r'valid JSON|unescaped|Apostrophes inside|Verify the closing',r'critical_json_rules','C','parse-claude-json edge function repairs; missing_core_content / missing_round_content / empty_character_content gates catch the failure, not the cause',PART),
]
COVc=[(re.compile(p,re.I),re.compile(sec),fam,c,st) for p,sec,fam,c,st in COV]
def cover(r,mod):
    t=r['text']
    # only rule-bearing rows get a mapping
    for rx,secrx,fam,c,s in COVc:
        fam_,_,modname=fam.partition(':')
        if fam_!='CP' and mod['fam']!=fam_: continue
        if modname and modname not in mod['name']: continue
        if rx.search(t) and secrx.search(r['section']): return c,s
    return 'none',NONE
# recurrence evidence (curated; matched on text)
REC=[
 (r'NAME RULE FOR THIS SECTION|CLOSING PARAGRAPH|NAMING RULE|separate sentences','yes','Parent73 failed (ADR-0103 Add. 81), Parent77 rewrote it (Add. 86); CLAUDE.md post-import watch: Parent73/77 failed on last detective purchases; Add. 86 says a 4th failure moves the control to a post-generation check'),
 (r'INNOCENT IGNORANCE|SOLUTION NOTES|never name or accuse the true murderer','yes','Child49 -> Child50 -> Child51 -> Child58 reworded the same rule; Child51 failed on its first purchase (ADR-0103 Add. 81, Chef Gus); secret_leak = 26 of 93 detective rounds-call findings, 2026-10-03..13'),
 (r'STRAY QUOTATION|unmatched quotation|trailing apostrophe|`\'\'`|two apostrophes|lone (closing|trailing)','yes','Fixed "at the source" in v44 (imported 2026-09-25) and recurred: auto_remediation_log dangling_quote_mark 15 rows / 13 packages 2026-10-01..10-12; CLAUDE.md: second sighting needs a fresh look'),
 (r'LANGUAGE CHECK|language of the prose|never Spanish by default','unknown','Parent84 imported 2026-10-13, no package generated since; the earlier language_instruction failed on 5 of 7 English packages 2026-10-09..12 (ADR-0103 Add. 91)'),
 (r'Always respond in the same language as the master_context','yes','Same sentence failed on 5 of 7 English packages 2026-10-09..12 (Spanish materials), ADR-0103 Add. 91'),
 (r'literal markdown section headers|translate these into|exact translations','yes','English headers in 6 packages in 60 days despite the translate-headers instruction; solved only by the language pack + label-conformity heal (ADR-0135, ADR-0152)'),
 (r'LANGUAGE PACK|SPEECH REGISTER|informal register','unknown','Child53 imported 2026-10-03; Child45 register rule failed before it (ADR-0103 Add. 13, 56); German Sie/ihr and Portuguese senhor seen pre-Child53 (ADR-0135 Add. 2); post-Child53 non-English sample too small'),
 (r'VICTIM PRONOUNS','unknown','Child54 imported 2026-10-03; pronoun_drift 10 reviewer findings in 2 packages since, both unverified as prompt vs input'),
 (r'GRAMMATICAL PERSON','yes','Child40 (2026-09-12) fix; narration_person_mismatch found 10 more affected characters after (ADR-0103 Add. 45)'),
 (r'EMIT EACH FIELD EXACTLY ONCE|no_chain|Wait, this is wrong|self-correction','yes','Child13 (no_cot), Child48 (EmitFieldOnce, 2026-10-01); self-correction leaks recurred (A Feast For The Dying sweep 2026-10-01, Paradis Perdu 2026-10-02; Parent73 Add. 71-73)'),
 (r'ABSOLUTE FINAL RULE','unknown','no incident found'),
 (r'NO INVENTED SPECIFICS|ONE-NIGHT TIME FRAME|EVIDENCE BY ROUND','unknown','Child57/Parent75 built 2026-10-04 from reviewer findings; compare with ADR-0142 baseline not yet recorded'),
 (r'POSITIONS AT THE KEY MOMENT|keyMomentPositions','unknown','Child58/Parent77 imported 2026-10-06; too new (alibi-witness cross-character contradictions seen in Last Thanksgiving, 2026-10-06)'),
 (r'RELATIONSHIP SELF-EXCLUSION','unknown','Child29 (2026-08-16) fixed in code, not in Make (project memory), no recurrence found'),
 (r'(Summarise|Summarize).*pointform','unknown','pointform is not in these prompts'),
]
RECc=[(re.compile(p,re.I),v,e) for p,v,e in REC]
def recur(r):
    for rx,v,e in RECc:
        if rx.search(r['text']): return v,e
    return 'unknown','no incident traced'
def vname(fam,n):
    if n is None: return 'unknown'
    first_n={'P':2,'C':1}[fam]
    i=vinfo.get((fam,n))
    if i is None: return f"{'Parent' if fam=='P' else 'Child'}{n}"
    s=i['file']
    s=re.sub(r'^Child \(Unified\)','Child',s)
    adr=('; ADR-'+'/'.join(i['adrs'])) if i['adrs'] else ''
    return f"{s} ({i['date']}{adr})"
rows=[];by_mod={}
TXT={}
for fam_,mid_,*_ in reg:
    TXT[(fam_,mid_)]=open(f"{fam_}_{mid_}.txt").read()
DATA_TAGS_=['<context>','<master_context>','<input_data>']
def data_info(fam,mid):
    t=TXT[(fam,mid)]
    for tag in DATA_TAGS_:
        i=t.find(tag)
        if i>=0:
            if fam=='C': size=83000
            elif mid in('171','165','2417','2453'): size=21000
            elif mid in('3000','4010','4020','4030'): size=83000
            else: size=62000
            return i,size
    return None,0
# stable dup key set
for fam,mid,name,slot,L,rs in reg:
    rr=[r for r in rs]
    for r_ in rr:
        r_['is_dir']=(r_['kind'] in('rule','schema-embedded','language_instruction') and (bool(DIRECT.search(r_['text'])) or bool(EMPH.search(r_['text']))))
    ruleish=[r for r in rr if r['is_dir']]
    n_after_emph=0
    # compute positions
    for i,r in enumerate(ruleish): r['pos_end']=len(ruleish)-i
    # emphatic markers after
    cum=0
    for r in reversed(ruleish):
        r['emph_after']=cum
        cum+=len(EMPH.findall(r['text']))
    by_mod[(fam,mid)]=dict(name=name,L=L,ruleish=len(ruleish),emph=sum(len(EMPH.findall(r['text'])) for r in ruleish))
    for k,r in enumerate(rr,1):
        kind=r['kind']
        e=len(EMPH.findall(r['text']))
        directive=r['is_dir']
        if kind=='rule' and not directive: kind2='spec'
        else: kind2=kind
        if kind in('rule','schema-embedded','language_instruction'):
            cov,strength=cover(r,dict(fam=fam,name=name)) if directive else ('n/a (spec/template line)','spec')
            rv,re_=recur(r)
            lin=r['lineage']
            first=lin['first'][0] if lin and lin['first'] else None
            inc=vname(fam,first) if first is not None else 'unknown'
            if first is not None and first<= {'P':2,'C':1}[fam]: inc=('original (already in earliest tracked version, Parent2 2026-04-20)' if fam=='P' else 'original (already in earliest tracked version, Child1 2026-04-20)')
            edits=lin['edits'] if lin else None
        else:
            cov,strength,rv,re_,inc,edits='','','','','',None
        rows.append(dict(blueprint=('Parent84' if fam=='P' else 'Child62'),module_id=mid,module_name=name,rule_id=f"{fam}{mid}-{k:03d}",section_tag=r['section']+(f" / {r['header']}" if r['header'] and r['header']!='embedded' else ''),
            rule_text_first_200_chars=re.sub(r'\s+',' ',r['text'])[:200],chars=len(r['text']),
            position_from_end=r.get('pos_end',''),emphatic='yes' if e else 'no',duplicated_in_n_modules=r.get('dup',1) if kind in('rule','schema-embedded','language_instruction','role') else '',
            added_by_incident=inc,covered_by_detector_or_heal=(cov if strength not in('','spec') else (cov if cov else 'none')),
            recurred_after_prompt_fix=(f"{rv} - {re_}" if kind in('rule','schema-embedded','language_instruction') else ''),
            before_data_block=(('yes' if (r.get('off',-1)>=0 and data_info(fam,mid)[0] is not None and r['off']<data_info(fam,mid)[0]) else 'no') if kind in('rule','schema-embedded','language_instruction') else ''),
            est_runtime_chars_from_end=((L-r['off']+(data_info(fam,mid)[1] if (data_info(fam,mid)[0] is not None and r['off']<data_info(fam,mid)[0]) else 0)) if (r.get('off',-1)>=0 and kind in('rule','schema-embedded','language_instruction')) else ''),
            kind=kind2,coverage_strength=strength,rewrites=edits if edits is not None else '',emphatic_markers=e,emphatic_markers_after=r.get('emph_after',''),char_offset_from_end=(L-r['off']) if r.get('off',-1)>=0 else '',module_chars=L))
fields=list(rows[0].keys())
os.makedirs('/Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main/docs/adr/0153-phase0',exist_ok=True)
out='/Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main/docs/adr/0153-phase0/rule-registry.csv'
def _n(v):
    return v.replace('\u2014',' - ').replace('\u2013','-').replace('  ',' ') if isinstance(v,str) else v
rows=[{k:_n(v) for k,v in row.items()} for row in rows]
with open(out,'w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
pickle.dump((rows,by_mod),open('rows.pkl','wb'))
print(len(rows))
c=collections.Counter(r['kind'] for r in rows);print(c)
d=[r for r in rows if r['kind']in('rule','schema-embedded')]
print('directive rows',len(d),collections.Counter(r['coverage_strength'] for r in d))
