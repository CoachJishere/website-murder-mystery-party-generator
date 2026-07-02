export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    console.log('Generation complete callback received');
    
    const payload = await req.json();
    console.log('Callback payload:', JSON.stringify(payload, null, 2));

    const { conversationId, data } = payload;

    if (!conversationId) {
      console.error('Missing conversationId in callback payload');
      return new Response(JSON.stringify({ error: 'Missing conversationId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Dynamic import of Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`Updating mystery package for conversation: ${conversationId}`);

    // Fetch extracted_characters to validate character count
    const { data: packageRecord } = await supabase
      .from('mystery_packages')
      .select('extracted_characters')
      .eq('conversation_id', conversationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let expectedCharacterCount = 0;
    if (packageRecord?.extracted_characters) {
      try {
        const extracted = typeof packageRecord.extracted_characters === 'string'
          ? JSON.parse(packageRecord.extracted_characters)
          : packageRecord.extracted_characters;
        expectedCharacterCount = Array.isArray(extracted) ? extracted.length : 0;
      } catch { /* ignore parse errors */ }
    }

    // Cross-validate against player_count from conversations table
    // (also pull title so we can fall back to it if Make.com sends a raw one)
    const { data: convRecord } = await supabase
      .from('conversations')
      .select('player_count, title')
      .eq('id', conversationId)
      .maybeSingle();
    const playerCount = convRecord?.player_count || 0;
    const minFromPlayerCount = playerCount > 0 ? playerCount - 2 : 0; // inspector + flexibility
    const effectiveExpected = Math.max(expectedCharacterCount, minFromPlayerCount);

    const incomingCharacterCount = Array.isArray(data?.characters) ? data.characters.length : 0;
    const allCharactersPresent = effectiveExpected === 0 || incomingCharacterCount >= effectiveExpected;

    if (effectiveExpected !== expectedCharacterCount) {
      console.log(`Player count cross-validation: extracted expects ${expectedCharacterCount}, player_count expects ${minFromPlayerCount}, using ${effectiveExpected}`);
    }

    console.log(`Character count check: ${incomingCharacterCount} incoming, ${expectedCharacterCount} expected, complete: ${allCharactersPresent}`);

    const generationStatus = allCharactersPresent
      ? { status: 'completed', progress: 100, currentStep: 'Package generation completed successfully' }
      : { status: 'in_progress', progress: Math.round((incomingCharacterCount / expectedCharacterCount) * 90), currentStep: `Generated ${incomingCharacterCount} of ${expectedCharacterCount} characters` };

    // Resolve the package title. Make.com sometimes returns the raw customer theme
    // ("<theme> - N Players") or a bare "Mystery" placeholder instead of the AI's
    // concept title. The client now captures the real AI title into
    // conversations.title, so prefer a good Make.com title but fall back to the DB
    // title when Make's looks raw. (See ADR-0028.)
    const isRawTitle = (t) => {
      if (!t || !String(t).trim()) return true;
      const s = String(t).trim();
      return / - \d+ players?$/i.test(s) || /^(untitled|new mystery)/i.test(s) || /^mystery$/i.test(s);
    };
    const resolvedTitle = !isRawTitle(data?.title)
      ? data.title
      : (!isRawTitle(convRecord?.title) ? convRecord.title : (data?.title || convRecord?.title || null));

    // Update the mystery package with status based on character completeness
    const updateData = {
      title: resolvedTitle,
      game_overview: data?.gameOverview || null,
      host_guide: data?.hostGuide || null,
      materials: data?.materials || null,
      preparation_instructions: data?.preparation || null,
      timeline: data?.timeline || null,
      hosting_tips: data?.hostingTips || null,
      evidence_cards: data?.evidenceCards ? JSON.stringify(data.evidenceCards) : null,
      relationship_matrix: data?.relationshipMatrix ? JSON.stringify(data.relationshipMatrix) : null,
      detective_script: data?.detectiveScript || null,
      generation_status: generationStatus,
      updated_at: new Date().toISOString()
    };

    if (allCharactersPresent) {
      updateData.generation_completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('mystery_packages')
      .update(updateData)
      .eq('conversation_id', conversationId);

    if (updateError) {
      console.error('Error updating mystery package:', updateError);
      return new Response(JSON.stringify({ error: 'Database update failed' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('Mystery package updated successfully');

    // Update conversation status
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({
        needs_package_generation: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      // Don't fail the entire request for this
    }

    console.log(`Successfully completed callback processing for conversation: ${conversationId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in generation-complete callback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
