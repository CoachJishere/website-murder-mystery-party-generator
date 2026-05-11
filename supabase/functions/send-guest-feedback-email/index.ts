import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type Locale, normalizeLocale, pickByLocale } from "../_shared/email-i18n.ts";

/**
 * Edge Function: send-guest-feedback-email
 *
 * Called by the daily pg_cron job to send feedback request emails
 * to guests 14 days after their character profile was sent. The email is
 * rendered in the HOST's preferred language (profiles.language) — guests
 * don't have accounts, so we follow the host's locale they originally got
 * the character email in.
 *
 * Expects POST with: { assignment_id: string }
 * Or POST with: { batch: true } to process all eligible assignments.
 */

interface FeedbackStrings {
  subject: (title: string) => string;
  greeting: (name: string) => string;
  body: (character: string, title: string) => string;
  ratingPrompt: string;
  tapHint: string;
  cta: string;
  footer: string;
}

const T: Record<Locale, FeedbackStrings> = {
  en: {
    subject: (t) => `How was ${t}?`,
    greeting: (n) => `Hi ${n},`,
    body: (c, t) => `You recently played <strong style="color: #F5F0E8;">${c}</strong> in <strong style="color: #F5F0E8;">${t}</strong>. We hope you had a great time!`,
    ratingPrompt: 'How was your experience?',
    tapHint: 'Tap a star to rate',
    cta: 'Leave Feedback',
    footer: "This is a one-time email about your recent mystery experience. You won't receive any other emails from us.",
  },
  es: {
    subject: (t) => `¿Qué tal fue ${t}?`,
    greeting: (n) => `Hola ${n}:`,
    body: (c, t) => `Hace poco interpretaste a <strong style="color: #F5F0E8;">${c}</strong> en <strong style="color: #F5F0E8;">${t}</strong>. ¡Esperamos que lo pasaras genial!`,
    ratingPrompt: '¿Qué tal la experiencia?',
    tapHint: 'Toca una estrella para puntuar',
    cta: 'Dejar opinión',
    footer: 'Este es un correo único sobre tu experiencia reciente con el misterio. No recibirás más correos nuestros.',
  },
  fr: {
    subject: (t) => `Comment s'est passé ${t} ?`,
    greeting: (n) => `Bonjour ${n},`,
    body: (c, t) => `Vous avez récemment incarné <strong style="color: #F5F0E8;">${c}</strong> dans <strong style="color: #F5F0E8;">${t}</strong>. Nous espérons que vous avez passé un excellent moment !`,
    ratingPrompt: 'Comment avez-vous trouvé la soirée ?',
    tapHint: 'Touchez une étoile pour noter',
    cta: 'Laisser un avis',
    footer: 'Ceci est un e-mail unique au sujet de votre récente expérience mystère. Vous ne recevrez aucun autre e-mail de notre part.',
  },
  de: {
    subject: (t) => `Wie war ${t}?`,
    greeting: (n) => `Hallo ${n},`,
    body: (c, t) => `Du hast vor Kurzem <strong style="color: #F5F0E8;">${c}</strong> in <strong style="color: #F5F0E8;">${t}</strong> gespielt. Wir hoffen, du hattest viel Spaß!`,
    ratingPrompt: 'Wie war dein Erlebnis?',
    tapHint: 'Tippe auf einen Stern',
    cta: 'Feedback geben',
    footer: 'Das ist eine einmalige E-Mail zu deinem Krimi-Erlebnis. Weitere E-Mails bekommst du von uns nicht.',
  },
  it: {
    subject: (t) => `Com'è andato ${t}?`,
    greeting: (n) => `Ciao ${n},`,
    body: (c, t) => `Hai interpretato di recente <strong style="color: #F5F0E8;">${c}</strong> in <strong style="color: #F5F0E8;">${t}</strong>. Speriamo che ti sia divertito un sacco!`,
    ratingPrompt: "Com'è stata l'esperienza?",
    tapHint: 'Tocca una stella per votare',
    cta: 'Lascia un feedback',
    footer: 'Questa è un\'email una tantum sulla tua recente esperienza mystery. Non riceverai altre email da parte nostra.',
  },
  pt: {
    subject: (t) => `Como foi ${t}?`,
    greeting: (n) => `Olá, ${n}!`,
    body: (c, t) => `Você interpretou recentemente <strong style="color: #F5F0E8;">${c}</strong> em <strong style="color: #F5F0E8;">${t}</strong>. Esperamos que tenha sido incrível!`,
    ratingPrompt: 'Como foi sua experiência?',
    tapHint: 'Toque em uma estrela para avaliar',
    cta: 'Enviar avaliação',
    footer: 'Este é um e-mail único sobre sua experiência recente. Você não vai receber mais e-mails nossos.',
  },
  nl: {
    subject: (t) => `Hoe was ${t}?`,
    greeting: (n) => `Hi ${n},`,
    body: (c, t) => `Je hebt onlangs <strong style="color: #F5F0E8;">${c}</strong> gespeeld in <strong style="color: #F5F0E8;">${t}</strong>. Hopelijk had je een topavond!`,
    ratingPrompt: 'Hoe was je ervaring?',
    tapHint: 'Tik op een ster om te beoordelen',
    cta: 'Feedback geven',
    footer: 'Dit is een eenmalig mailtje over je recente mystery-ervaring. Verdere mails krijg je niet van ons.',
  },
  da: {
    subject: (t) => `Hvordan gik ${t}?`,
    greeting: (n) => `Hej ${n}`,
    body: (c, t) => `Du spillede for nylig <strong style="color: #F5F0E8;">${c}</strong> i <strong style="color: #F5F0E8;">${t}</strong>. Vi håber, du havde en fantastisk aften!`,
    ratingPrompt: 'Hvordan var oplevelsen?',
    tapHint: 'Tryk på en stjerne for at vurdere',
    cta: 'Giv feedback',
    footer: 'Dette er en engangsmail om din mysterieoplevelse. Du modtager ikke flere mails fra os.',
  },
  sv: {
    subject: (t) => `Hur gick ${t}?`,
    greeting: (n) => `Hej ${n}!`,
    body: (c, t) => `Du spelade nyligen <strong style="color: #F5F0E8;">${c}</strong> i <strong style="color: #F5F0E8;">${t}</strong>. Vi hoppas att det var en kanonkväll!`,
    ratingPrompt: 'Hur var upplevelsen?',
    tapHint: 'Tryck på en stjärna för att betygsätta',
    cta: 'Lämna feedback',
    footer: 'Det här är ett engångsmejl om din mysterieupplevelse. Du kommer inte att få fler mejl från oss.',
  },
  fi: {
    subject: (t) => `Miten ${t} sujui?`,
    greeting: (n) => `Hei ${n},`,
    body: (c, t) => `Esitit hiljattain hahmoa <strong style="color: #F5F0E8;">${c}</strong> mysteerissä <strong style="color: #F5F0E8;">${t}</strong>. Toivottavasti pidit illasta!`,
    ratingPrompt: 'Millainen kokemus oli?',
    tapHint: 'Anna arvio koskettamalla tähteä',
    cta: 'Anna palautetta',
    footer: 'Tämä on kertaluonteinen viesti mysteerikokemuksestasi. Et saa meiltä muita viestejä.',
  },
  ko: {
    subject: (t) => `${t}는 어땠나요?`,
    greeting: (n) => `${n}님, 안녕하세요.`,
    body: (c, t) => `최근에 <strong style="color: #F5F0E8;">${t}</strong>에서 <strong style="color: #F5F0E8;">${c}</strong> 역을 맡으셨죠. 즐거운 시간이 되셨길 바랍니다!`,
    ratingPrompt: '경험은 어떠셨나요?',
    tapHint: '별을 눌러 평가해 주세요',
    cta: '의견 남기기',
    footer: '이번 미스터리 경험에 관한 일회성 안내 이메일입니다. 이후 다른 이메일은 보내드리지 않습니다.',
  },
  ja: {
    subject: (t) => `『${t}』はいかがでしたか？`,
    greeting: (n) => `${n}さん、こんにちは。`,
    body: (c, t) => `先日、『<strong style="color: #F5F0E8;">${t}</strong>』で <strong style="color: #F5F0E8;">${c}</strong> を演じてくださいました。楽しんでいただけていれば幸いです！`,
    ratingPrompt: 'ご感想はいかがでしたか？',
    tapHint: '星をタップして評価してください',
    cta: '感想を送る',
    footer: 'これは今回のミステリー体験に関する1回限りのメールです。これ以外のメールをお送りすることはありません。',
  },
  'zh-cn': {
    subject: (t) => `《${t}》玩得怎么样？`,
    greeting: (n) => `${n}，你好：`,
    body: (c, t) => `你最近在 <strong style="color: #F5F0E8;">${t}</strong> 中扮演了 <strong style="color: #F5F0E8;">${c}</strong>。希望你那晚玩得尽兴！`,
    ratingPrompt: '体验如何？',
    tapHint: '点一颗星来评分',
    cta: '提交反馈',
    footer: '这是关于本次谜案体验的一次性邮件，我们不会再发送其他邮件给你。',
  },
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();

    let assignments: any[] = [];

    if (body.batch) {
      // Batch mode: find all eligible assignments (14+ days since sent, no feedback email yet)
      const { data, error } = await supabase
        .from("character_assignments")
        .select(`
          id,
          guest_name,
          guest_email,
          access_token,
          mystery_id,
          mystery_characters!inner (
            character_name,
            package_id
          )
        `)
        .eq("is_sent", true)
        .is("feedback_email_sent_at", null)
        .lt("sent_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      assignments = data || [];

      // Filter out assignments where the conversation is unsubscribed
      if (assignments.length > 0) {
        const packageIds = [...new Set(assignments.map((a: any) => a.mystery_characters.package_id))];

        const { data: packages } = await supabase
          .from("mystery_packages")
          .select("id, conversation_id")
          .in("id", packageIds);

        if (packages) {
          const conversationIds = [...new Set(packages.map(p => p.conversation_id))];

          const { data: unsubscribed } = await supabase
            .from("conversations")
            .select("id")
            .in("id", conversationIds)
            .eq("unsubscribed_from_followups", true);

          if (unsubscribed && unsubscribed.length > 0) {
            const unsubConvoIds = new Set(unsubscribed.map(u => u.id));
            const unsubPackageIds = new Set(
              packages.filter(p => unsubConvoIds.has(p.conversation_id)).map(p => p.id)
            );
            assignments = assignments.filter(
              (a: any) => !unsubPackageIds.has(a.mystery_characters.package_id)
            );
          }
        }

        // Also filter out assignments that already have guest feedback
        const assignmentIds = assignments.map((a: any) => a.id);
        const { data: existingFeedback } = await supabase
          .from("guest_feedback")
          .select("character_assignment_id")
          .in("character_assignment_id", assignmentIds);

        if (existingFeedback && existingFeedback.length > 0) {
          const feedbackIds = new Set(existingFeedback.map(f => f.character_assignment_id));
          assignments = assignments.filter((a: any) => !feedbackIds.has(a.id));
        }
      }
    } else if (body.assignment_id) {
      // Single assignment mode
      const { data, error } = await supabase
        .from("character_assignments")
        .select(`
          id,
          guest_name,
          guest_email,
          access_token,
          mystery_id,
          mystery_characters!inner (
            character_name,
            package_id
          )
        `)
        .eq("id", body.assignment_id)
        .single();

      if (error) throw error;
      if (data) assignments = [data];
    }

    if (assignments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No eligible assignments" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve mystery title + host language for each assignment.
    // mystery_id on character_assignments is the conversation_id (verified).
    const conversationIds = [...new Set(assignments.map((a: any) => a.mystery_id))];
    const { data: convos } = await supabase
      .from("conversations")
      .select("id, title, user_id")
      .in("id", conversationIds);

    const titleByConvo: Record<string, string> = {};
    const hostIdByConvo: Record<string, string> = {};
    const hostIds = new Set<string>();
    if (convos) {
      for (const c of convos) {
        titleByConvo[c.id] = c.title || "Your Mystery";
        if (c.user_id) {
          hostIdByConvo[c.id] = c.user_id;
          hostIds.add(c.user_id);
        }
      }
    }

    const langByHost: Record<string, Locale> = {};
    if (hostIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, language")
        .in("id", [...hostIds]);
      if (profs) {
        for (const p of profs) {
          langByHost[p.id] = normalizeLocale(p.language);
        }
      }
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const assignment of assignments) {
      const character = assignment.mystery_characters;
      const mysteryTitle = titleByConvo[assignment.mystery_id] || "Your Mystery";
      const hostId = hostIdByConvo[assignment.mystery_id];
      const locale: Locale = (hostId && langByHost[hostId]) || 'en';
      const t = pickByLocale(T, locale);
      const feedbackUrl = `https://www.mysterymaker.party/guest-feedback/${assignment.access_token}`;

      try {
        const htmlBody = buildEmailHtml(
          locale,
          t,
          assignment.guest_name,
          character.character_name,
          mysteryTitle,
          feedbackUrl
        );

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [assignment.guest_email],
            subject: t.subject(mysteryTitle),
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          errors.push(`${assignment.id}: Resend error ${resendResponse.status}`);
          console.error(`Failed to send to ${assignment.id}:`, errorText);
          continue;
        }

        // Mark as sent
        await supabase
          .from("character_assignments")
          .update({ feedback_email_sent_at: new Date().toISOString() })
          .eq("id", assignment.id);

        sentCount++;
      } catch (err) {
        errors.push(`${assignment.id}: ${err.message}`);
        console.error(`Error processing ${assignment.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: assignments.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-guest-feedback-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml(
  locale: Locale,
  t: FeedbackStrings,
  guestName: string,
  characterName: string,
  mysteryTitle: string,
  feedbackUrl: string
): string {
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<a href="${feedbackUrl}?rating=${n}" style="text-decoration: none; font-size: 28px; padding: 0 2px;">` +
        `<span style="color: #f59e0b;">${n <= 3 ? "★" : "☆"}</span></a>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">${t.greeting(guestName)}</p>

    <p style="color: rgba(245,240,232,0.7); margin-bottom: 24px;">
      ${t.body(characterName, mysteryTitle)}
    </p>

    <div style="background: #000000; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: rgba(245,240,232,0.7); margin: 0 0 12px 0; font-size: 15px;">${t.ratingPrompt}</p>
      <div style="font-size: 0;">
        ${stars}
      </div>
      <p style="color: rgba(245,240,232,0.4); margin: 12px 0 0 0; font-size: 13px;">${t.tapHint}</p>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${feedbackUrl}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">${t.cta}</a>
    </div>

    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      ${t.footer}
    </p>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}
