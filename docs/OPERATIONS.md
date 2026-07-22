# Mystery Maker — Operations Manual

*Written July 2026 for Jonathan. This is the "run the business without a developer" guide.
Everything here can be done by clicking through dashboards and copy-pasting the snippets provided.
You never need to write code or SQL yourself.*

**The one rule above all others: never paste your Service Role key anywhere public** — not in
chat tools, not in a website form, not in a screenshot. It is the master key to your entire
database. More in the Glossary at the bottom.

---

## 1. The system at a glance

The live site is **mysterymaker.party**. (The repo folder is named differently — ignore that.)

The customer journey for the main party product:

1. **Customer chats** with the AI on the site to design their mystery → saved in **Supabase**
   (your database) in the `conversations` table.
2. **Customer pays** via a **Stripe** Payment Link. Stripe calls your `stripe-webhook`
   function, which marks the conversation as paid. *Only the server can mark something paid —
   this was locked down in July 2026 (ADR-0033) so nobody can cheat it from a browser.*
3. **Customer clicks Generate** → a Supabase "edge function" (`mystery-webhook-trigger`)
   fires a webhook to **Make.com**, which runs the AI generation:
   - The **parent scenario** ("MM Live - Parent") builds the overview, host guide, clues,
     and evidence images.
   - A **child scenario** ("MM Live - Child (Unified)") writes each character's round
     scripts. Keep this ONE child scenario switched on — the two old ones are deprecated.
4. Results are saved back into Supabase (`mystery_packages` and `mystery_characters` tables).
   A watchdog (see section 3) auto-detects and retries failures.
5. **Delivery**: the customer sees their package on the site. Guest links, feedback emails,
   review prompts, and discount reminders go out via **Resend** (the email service — everything
   comes from `noreply@mysterymaker.party`).

Who does what:

| Service | Job | Dashboard |
|---|---|---|
| Supabase (project `mhfikaomkmqcndqfohbp`) | Database, edge functions, file storage, scheduled jobs | supabase.com/dashboard |
| Make.com | The AI generation pipeline (parent + child scenarios) | make.com → Scenarios |
| Stripe | Payments, refunds, Payment Links | dashboard.stripe.com |
| Resend | Sends all email | resend.com |
| GitHub | Code lives here; "Actions" run the blog/SEO automations and deploy the site | github.com → your repo |
| GitHub Pages | Hosts the website. Any push to the `main` branch auto-deploys via the "Deploy to GitHub Pages" Action | (automatic) |
| Fly.io | Runs the Cold Case worker container (section 5) | fly.io/dashboard |

The second product, **Cold Case Files** (solo detective game, guest checkout, delivered by
email link), has its own flow — see section 5.

---

## 2. Where the money flows

Everything is in the **Stripe dashboard** (dashboard.stripe.com).

**Seeing payments:** left menu → **Payments**. Each row shows customer email, amount, status.
Click a payment to see details, including metadata (Cold Case orders have `product: cold_case`).

**Issuing a refund:**
1. Payments → click the payment → **Refund** button (top right) → confirm.
2. Money returns to the customer in 5–10 days. Stripe's fee is not returned to you.

**⚠️ Important caveat: refunding does NOT revoke the customer's access.** The site never
un-marks a paid mystery. If you refund someone and want to also remove their access:
1. Supabase dashboard → **SQL Editor** → New query, paste this (replace the email):
   ```sql
   SELECT c.id, c.title, c.is_paid, u.email
   FROM conversations c JOIN auth.users u ON u.id = c.user_id
   WHERE u.email ILIKE 'customer@example.com';
   ```
2. Run it, copy the `id` of the right mystery, then run:
   ```sql
   UPDATE conversations SET is_paid = false WHERE id = 'PASTE-ID-HERE';
   ```
   (The SQL Editor runs with admin rights, so this works even though browsers can't touch
   `is_paid`.)

**Payment Links:** left menu → **Payment links**. There are two that matter: the party product
link and the Cold Case link (the Cold Case one carries the `product=cold_case` metadata and two
custom fields, `setting_era` and `details` — never rename those keys; the webhook depends on them).

**Disputes/chargebacks:** left menu → **Disputes**. Respond within the deadline Stripe shows —
an unanswered dispute is an automatic loss. Upload the generation record / delivery email as
evidence.

---

## 3. When a customer says "my mystery didn't generate"

This is the most common support issue. Work top to bottom.

### Step 1 — Find the order in Supabase

Supabase dashboard → **SQL Editor** → paste (replace the email) → **Run**:

