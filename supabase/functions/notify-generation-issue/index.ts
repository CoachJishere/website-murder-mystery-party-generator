import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      throw new Error("conversation_id is required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Fetch context about the stuck generation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let mysteryTitle = "Unknown";
    let userEmail = "Unknown";
    let packageStatus = "Unknown";
    let generationStarted = "Unknown";
    let characterCount = 0;
    let expectedCharacters = 0;
    let emptyCharacters: string[] = [];
    // Map of character_name → description for auto-recovery webhook firing
    let charDescriptions: Record<string, string> = {};
    // Conversation-level metadata also needed for the webhook payload
    let scriptType = "full";
    let hasAccomplice = "false";
    let mysteryType = "murder";

    // Get conversation + user info (also pulls fields needed for auto-recovery webhook payload)
    const { data: conversation } = await supabase
      .from("conversations")
      .select("title, user_id, script_type, has_accomplice, mystery_type")
      .eq("id", conversation_id)
      .single();

    if (conversation) {
      mysteryTitle = conversation.title || mysteryTitle;
      scriptType = conversation.script_type || "full";
      hasAccomplice = String(conversation.has_accomplice ?? false);
      mysteryType = conversation.mystery_type || "murder";
      if (conversation.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(conversation.user_id);
        userEmail = userData?.user?.email || "Unknown";
      }
    }

    // Get package info — also pulls last_notified_at for the email cooldown gate,
    // and needs_review_at for the self-heal grace period gate (ADR-0065).
    const { data: pkg } = await supabase
      .from("mystery_packages")
      .select("id, title, generation_status, generation_started_at, extracted_characters, last_notified_at, needs_review_at, user_conversation, mystery_style")
      .eq("conversation_id", conversation_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pkg) {
      mysteryTitle = pkg.title || mysteryTitle;
      packageStatus = JSON.stringify(pkg.generation_status);
      generationStarted = pkg.generation_started_at
        ? new Date(pkg.generation_started_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
        : "Unknown";

      // Parse expected characters AND build a name→description lookup for
      // auto-recovery. The mystery_packages.extracted_characters JSONB is
      // sometimes stored as a STRING containing comma-separated `{...}, {...}`
      // (no outer brackets), which makes a straight JSON.parse fail.
      if (pkg.extracted_characters) {
        const raw = typeof pkg.extracted_characters === "string"
          ? pkg.extracted_characters
          : JSON.stringify(pkg.extracted_characters);
        let parsedArray: any[] | null = null;
        try {
          const parsed = JSON.parse(raw);
          parsedArray = Array.isArray(parsed) ? parsed : null;
        } catch {
          try {
            const wrapped = JSON.parse(`[${raw.trim()}]`);
            parsedArray = Array.isArray(wrapped) ? wrapped : null;
          } catch {
            parsedArray = null;
          }
        }
        if (parsedArray) {
          expectedCharacters = parsedArray.length;
          for (const c of parsedArray) {
            if (c?.name && typeof c.name === "string") {
              charDescriptions[c.name] = String(c.description || "");
            }
          }
        } else {
          // Last-resort fallback for the count when even the wrapped parse fails
          expectedCharacters = (raw.match(/"name"\s*:/g) || []).length;
        }
      }

      // Check for empty characters
      if (pkg.id) {
        const { data: chars } = await supabase
          .from("mystery_characters")
          .select("character_name, character_role, description, round2_script, round3_script, round4_script, final_statement, round2_innocent, round3_innocent, round4_innocent, final_innocent, round2_guilty, round3_guilty, round4_guilty, final_guilty, round2_questions, round3_questions, round4_questions")
          .eq("package_id", pkg.id);

        if (chars) {
          characterCount = chars.length;
          // ADR-0052's completion-gate trigger coerces any invalid Make.com
          // write to the sentinel string 'invalid_role' (never NULL) so it
          // still trips the completion gate's own invalid-role check. That
          // sentinel is a non-empty string, so a plain `!c.character_role`
          // falsiness check here treats it as "already has a role" and
          // silently skips auto-recovery for it — found 2026-08-13 on a
          // package where all 8 characters got the sentinel and empty round
          // scripts, and none were offered for re-fire.
          //
          // ADR-0096: a character can have description/character_role fully
          // populated and STILL be missing every round script and final
          // statement — the round-content call group occasionally comes
          // back and gets written as entirely empty while Make.com reports
          // the run as successful. Mirrors package_completion_blocking_
          // defects()'s missing_round_content check (same field list, same
          // mystery_style branching, deliberately excluding the
          // has_accomplice-conditional accomplice branch) so this webhook's
          // existing re-fire (searchRows -> update in place) auto-heals the
          // same defect class the DB gate now blocks completion on.
          const missingRoundContent = (c: any) => {
            const empty = (v: unknown) => !v || String(v).trim() === "";
            const roundBranchEmpty = pkg.mystery_style === "character"
              ? (empty(c.round2_innocent) || empty(c.round3_innocent) || empty(c.round4_innocent) || empty(c.final_innocent) ||
                 empty(c.round2_guilty) || empty(c.round3_guilty) || empty(c.round4_guilty) || empty(c.final_guilty))
              : (empty(c.round2_script) || empty(c.round3_script) || empty(c.round4_script) || empty(c.final_statement));
            return roundBranchEmpty || empty(c.round2_questions) || empty(c.round3_questions) || empty(c.round4_questions);
          };
          emptyCharacters = chars
            .filter((c: any) => !c.description || !c.character_role || c.character_role === "invalid_role" || missingRoundContent(c))
            .map((c: any) => c.character_name);
        }
      }
    }

    const emptyCharsHtml = emptyCharacters.length > 0
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280;">Empty Characters:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${emptyCharacters.join(", ")}</td>
        </tr>`
      : "";

    // Auto-recovery: for each empty character with a known description, fire a
    // v14 child webhook to regenerate. Make.com's v14 child uses searchRows so
    // a re-fire UPDATEs the existing row in place. We don't wait for completion;
    // the next sweep cycle will detect whether recovery succeeded.
    //
    // Safety rails (2026-08-11): this call site had NEITHER an attempt cap NOR
    // a spend cap, unlike auto-remediate-packages (ADR-0047), which caps every
    // defect class at 2 attempts and a shared daily spend ceiling. Because
    // this function is invoked every 10 minutes by
    // sweep_stuck_needs_review_packages for as long as a package stays
    // needs_review (up to 30 days), a genuinely unrecoverable empty character
    // (the same root cause every time, not a transient blip) would fire a
    // real, paid Sonnet 5 regeneration call every single cycle indefinitely --
    // discovered 2026-08-11 when a stuck package's generation_status kept
    // re-writing every few minutes with no progress. Mirrors the existing
    // pattern exactly: attempts counted from auto_remediation_log, capped per
    // character; spend summed from the SAME table, so this shares one daily
    // ceiling with auto-remediate-packages rather than getting its own
    // independent budget. Raised $5 -> $10 (ADR-0086, 2026-08-14): a single
    // 34-character package's own recovery burned $3.90 (78%) of one day's
    // shared $5 cap, leaving only $0.05 of headroom for every other
    // package's recovery that same day -- the per-character 2-attempt cap
    // already bounds any one character's worst case ($0.30), so the daily
    // ceiling was the binding constraint on multi-incident days, not runaway
    // spend on a single broken character.
    const CHILD_WEBHOOK = "https://hook.eu2.make.com/3l26wasbsjzh5396np25qoyv8g82u6j3";
    const MAX_ATTEMPTS_PER_CHARACTER = 2;
    const DAILY_SPEND_CAP_USD = 10.0;
    // Estimate only (not a measured figure like the Haiku/Replicate costs in
    // auto-remediate-packages): one full child-scenario character
    // regeneration on Sonnet 5 -- description/background/relationships/
    // secrets/4 rounds/final statement plus point-form variants.
    const CHARACTER_REGEN_COST_USD = 0.15;

    async function spentToday(): Promise<number> {
      const midnight = new Date();
      midnight.setUTCHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("auto_remediation_log")
        .select("cost_usd")
        .gte("created_at", midnight.toISOString());
      if (error) throw new Error(`spend lookup failed: ${error.message}`);
      return (data ?? []).reduce((sum: number, r: { cost_usd: number }) => sum + Number(r.cost_usd || 0), 0);
    }

    async function characterAttemptsUsed(packageId: string, charName: string): Promise<number> {
      const { data, error } = await supabase
        .from("auto_remediation_log")
        .select("action")
        .eq("package_id", packageId)
        .eq("defect_class", "empty_character_content");
      if (error) throw new Error(`attempt-cap lookup failed: ${error.message}`);
      const expected = `regenerate_character:${charName}`;
      return (data ?? []).filter((r: { action: string }) => r.action === expected).length;
    }

    const recovered: string[] = [];
    const skipped: string[] = [];
    const capped: string[] = [];
    let budgetRemaining = Math.max(0, DAILY_SPEND_CAP_USD - (await spentToday()));

    for (const charName of emptyCharacters) {
      const description = charDescriptions[charName];
      if (!description) {
        skipped.push(charName); // can't recover without a description in master_context
        continue;
      }

      if (pkg?.id) {
        const attemptsUsed = await characterAttemptsUsed(pkg.id, charName);
        if (attemptsUsed >= MAX_ATTEMPTS_PER_CHARACTER) {
          capped.push(charName);
          continue;
        }
      }
      if (budgetRemaining < CHARACTER_REGEN_COST_USD) {
        capped.push(charName);
        continue;
      }

      try {
        const resp = await fetch(CHILD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId: pkg?.id,
            characterName: charName,
            characterDescription: description,
            characterIndex: 1, // not used for re-fires
            scriptType,
            hasAccomplice,
            mysteryType,
            // 2026-08-14: the original full-generation call (fired by
            // mystery-webhook-trigger) also sends conversationContent and
            // characterChatExcerpts, both missing here until now. Adding
            // conversationContent via mystery_packages.user_conversation --
            // a persisted proxy already used the same way in
            // regenerate-child-content (see its `conversationContent: pkg.
            // user_conversation ?? ""`). characterChatExcerpts is NOT
            // included: per ADR-0054, it is never persisted anywhere and is
            // "not recoverable post-hoc" -- recomputing it here would mean
            // duplicating mystery-webhook-trigger's alias-regex extraction
            // logic in a second place, an accepted gap this fix doesn't
            // reopen. Not proven to be the root cause of the identity-field
            // silent-blank-write bug (see ADR-0079 for a case where the
            // re-fire payload, missing both fields, still populated
            // identity fields successfully) -- this closes a confirmed
            // context gap regardless, cheaply and safely.
            conversationContent: pkg?.user_conversation ?? "",
          }),
        });
        if (resp.ok) {
          recovered.push(charName);
          budgetRemaining -= CHARACTER_REGEN_COST_USD;
          if (pkg?.id) {
            await supabase.from("auto_remediation_log").insert({
              package_id: pkg.id,
              defect_class: "empty_character_content",
              action: `regenerate_character:${charName}`,
              before_value: null,
              outcome: "escalated", // fire-and-forget; next sweep confirms fixed vs. still-broken
              cost_usd: CHARACTER_REGEN_COST_USD,
            });
          }
        } else {
          skipped.push(charName);
        }
      } catch (e) {
        console.error(`Auto-recovery webhook failed for ${charName}:`, e);
        skipped.push(charName);
      }
    }

    // Each list is independent (a package can have characters in more than one
    // bucket at once), so they render as separate rows rather than the old
    // recovered > skipped priority chain, which silently dropped whichever
    // list lost the ternary when both were non-empty.
    const recoveredHtml = recovered.length > 0
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280;">Auto-Recovery:</td>
          <td style="padding: 8px 0; color: #059669; font-weight: 600;">
            Re-fire webhook sent for: ${recovered.join(", ")}<br>
            <span style="font-size: 12px; font-weight: normal; color: #6b7280;">
              Allow ~3 minutes, then re-check. If still empty after recovery, manual intervention needed.
            </span>
          </td>
        </tr>`
      : "";
    const skippedHtml = skipped.length > 0
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280;">Auto-Recovery Skipped:</td>
          <td style="padding: 8px 0; color: #d97706;">
            No description available in extracted_characters: ${skipped.join(", ")}
          </td>
        </tr>`
      : "";
    const cappedHtml = capped.length > 0
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280;">Auto-Recovery Capped:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">
            ${capped.join(", ")}<br>
            <span style="font-size: 12px; font-weight: normal; color: #6b7280;">
              Hit the ${MAX_ATTEMPTS_PER_CHARACTER}-attempt cap or today's $${DAILY_SPEND_CAP_USD.toFixed(2)} shared spend cap. This needs manual intervention -- it will not retry itself.
            </span>
          </td>
        </tr>`
      : "";
    const recoveryHtml = recoveredHtml + skippedHtml + cappedHtml;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Generation Display Issue</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0;">A customer's mystery generation appears stuck or has display issues. The user has been shown a message that the team has been notified.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 160px;">Mystery Title:</td>
              <td style="padding: 8px 0; font-weight: 600;">${mysteryTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Customer Email:</td>
              <td style="padding: 8px 0;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Conversation ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${conversation_id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Generation Started:</td>
              <td style="padding: 8px 0;">${generationStarted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Characters:</td>
              <td style="padding: 8px 0;">${characterCount} generated / ${expectedCharacters} expected</td>
            </tr>
            ${emptyCharsHtml}
            ${recoveryHtml}
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Package Status:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 11px; word-break: break-all;">${packageStatus}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            Triggered: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
          </div>
        </div>
      </div>
    `;

    // Self-heal grace period (ADR-0065): give the auto-remediation worker
    // (ADR-0047/0061/0062, currently a 30-min full sweep) a real chance
    // before alerting a human — but only for defect classes it actually
    // knows how to attempt, and only for as long as needed: if it already
    // gave up (any escalated/failed attempt logged since needs_review_at),
    // alert immediately instead of waiting out the rest of the window.
    //
    // WORKER_RECOGNIZED_PREFIXES are generation_status.structuralDefects
    // prefixes (DB-side naming) the worker's detector RPCs cover. These
    // do NOT always match auto_remediation_log.defect_class 1:1
    // (self_directed_question vs self_directed_questions, identity_conflict
    // vs identity_contamination — see ADR-0056, a naming mismatch this
    // codebase has been bitten by more than once). Deliberately NOT
    // hand-mapping those labels here: the escalation check below matches
    // ANY escalated/failed row logged for the package, not a specific
    // class, precisely to avoid a second driftable name mapping. Defect
    // classes the worker has no handler for at all (error_body_in_package,
    // error_body_in_character, invalid_role, victim_is_playable_character)
    // are deliberately excluded from this list — nothing is coming to fix
    // those, so they alert immediately, same as before this change.
    const WORKER_RECOGNIZED_PREFIXES = [
      "meta_text_leak",
      "self_directed_question",
      "victim_mismatch",
      "identity_conflict",
      "slip_culprit_leak",
    ];
    const GRACE_PERIOD_MS = 35 * 60 * 1000; // one 30-min sweep (ADR-0062) + buffer

    const structuralDefects: string[] = pkg?.generation_status?.structuralDefects || [];
    const workerMightFixThis =
      structuralDefects.length > 0 &&
      structuralDefects.every((d) => WORKER_RECOGNIZED_PREFIXES.some((p) => d.startsWith(`${p}.`)));

    let readyToAlert = true; // default: nothing to wait for, alert as before
    if (workerMightFixThis && pkg?.needs_review_at) {
      const ageMs = Date.now() - new Date(pkg.needs_review_at).getTime();
      let hasGivenUp = false;
      if (pkg?.id) {
        const { data: escalations } = await supabase
          .from("auto_remediation_log")
          .select("id")
          .eq("package_id", pkg.id)
          .in("outcome", ["escalated", "failed"])
          .gt("created_at", pkg.needs_review_at)
          .limit(1);
        hasGivenUp = !!(escalations && escalations.length > 0);
      }
      readyToAlert = hasGivenUp || ageMs > GRACE_PERIOD_MS;
    }

    // Same idea as the worker grace period above, but for THIS function's own
    // empty-character re-fire (2026-08-13, corrected 2026-08-14 -- see
    // ADR-0085): don't page a human for a defect auto-recovery still has
    // budget left to keep working on. Suppresses whenever empty characters
    // are the ONLY issue (no structuralDefects also present -- something
    // else being wrong should still alert immediately) AND nothing has
    // landed in skipped/capped (a recovery attempt that couldn't even fire,
    // or already exhausted its MAX_ATTEMPTS_PER_CHARACTER cap, is the actual
    // "you need to look at this" signal). Deliberately does NOT alert merely
    // for being a repeat attempt (used > 0) -- ADR-0081 originally treated a
    // second try as a stronger signal of real trouble, but a same-day case
    // (Death At The Velvet Lounge, character needed 2 of its 2 allowed
    // attempts and still resolved cleanly with zero human action) showed
    // that heuristic just adds noise for ordinary variance in how many tries
    // a character needs. The cap itself already bounds the cost/time of
    // waiting this out (max 2 attempts, $0.15 each), so suppressing all the
    // way to the cap is safe. Mutually exclusive with workerMightFixThis by
    // construction (that one requires structuralDefects.length > 0, this one
    // requires it to be 0), so no ordering conflict between the two gates.
    const emptyCharacterRecoveryLooksClean =
      emptyCharacters.length > 0 &&
      structuralDefects.length === 0 &&
      skipped.length === 0 &&
      capped.length === 0;
    readyToAlert = readyToAlert && !emptyCharacterRecoveryLooksClean;

    // Email cooldown: skip the actual send if we've already alerted on this
    // package within the last 6 hours. Auto-recovery has already run above
    // either way, so this just prevents support-inbox flooding for persistent
    // failures (e.g. unrecoverable cases where recovery can't fix the issue).
    const COOLDOWN_HOURS = 6;
    const lastNotified = pkg?.last_notified_at ? new Date(pkg.last_notified_at) : null;
    const cooldownUntil = lastNotified
      ? new Date(lastNotified.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000)
      : null;
    const inCooldown = cooldownUntil ? cooldownUntil > new Date() : false;

    if (inCooldown || !readyToAlert) {
      const reason = inCooldown
        ? "cooldown"
        : emptyCharacterRecoveryLooksClean
          ? "awaiting_empty_character_recovery"
          : "awaiting_self_heal";
      console.log(`Email suppressed (${reason}) for package ${pkg?.id} — recovery was attempted (${recovered.length} chars) regardless`);
      return new Response(
        JSON.stringify({
          success: true,
          email_sent: false,
          email_suppressed_reason: reason,
          cooldown_until: cooldownUntil ? cooldownUntil.toISOString() : null,
          recovery_attempted: recovered,
          recovery_skipped: skipped,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker Alerts <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        subject: `🚨 Generation Issue - ${mysteryTitle} (${userEmail})`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} ${errorText}`);
    }

    // Stamp the cooldown timer so subsequent sweep cycles within 6h skip the email
    if (pkg?.id) {
      await supabase
        .from("mystery_packages")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", pkg.id);
    }

    console.log("Generation issue notification sent + cooldown stamped");

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: true,
        recovery_attempted: recovered,
        recovery_skipped: skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending generation issue notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
