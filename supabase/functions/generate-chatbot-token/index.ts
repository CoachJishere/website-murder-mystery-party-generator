
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

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the token from the request header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user's session
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Generating token for user:", user.id, user.email);

    // Get prompt type - free or paid based on whether they've purchased
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("has_purchased")
      .eq("id", user.id)
      .single();
    
    const isPaid = profileData?.has_purchased || false;
    
    // Generate JWT token for the chatbot with user metadata
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      source: "murder-mystery-party",
      promptType: isPaid ? "paid" : "free", 
      // Add an expiration time (e.g., 1 hour)
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    // Sign the token with HMAC-SHA256
    const tokenSecret = Deno.env.get('CHATBOT_TOKEN_SECRET');
    const encodedPayload = btoa(JSON.stringify(payload));
    let chatbotToken: string;

    if (tokenSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(tokenSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      chatbotToken = `${encodedPayload}.${signatureHex}`;
    } else {
      console.warn('CHATBOT_TOKEN_SECRET not configured - token will be unsigned');
      chatbotToken = encodedPayload;
    }
    
    // Get the correct chatbot URL based on environment
    const vercelChatbotUrl = "https://my-awesome-chatbot-nine-sand.vercel.app";

    return new Response(
      JSON.stringify({
        token: chatbotToken,
        url: `${vercelChatbotUrl}?token=${chatbotToken}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate token" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