```sql
SELECT c.id AS conversation_id, c.title, c.is_paid, c.player_count,
       mp.id AS package_id, mp.generation_status, mp.generation_completed_at,
       (SELECT COUNT(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) AS character_count
FROM conversations c
JOIN auth.users u ON u.id = c.user_id
LEFT JOIN mystery_packages mp ON mp.conversation_id = c.id
WHERE u.email ILIKE 'customer@example.com'
ORDER BY c.updated_at DESC;
```

Read the `generation_status` column (it's a small JSON blob):
- `"completed"` + character_count > 0 → generation worked; the problem is likely elsewhere
  (ask the customer for a screenshot).
- `"in_progress"` → still running or stalled. Normal runs take 10–30 minutes. If it's been
  hours, go to Step 3 (Make.com).
- `"needs_review"` → the watchdog caught a problem (usually empty characters) and emailed
  support@mysterymaker.party. It often self-heals — see Step 4.
- `"failed"` with `"resumable": true` → the customer can simply click the retry button on
  their mystery page. Tell them to refresh and retry.

### Step 2 — If characters look incomplete, check BOTH script formats

**Trap that has fooled us before:** round scripts are stored in one of TWO sets of columns,
and a package uses only one set. Checking only one set makes a perfectly good package look
completely broken. Run this:

```sql
SELECT name, character_role,
  (round2_script IS NOT NULL OR round3_script IS NOT NULL OR round4_script IS NOT NULL) AS unified_format,
  (round2_innocent IS NOT NULL OR round2_guilty IS NOT NULL OR round3_innocent IS NOT NULL) AS branching_format
FROM mystery_characters
WHERE package_id = 'PASTE-PACKAGE-ID-HERE'
ORDER BY name;
```

If EITHER column shows `true` for a character, that character has its scripts. Only if both
are `false` across the board is something genuinely missing.

### Step 3 — Check Make.com

1. Log in to **make.com** → **Scenarios**.
2. Open **"MM Live - Parent"** → **History** tab (clock icon). Find the run matching the
   customer's generation time. Red = failed; click it to see which module errored.
3. Also check **"MM Live - Child (Unified)"** history — this writes the character scripts.
   **Make sure both scenarios are toggled ON** (a switched-off child scenario once shipped
   two packages with zero characters).
4. Common one-off failure: an image-generation module timing out. Since June 2026 the parent
   resumes past image timeouts, so this no longer kills a run — the mystery completes,
   possibly missing one evidence photo (harmless; see the check below).

### Step 4 — Understand the watchdog (it usually fixes things for you)

There is an automatic monitoring system:
- A database job (`sweep_incomplete_packages`) runs every couple of minutes, looks for
  packages with empty/broken characters, marks them `needs_review`, and **emails
  support@mysterymaker.party**.
- Make.com itself verifies characters at the end of a run and **auto-retries** missing ones
  through the child scenario before marking anything completed.
- A healer job auto-promotes `needs_review` back to `completed` once characters are filled in.
- **The customer's screen:** while status is `needs_review` (or characters are missing), the
  site shows a **"We're Finalizing Your Mystery"** card instead of broken tabs, and after a
  15-minute timeout it says "our team has been notified". So a support email from that
  address = the watchdog already told you; give it 30–60 minutes before intervening.

### Step 5 — If it's genuinely stuck, reset for retry

This puts a "Ready to retry" button on the customer's page (they click Generate again):

```sql
UPDATE mystery_packages SET
  generation_status = '{"status":"failed","progress":0,"resumable":true,"currentStep":"Ready to retry"}'::jsonb,
  updated_at = NOW()
WHERE conversation_id = 'PASTE-CONVERSATION-ID-HERE';
```

If retries keep failing, the cause is usually inside Make.com (Step 3) or a mismatch between
the character list and `player_count` — that requires a developer/AI session; save the
conversation_id and the Make.com error screenshot for them.

### Bonus check — missing evidence images

Rarely, a mystery completes but one evidence photo is missing (nothing blocks the customer).
To list any affected paid packages:

```sql
SELECT * FROM list_packages_missing_evidence_images();
```

Empty result = all good. If a row appears, the mystery is still playable; regenerating the
image needs a developer/AI session (the recipe is in the project memory and CHANGELOG).

### Health-check check 5 fired — "character identity contamination" (ADR-0041)

This alert means the generator gave two or more characters the **same relationship to the
victim** (e.g. several guests' scripts all claim "Rex was my brother") — the murderer's
storyline bleeding into other characters. This is what caused the 1-star Bollinger review
in July 2026.

**This is a pre-party rescue, not a post-mortem.** Hosts buy ~2–3 weeks before their
party, and the check runs every 6 hours — so a flagged package can almost always be fixed
before anyone plays it. Treat it as time-sensitive.

**Step 1 — see what's flagged** (character names + the conflicting kinship term):

```sql
SELECT * FROM list_packages_with_identity_conflicts();
```

**Step 2 — hand it to an AI session** with this instruction: *"Health check flagged
identity contamination in package `<package_id>`. Read each flagged character's
round scripts and final statement against their own background/relationships, find every
line where they claim another character's identity, kinship, secret, alibi, or guilty
knowledge, and repair with surgical single-cell `replace()` edits (no bulk regex, no
regeneration). Also fix the matching `_pointform` columns. Then re-run the detector and
probe for leftover echo phrases."* The worked example (the Ashworth repair — exactly this
procedure) is in the CHANGELOG under 2026-07-22 and in project memory.

**Step 3 — confirm clean**: the Step 1 query returns no row for that package, and the
next health-check run goes green.

Only one character truly has each relationship to the victim — check the murderer's
background first; the bleed almost always flows *from* the murderer's storyline *to*
innocents. The detector deliberately ignores single benign mentions ("my mother" about
their own family), so a flagged row is worth taking seriously.

---

## 4. When emails don't arrive

All email goes through **Resend** (resend.com), sent from `noreply@mysterymaker.party`.

1. Log in to Resend → **Emails**. Search the customer's address. Each email shows
   Delivered / Bounced / Complained.
   - **Delivered** → it's in their spam folder or a typo'd address. Ask them to check spam.
   - **Bounced** → the address is wrong. Get a good address, then re-trigger (below) or
     forward the content manually.
   - **Nothing at all** → the sending function never fired; check Supabase logs
     (section 7) for the function in question.
2. Resend → **Domains**: `mysterymaker.party` must show verified/green. If it ever turns
   red, DNS records changed — that breaks ALL email until fixed.

Who sends what (all are Supabase edge functions):

| Email | Function | When |
|---|---|---|
| Welcome email | `send-welcome-email` | On signup |
| Welcome discount reminders (day 5 & 7) | `send-discount-reminders` | Daily 9:00 UTC scheduled job |
| Host & character/guest emails | `send-host-email`, `send-character-email` | When the host assigns guests |
| Guest feedback request | `send-guest-feedback-email` | Daily 10:00 UTC job, 14 days after a character email |
| Host Trustpilot prompt | `send-followup-emails` | Daily 10:15 UTC job, 21 days after generation |
| "Generation issue" alert to you | `notify-generation-issue` | When the watchdog finds a problem |
| Cold Case confirmation + READY email | `stripe-webhook` / `send-cold-case-ready` | At purchase / when the case is built |

All customer-facing emails render in the customer's language (13 supported) using
`profiles.language`; if that's empty they fall back to English. Cold Case guests have no
account, so their language comes from the checkout link's `?locale=` parameter.

---

## 5. Cold Case Files orders

Cold Case is guest checkout — no account. The flow: Stripe payment → webhook creates a row in
`cold_case_orders` → a worker machine on **Fly.io** generates the game (~30–60 min) → the file
is uploaded to a private Supabase storage bucket (`cold-case-files`) → the customer gets a
READY email with a link like `mysterymaker.party/cold-case/<long-token>`. That
**delivery_token** IS their key — the page mints a fresh 10-minute download link each visit,
so the email link keeps working indefinitely.

**See all orders** (Supabase → SQL Editor):

```sql
SELECT id, email, status, buyer_language, brief, retry_count, created_at, delivered_at
FROM cold_case_orders ORDER BY created_at DESC LIMIT 20;
```

Status meanings: `paid` (queued) → `generating` → `ready` (delivered) or `failed`
(you get a Telegram alert; the customer gets a "taking longer than expected" email).

**If an order sits in `paid` for over an hour:** the worker is probably down. Fly.io dashboard →
the cold-case app → check it's running; **Monitoring** shows its logs (healthy = "cold-case
worker up — polling every 20s"). Restart the machine from the dashboard if needed — orders
queue safely and are picked up when it returns.

**Re-send a READY email** (customer lost it / bounced address fixed). In Terminal, paste this
after filling in the two placeholders (Service Role key: Supabase dashboard → Project Settings
→ API → `service_role` — treat like a bank password):

```sh
curl -X POST "https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/send-cold-case-ready" \
  -H "Authorization: Bearer PASTE-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "PASTE-ORDER-ID"}'
```

(If the address itself was wrong, first fix it: `UPDATE cold_case_orders SET email = 'new@address.com' WHERE id = 'PASTE-ORDER-ID';` in the SQL Editor.)

Full launch details (Stripe link setup, worker deploy, end-to-end test): see
`docs/cold-case-launch-runbook.md` and ADR-0029.

---

## 6. Monthly hygiene (30 minutes, first of the month)

1. **Supabase advisors:** dashboard → **Advisors** (or Database → Advisors) → run the
   Security and Performance scans. Some warnings are expected and deliberate — the
   token-based guest links are *supposed* to be publicly callable (ADR-0032 explains which).
   New, unfamiliar warnings about exposed data are worth a developer/AI session.
2. **GitHub Actions green:** github.com → your repo → **Actions** tab. The scheduled ones —
   "Publish Daily Blog Post" (daily), "Pinterest image generation" (daily), "Weekly SEO/GEO
   Digest" (Mondays), "Deploy to GitHub Pages" (each push), "Quarterly Blog Date Refresh" —
   should show green checks. One red run is usually a hiccup; click **Re-run jobs**. Repeated
   reds on the same workflow = something broke; note the error text for help. (The other
   workflows are manual-trigger tools; ignore them unless instructed.)
3. **Stripe:** check **Disputes** (respond to any!), skim **Payments** for anomalies, and
   confirm both Payment Links are still Active.
4. **Resend:** Domains page still green; skim Emails for unusual bounce rates.
5. **Renewals:** the domain `mysterymaker.party` must not lapse — check the registrar account
   (search your email for the purchase receipt if unsure) and keep auto-renew ON with a valid
   card. Same for Fly.io, Make.com, Supabase, and Resend billing — a lapsed card on any of
   these quietly stops the business.
6. **Cold Case queue:** run the orders query from section 5; confirm nothing is stuck.

---

## 7. Emergency contacts / escape hatches

**Something is badly broken and people are still paying — stop the bleeding:**
1. Stripe dashboard → **Payment links** → click the link → **⋯ menu → Deactivate**.
   The buy button on the site will stop working; nobody new can pay. Reactivate the same way.
2. This is almost always better than touching the site or database in a panic.

**Seeing what the backend is doing (logs):**
- Supabase dashboard → **Edge Functions** → click a function (e.g. `stripe-webhook`) →
  **Logs** tab. Errors show in red with timestamps.
- Supabase dashboard → **Logs** (left menu) lets you filter database/API/auth logs.
- Make.com → scenario → **History** for generation runs.
- Fly.io → app → **Monitoring** for the Cold Case worker.

**Support inbox:** watchdog and feedback alerts go to **support@mysterymaker.party** —
keep that inbox monitored; it's your early-warning system.

**The paper trail — protect it:**
- `docs/adr/` in the repo holds ~33 **Architecture Decision Records** — the *why* behind
  every technical choice (why refunds don't revoke access, why certain security warnings are
  deliberate, how generation monitoring works).
- `CHANGELOG.md` at the repo root is the dated history of every change.
- Any future developer or AI you hire should read these FIRST. They turn a weeks-long
  onboarding into hours, and they prevent someone "fixing" things that are intentional.
  When hiring help, the magic sentence is: *"Read CLAUDE.md, CHANGELOG.md, and docs/adr/
  before touching anything."*

**Getting emergency dev help:** any competent developer (or a fresh AI coding session) with
GitHub access + the Supabase dashboard + this manual can operate everything. Credentials
they'll ask about: Supabase keys live at Supabase dashboard → Project Settings → API; GitHub
Action secrets at repo → Settings → Secrets and variables → Actions; Stripe keys at Stripe →
Developers → API keys. **Give access via the dashboards' own invite features where possible,
rather than pasting keys.**

---

## 7b. Backups & disaster recovery

Your customer data lives in the Supabase database. **Important (confirmed 2026-07-05):
the project is on Supabase's FREE plan, which makes NO backups of its own.** The
GitHub backup below is the only copy of your customer data outside Supabase.

**Layer 1 — daily encrypted export to GitHub (your primary backup):**
- The `Daily encrypted backup` GitHub Action exports the 12 customer-critical tables
  every day at ~04:43 UTC and stores them as an encrypted file on GitHub for 30 days
  (repo → **Actions → Daily encrypted backup** → click a run → download the artifact).
- Worst-case data loss if disaster strikes: about one day of new orders/mysteries.

**Layer 1b — consider upgrading Supabase to Pro (~$25/month) when revenue justifies it:**
- Pro adds Supabase's own daily backups (7-day history, one-click restore),
  leaked-password protection on signups, and removes the free-tier project-pause
  risk. The dashboard restore button restores the WHOLE database to that moment
  (anything newer is lost) — for disasters, not for undoing one mistake.
- Free-tier caveat: Supabase pauses free projects after ~1 week without traffic.
  Your site gets daily traffic so this is unlikely, but if the site ever "goes dark"
  after a long quiet period, check the Supabase dashboard for a paused project first
  (Restore is a button).
- **One-time setup needed from you:** create a long random passphrase, save it in your
  password manager, then add it as a repo secret named `BACKUP_PASSPHRASE`
  (repo → Settings → Secrets and variables → Actions → New repository secret).
  Until you do this, the workflow runs but skips politely with a warning.
- **Why encrypted:** the repo is public — an unencrypted export would publish your
  customers' emails and mysteries to the internet. Without the passphrase the backup
  files are unreadable, *including by you* — so the password-manager copy matters.
- Restoring: hand the downloaded file + passphrase to any developer with this command:
  `openssl enc -d -aes-256-cbc -pbkdf2 -in <file> -pass pass:<PASSPHRASE> | tar xz`
  — it unpacks one plain-text `.jsonl` file per table.

**Layer 2 — what does NOT need backing up:**
- Blog posts (119 MB) — regenerable from `blog_map.xlsx` + the publish workflows.
- Evidence images / storage files — regenerable (see §3), and the recovery steps
  are in this manual.
- The website code — it's all in GitHub already.

---

## 8. Glossary

- **Supabase** — your backend-in-a-box: database, file storage, edge functions, scheduled
  jobs, and login system, all in one dashboard.
- **Edge function** — a small program hosted by Supabase that runs on demand (e.g. "send
  this email", "handle this Stripe event"). Found under Edge Functions in the dashboard.
- **Webhook** — a URL one service calls to notify another. Stripe calls your `stripe-webhook`
  when someone pays; your site calls a Make.com webhook to start generation.
- **Anon key** — the *public* Supabase key baked into the website. Safe-ish to expose;
  everything it touches is guarded by RLS.
- **Service Role key** — the *master* Supabase key that bypasses all security. **NEVER paste
  it anywhere public — not in chats, forms, screenshots, or code that gets committed.** It
  lives at Supabase → Project Settings → API, and only ever goes into server-side settings
  (Fly.io secrets, GitHub Action secrets) or a one-off Terminal command you delete after.
- **RLS (Row Level Security)** — database rules deciding which rows each user may see/edit.
  The reason the anon key is safe and customers only see their own mysteries.
- **RPC** — a database function callable over the web (e.g. the token-based guest lookups).
  Some are deliberately public; ADR-0032 lists which and why.
- **SQL / SQL Editor** — the database query language / the Supabase dashboard page where you
  paste the snippets in this manual and click Run. Runs with admin rights.
- **pg_cron** — Supabase's scheduler; runs the daily email jobs and the generation watchdog.
- **Scenario (Make.com)** — a visual automation flow. Parent = whole mystery; Child (Unified)
  = per-character scripts. History tab = its run log.
- **Payment Link** — a Stripe-hosted checkout URL. No code involved; configured entirely in
  the Stripe dashboard (including the metadata and custom fields Cold Case depends on).
- **generation_status** — the JSON field on `mystery_packages` tracking a package's state:
  `in_progress`, `completed`, `needs_review`, or `failed`.
- **delivery_token** — the long random string in a Cold Case link. Possessing it IS the
  proof of purchase; don't post one publicly.
- **Signed URL** — a temporary (10-minute) download link the delivery page creates from the
  private storage bucket. Expiring is normal; revisiting the page makes a fresh one.
- **Storage bucket** — a file folder in Supabase: `evidence-images` (public) and
  `cold-case-files` (private).
- **GitHub Action** — an automation that runs in GitHub (deploys, daily blog publish, SEO
  digest). Actions tab = their run history.
- **DNS** — the settings that point mysterymaker.party at the site host and authorize
  Resend to send email as your domain. Changing DNS carelessly can take down the site AND
  all email.
- **ADR (Architecture Decision Record)** — a short document in `docs/adr/` recording a
  technical decision and its reasoning. The institutional memory of the project.
