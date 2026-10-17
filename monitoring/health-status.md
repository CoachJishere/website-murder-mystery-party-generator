# Site health status

_Last checked: 2026-10-17 04:36 UTC (runs every 6 hours; see .github/workflows/health-check.yml)_

## ⚠️ Problems found

- 🟠 Could not query stuck generations (Supabase API error)
- 🟠 Could not query needs_review packages (Supabase API error)
- 🟠 Could not run the missing-evidence-images detector (Supabase API error)
- 🟠 Could not run the identity-conflict detector (Supabase API error)
- 🟠 Could not run the meta-text-leak detector (Supabase API error)
- 🟠 Could not run the victim-mismatch detector (Supabase API error)
- 🟠 Could not run the slip-culprit-leak detector (Supabase API error)
- 🟠 Could not run the self-directed-questions detector (Supabase API error)
- 🟠 Could not run the completed-but-empty detector (Supabase API error)
- 🟠 Could not run the structural-defect detector (Supabase API error)
- 🟠 Could not run the roster-mismatch detector: {   message: 'TypeError: fetch failed',   details: 'TypeError: fetch failed
' +     '    at node:internal/deps/undici/undici:15270:13
' +     '    at async main (file:///home/runner/work/website-murder-mystery-party-generator/website-murder-mystery-party-generator/scripts/detect-roster-mismatches.mjs:49:37)',   hint: '',   code: '' } 
- 🟠 Could not run the final-statement-confession-leak detector (Supabase API error)
- 🟠 Could not run the unconfessed-culprit detector (Supabase API error)
- 🟠 Could not run the truncated-concept-message detector: { message: 'upstream request timeout' } 
- 🟠 Could not run the status-predicate-drift detector: list_defect_detector_status_coverage failed: upstream request timeout 
- 🟠 Could not run the checkout roster-anomaly detector (Supabase API error)

| Check | Result |
|---|---|
| Website (www.mysterymaker.party) | HTTP 200 |
| Generations stuck > 2h | ? |
| needs_review packages (7 days) | ? |
| Paid packages missing evidence images | ? |
| Character identity conflicts (30 days) | ? |
| Meta-text / CoT artifacts (14 days) | ? |
| Wrong victim in overview (30 days) | ? |
| Slip-culprit leak (30 days) | ? |
| Self-directed questions (30 days) | ? |
| Completed-but-empty packages (30 days) | ? |
| Structural defects — escalate only (30 days) | ? |
| Roster-count mismatches — escalate only (30 days) | ? |
| Final-statement confession leaks — escalate only (30 days) | ? |
| Unconfessed detective-style culprits — escalate only (30 days) | ? |
| Truncated concept messages — escalate only (30 days) | ? |
| Stale hardcoded models — escalate only | 0 |
| Detector status-predicate drift — escalate only | ? |
| Checkout roster-extraction anomalies — escalate only (24h) | ? |
| Ally/rival lists contradicting the relationship matrix — info only (30 days) | ? |
