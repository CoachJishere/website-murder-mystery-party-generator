-- ADR-0131 item 7: backfill COMMENT ON FUNCTION on detector/gate-adjacent
-- functions that had none. Every comment below is written from the
-- function's actual live SQL (pg_get_functiondef), not from ADR prose or
-- memory, per this audit's own "verify against live source" discipline.
-- No behavior change -- comments only.

COMMENT ON FUNCTION public.list_packages_with_self_directed_questions(timestamptz) IS
$doc$Advisory sibling of package_completion_blocking_defects()'s self_directed_question check -- both use the identical \*\*to <name>\M pattern (confirmed in sync 2026-09-28, ADR-0131). Flags a character whose own round-questions field addresses a question to themselves or the victim. Free, deterministic auto-remediation via auto-remediate-packages (retargetQuestions). See ADR-0042, ADR-0056.$doc$;

COMMENT ON FUNCTION public.list_packages_with_slip_culprit_leak(timestamptz) IS
$doc$Advisory sibling of package_completion_blocking_defects()'s slip_culprit_leak check -- identical regex pattern (confirmed in sync 2026-09-28, ADR-0131). For a random-culprit package (mystery_style='character', no predetermined murderer), flags a character's own secret field outright confessing ("you poisoned/killed/..." + "hide/conceal your guilt"). Delegated to regenerate-child-content for repair. See ADR-0042, ADR-0061.$doc$;

COMMENT ON FUNCTION public.list_packages_with_evidence_culprit_spoiler(timestamptz) IS
$doc$Flags an evidence card whose text names the murderer's surname outright. Permanently advisory-only by design -- high false-positive rate, deliberately never wired to the blocking gate or auto-remediation. See ADR-0042, ADR-0053.$doc$;

COMMENT ON FUNCTION public.list_packages_with_final_statement_confession_leak(timestamptz) IS
$doc$For mystery_style='character' packages, flags a murderer/accomplice whose final_guilty/final_accomplice branch has a reveal_confession_* field populated but the branch text itself reads as a denial rather than a confession (keyword heuristic with negation guard). Covers the same "does the reveal actually reveal" concern as list_packages_with_unconfessed_culprit, but for mystery_style='character' instead of 'detective'. Monitored by health-check as part of the Haiku-era confession-reliability checks. See ADR-0074.$doc$;

COMMENT ON FUNCTION public.list_packages_with_characters_absent_from_conversation(timestamptz) IS
$doc$Thin wrapper around package_characters_absent_from_conversation(): flags a delivered character never mentioned anywhere in the customer's approved conversation. Gated on approved_concept_message_id IS NOT NULL to avoid false positives on theme-only briefs with no stated roster. See ADR-0118 Addendum 2.$doc$;

COMMENT ON FUNCTION public.list_packages_with_dangling_quote_mark(timestamptz) IS
$doc$Flags an unmatched trailing quote mark (sentence-ending punctuation immediately followed by a closing quote with no matching opening quote nearby, per-line) in introduction/final_statement/reveal_confession_guilty/reveal_confession_accomplice/final_innocent. Traced to an ambiguous JSON-formatting instruction on the LAST field at 8 Make.com generation call sites; fixed at the source in blueprint v44 (imported 2026-09-25) -- a live hit post-v44 means the prompt fix didn't fully land. See ADR-0103 Addendum 55.$doc$;

COMMENT ON FUNCTION public.list_packages_with_missing_role_branch_content(timestamptz) IS
$doc$Advisory sibling of package_completion_blocking_defects()'s missing_role_branch_content check -- identical peer-existence-gated accomplice-branch logic, mystery_style='character' only (confirmed in sync 2026-09-28, ADR-0131). Returns per-character missing-field lists. Delegated to regenerate-child-content for repair, one call per character with that character's own precise missing-field list. See ADR-0103 Addendum 31/36.$doc$;

COMMENT ON FUNCTION public.list_packages_with_narration_person_mismatch(timestamptz) IS
$doc$Advisory sibling of package_completion_blocking_defects()'s narration_person_mismatch check -- identical stage-direction/dialogue-tag heuristic (confirmed in sync 2026-09-28, ADR-0131). Flags a character whose own baseline branch (innocent/_script/final_statement) proves they write first person, while a sibling branch opens third-person with no quotable dialogue. Third-person narration alone is NOT a defect -- the signal is the cross-branch inconsistency. Delegated to regenerate-child-content for repair. See ADR-0103 Addendum 45.$doc$;

COMMENT ON FUNCTION public.list_packages_with_pointform_language_mismatch(timestamptz) IS
$doc$Advisory sibling of package_completion_blocking_defects()'s pointform_language_mismatch check -- identical bidirectional stopword-density comparison between a character's prose fields and their *_pointform counterparts, both directions (foreign-prose+English-pointform AND English-prose+foreign-pointform), confirmed in sync 2026-09-28 per ADR-0103 Addendum 62's fix. Delegated to regenerate-child-content, batched by package, for repair. See ADR-0103 Addendum 40/41/62.$doc$;

COMMENT ON FUNCTION public.list_packages_with_unresolved_victim_name(timestamptz) IS
$doc$Thin wrapper around package_victim_name_unresolved(): flags master_context's victim name still carrying the dual-gender "X/Y Name" placeholder form post-generation. Deliberately advisory-only, not gated (ADR-0053's gating bar requires more validated post-fix data). Does NOT rewrite master_context on already-fixed historical packages (ADR-0107 deliberately left those alone) -- a hit on those is an expected non-regression, not a new bug. See ADR-0107.$doc$;

COMMENT ON FUNCTION public.list_packages_with_victim_as_character(timestamptz) IS
$doc$Thin wrapper around package_victim_is_playable_character(): the read-only advisory sibling of the SAME check also wired into package_completion_blocking_defects() as a BLOCKING class -- both call the identical shared function, so these two cannot disagree with each other. Flags game_overview describing a playable suspect's death. See ADR-0060.$doc$;

COMMENT ON FUNCTION public.package_victim_is_playable_character(mystery_packages) IS
$doc$Shared predicate, single source of truth: checks whether game_overview describes a playable character's death (character name, or a dual-gender-stripped variant of it, within 80 chars of "was found dead"/"was murdered"/"was killed"/etc). Called from BOTH package_completion_blocking_defects() (blocking) and list_packages_with_victim_as_character() (advisory) -- deliberately one function, not two independently-maintained copies, so they structurally cannot drift apart. See ADR-0060.$doc$;
