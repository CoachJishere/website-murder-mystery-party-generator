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

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Detective-style mysteries populate the unified columns (round{2,3,4}_script, final_statement).
// Character-based mysteries populate per-role variants (round{2,3,4}_{innocent,guilty,accomplice},
// final_{innocent,guilty,accomplice}). Either set may be present; the summarizer reads whatever
// is non-empty and writes the matching `*_pointform` column.
const SHARED_FIELDS = ['introduction', 'rumors', 'accusations'] as const;
const UNIFIED_FIELDS = ['round2_script', 'round3_script', 'round4_script', 'final_statement'] as const;
const ROLE_VARIANT_FIELDS = [
  'round2_innocent', 'round2_guilty', 'round2_accomplice',
  'round3_innocent', 'round3_guilty', 'round3_accomplice',
  'round4_innocent', 'round4_guilty', 'round4_accomplice',
  'final_innocent',  'final_guilty',  'final_accomplice',
] as const;
// ADR-0065: the guilty/accomplice confession, read only during The Reveal — distinct from
// final_guilty/final_accomplice, which are now Final-Statements-round denials. No innocent
// counterpart: innocent characters are never called on to confess.
// Summarized in a separate Sonnet 5 call (see REVEAL_MODEL below) — on Haiku 4.5 this field
// was silently dropped from the batch JSON response ~93% of the time across 13 live packages
// (found during the 2026-08-31 coherence sweep on "The Workshop Of St. Nick"), the same
// confession-content instruction-following gap ADR-0074 found and fixed for a sibling call.
const REVEAL_FIELDS = ['reveal_confession_guilty', 'reveal_confession_accomplice'] as const;
const MAIN_FIELDS = [...SHARED_FIELDS, ...UNIFIED_FIELDS, ...ROLE_VARIANT_FIELDS] as const;
const SOURCE_FIELDS = [...MAIN_FIELDS, ...REVEAL_FIELDS] as const;

const MAIN_MODEL = 'claude-haiku-4-5-20251001';
const REVEAL_MODEL = 'claude-sonnet-5';

type SourceField = typeof SOURCE_FIELDS[number];

const SUMMARIZER_SYSTEM_PROMPT = `You are summarizing character-guide fields from a murder mystery party game into point-form bullets. The host or player chose to see "both" formats — they will read the detailed prose AND your bullets together. Your bullets are tactical reminders, not a replacement for the prose.

For each input field that has content, produce 4-7 bullets:
- Each bullet starts with "- " (markdown bullet)
- Maximum 20 words per bullet
- Capture every key tactical move, accusation, alibi, deflection, or revelation in the prose
- Use imperative voice when the field is about what the player should DO ("Deny stealing the ledger", "Mention seeing X near the office")
- Use declarative voice when the field is about what the player should KNOW ("You were in the kitchen at 11:30")
- No quoted dialogue inside bullets
- No nested headers or sub-bullets
- Strip any "## ROUND N: TOPIC" or section headers from the bullets — those are display chrome

For any source field whose value is "NULL" (or otherwise empty), return null for the corresponding output key.

Output format: a single valid JSON object with one key per source field, named "<field>_pointform", no markdown wrapper, no commentary. The user prompt will list the exact source fields present for this character — return one "<field>_pointform" key for each. Fields you may see (only those with content will be present in this character):

  Shared:        introduction, rumors, accusations
  Detective:     round2_script, round3_script, round4_script, final_statement
  Character-based: round{2,3,4}_innocent, round{2,3,4}_guilty, round{2,3,4}_accomplice, final_innocent, final_guilty, final_accomplice, reveal_confession_guilty, reveal_confession_accomplice

Example output for a character with mixed populated fields:
{
  "introduction_pointform": "- bullet 1\\n- bullet 2\\n- bullet 3",
  "rumors_pointform": "- bullet 1\\n- bullet 2",
  "accusations_pointform": null,
  "round2_innocent_pointform": "- bullet 1\\n- bullet 2",
  "round2_guilty_pointform": "- bullet 1\\n- bullet 2",
  "round2_accomplice_pointform": null
}

Use SINGLE QUOTES for any quoted text within bullet content. Never include unescaped double quotes inside string values — they break JSON parsing.`;

/** Escape raw control-character bytes (literal newline/tab/CR) that appear inside a JSON
 *  string literal, leaving everything outside strings untouched. Ported from
 *  regenerate-child-content/index.ts (ADR-0103 Addendum 5 lineage) — the bullet-point output
 *  here is exactly the shape that trips this: multiple bullets joined by \n inside one JSON
 *  string value, and Sonnet 5 (now used for REVEAL_FIELDS) occasionally emits a literal
 *  newline there instead of the escaped \n the JSON spec requires. */
function escapeControlCharsInStrings(s: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === "\\") { out += ch; escaped = true; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function buildUserPrompt(
  character: Record<string, any>,
  fields: readonly SourceField[],
): { prompt: string; populatedFields: SourceField[] } {
  const populatedFields: SourceField[] = [];
  const blocks: string[] = [
    `CHARACTER: ${character.character_name}`,
    `ROLE: ${character.character_role || 'unknown'}`,
    '',
    'Summarize each of the following fields into point-form bullets per the system instructions.',
    'Return one JSON key per field listed below, named "<field>_pointform".',
    '',
  ];
  for (const field of fields) {
    const val = character[field];
    if (val && String(val).trim()) {
      populatedFields.push(field);
      blocks.push(`<${field}>`);
      blocks.push(String(val));
      blocks.push(`</${field}>`);
      blocks.push('');
    }
  }
  return { prompt: blocks.join('\n'), populatedFields };
}

async function summarizeFields(
  character: Record<string, any>,
  apiKey: string,
  fields: readonly SourceField[],
  model: string,
): Promise<Record<string, string | null>> {
  const { prompt: userPrompt, populatedFields } = buildUserPrompt(character, fields);

  // No populated fields → nothing to summarize. Return empty update.
  if (populatedFields.length === 0) {
    return {};
  }

  // Sonnet 5 rejects any non-default sampling parameter (e.g. temperature) with a 400,
  // and needs thinking explicitly disabled or content[0] comes back as a non-text block
  // (data.content?.[0]?.text undefined) — ADR-0074 landmine, already hit and fixed in
  // regenerate-child-content/index.ts for the same reason.
  const isSonnet = model.startsWith('claude-sonnet') || model.startsWith('claude-opus');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      ...(isSonnet ? { thinking: { type: 'disabled' } } : { temperature: 0.5 }),
      system: SUMMARIZER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('No content in Anthropic response');

  const cleaned = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
  let parsed: Record<string, string | null>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = JSON.parse(escapeControlCharsInStrings(cleaned));
    } catch (e) {
      throw new Error(`Failed to parse summarizer JSON for ${character.character_name}: ${e.message}\n--- raw ---\n${text.slice(0, 500)}`);
    }
  }

  // Only write pointform columns for fields that were actually populated in the input.
  // This keeps the summarizer additive — it never clears existing pointform data
  // for fields that happen to be empty on this character.
  const update: Record<string, string | null> = {};
  for (const field of populatedFields) {
    const key = `${field}_pointform`;
    update[key] = parsed[key] ?? null;
  }
  return update;
}

async function summarizeCharacter(character: Record<string, any>, apiKey: string) {
  // Two calls: the bulk of the fields on Haiku, and the Reveal confession fields on Sonnet 5
  // (see REVEAL_FIELDS comment — Haiku silently drops confession-content bullets often enough
  // that it needs the stronger model, mirroring ADR-0074's fix for the sibling generation call).
  const [mainUpdate, revealUpdate] = await Promise.all([
    summarizeFields(character, apiKey, MAIN_FIELDS, MAIN_MODEL),
    summarizeFields(character, apiKey, REVEAL_FIELDS, REVEAL_MODEL),
  ]);
  return { ...mainUpdate, ...revealUpdate };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageId, characterIds, characterName } = await req.json();
    if (!packageId) {
      return new Response(JSON.stringify({ error: 'packageId is required' }), {
        status: 400, headers: responseHeaders,
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    let query = supabase
      .from('mystery_characters')
      .select(['id', 'character_name', 'character_role', ...SOURCE_FIELDS].join(', '))
      .eq('package_id', packageId);
    // Filter by either id (from a previous module's output) or character_name (from the webhook input).
    // Make.com's Supabase upsert doesn't always return the inserted row's id, so character_name is
    // the more reliable single-character target.
    if (Array.isArray(characterIds) && characterIds.length > 0) {
      query = query.in('id', characterIds);
    } else if (characterName) {
      query = query.eq('character_name', characterName);
    }

    const { data: characters, error } = await query;
    if (error) throw new Error(`Supabase select error: ${error.message}`);
    if (!characters || characters.length === 0) {
      return new Response(JSON.stringify({ error: 'No characters found' }), {
        status: 404, headers: responseHeaders,
      });
    }

    const results: { character_name: string; status: string; error?: string }[] = [];

    for (const char of characters) {
      try {
        const update = await summarizeCharacter(char, apiKey);
        const { error: upErr } = await supabase
          .from('mystery_characters')
          .update(update)
          .eq('id', char.id);
        if (upErr) throw new Error(`Update failed: ${upErr.message}`);
        results.push({ character_name: char.character_name, status: 'ok' });
      } catch (e) {
        console.error(`Failed for ${char.character_name}:`, e.message);
        results.push({
          character_name: char.character_name,
          status: 'error',
          error: e.message,
        });
      }
    }

    return new Response(JSON.stringify({
      packageId,
      total: characters.length,
      ok: results.filter(r => r.status === 'ok').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    }), { headers: responseHeaders });

  } catch (error) {
    console.error('Error in generate-pointform-summaries:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: responseHeaders,
    });
  }
});
