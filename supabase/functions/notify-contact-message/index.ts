import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type Locale, normalizeLocale, pickByLocale } from "../_shared/email-i18n.ts";

// Edge Function: notify-contact-message
//
// Triggered by the on_contact_message_insert DB trigger after a row is
// inserted into contact_messages. Sends two emails:
//   1. Support notification → support@mysterymaker.party (English)
//   2. Localized auto-reply to the submitter so they have a confirmation
//      and a record of what they sent.
//
// See docs/adr/0002-contact-form-architecture.md for rationale.
// Failures of either email are logged but do not roll back the row —
// the message is durably stored in contact_messages regardless.

interface AutoReplyStrings {
  subject: string;
  greeting: (name: string) => string;
  body: string;
  yourMessageLabel: string;
  yourSubjectLabel: string;
  signoff: string;
  footer: string;
}

const T: Record<Locale, AutoReplyStrings> = {
  en: {
    subject: "We got your message",
    greeting: (n) => `Hi ${n},`,
    body: "Thanks for reaching out. We've received your message and will reply within 1–2 business days. A copy of what you sent is below for your records.",
    yourSubjectLabel: "Subject",
    yourMessageLabel: "Your message",
    signoff: "— Mystery Maker support",
    footer: "This is an automatic confirmation. Reply to this email to add anything to your message.",
  },
  es: {
    subject: "Hemos recibido tu mensaje",
    greeting: (n) => `Hola ${n}:`,
    body: "Gracias por escribirnos. Hemos recibido tu mensaje y te responderemos en 1 o 2 días laborables. Abajo tienes una copia de lo que enviaste.",
    yourSubjectLabel: "Asunto",
    yourMessageLabel: "Tu mensaje",
    signoff: "— Equipo de Mystery Maker",
    footer: "Esta es una confirmación automática. Responde a este correo si quieres añadir algo.",
  },
  fr: {
    subject: "Nous avons bien reçu votre message",
    greeting: (n) => `Bonjour ${n},`,
    body: "Merci de nous avoir contactés. Nous avons bien reçu votre message et vous répondrons sous 1 à 2 jours ouvrés. Une copie de votre envoi figure ci-dessous.",
    yourSubjectLabel: "Objet",
    yourMessageLabel: "Votre message",
    signoff: "— L'équipe Mystery Maker",
    footer: "Ceci est une confirmation automatique. Répondez à cet e-mail pour ajouter quelque chose.",
  },
  de: {
    subject: "Wir haben deine Nachricht erhalten",
    greeting: (n) => `Hallo ${n},`,
    body: "Danke für deine Nachricht. Wir haben sie erhalten und melden uns innerhalb von 1–2 Werktagen. Eine Kopie deiner Nachricht findest du unten.",
    yourSubjectLabel: "Betreff",
    yourMessageLabel: "Deine Nachricht",
    signoff: "— Das Mystery-Maker-Team",
    footer: "Das ist eine automatische Bestätigung. Antworte einfach auf diese E-Mail, falls du noch etwas ergänzen möchtest.",
  },
  it: {
    subject: "Abbiamo ricevuto il tuo messaggio",
    greeting: (n) => `Ciao ${n},`,
    body: "Grazie per averci scritto. Abbiamo ricevuto il tuo messaggio e ti risponderemo entro 1–2 giorni lavorativi. Qui sotto trovi una copia di quello che hai inviato.",
    yourSubjectLabel: "Oggetto",
    yourMessageLabel: "Il tuo messaggio",
    signoff: "— Il team di Mystery Maker",
    footer: "Questa è una conferma automatica. Rispondi a questa email se vuoi aggiungere qualcosa.",
  },
  pt: {
    subject: "Recebemos a sua mensagem",
    greeting: (n) => `Olá, ${n}!`,
    body: "Obrigado pelo contato. Recebemos a sua mensagem e responderemos em 1 a 2 dias úteis. Abaixo segue uma cópia do que você enviou.",
    yourSubjectLabel: "Assunto",
    yourMessageLabel: "Sua mensagem",
    signoff: "— Equipe Mystery Maker",
    footer: "Esta é uma confirmação automática. Responda a este e-mail se quiser adicionar algo.",
  },
  nl: {
    subject: "We hebben je bericht ontvangen",
    greeting: (n) => `Hi ${n},`,
    body: "Bedankt voor je bericht. We hebben het ontvangen en reageren binnen 1–2 werkdagen. Hieronder vind je een kopie van wat je hebt gestuurd.",
    yourSubjectLabel: "Onderwerp",
    yourMessageLabel: "Je bericht",
    signoff: "— Mystery Maker-team",
    footer: "Dit is een automatische bevestiging. Reageer op deze mail als je nog iets wilt toevoegen.",
  },
  da: {
    subject: "Vi har modtaget din besked",
    greeting: (n) => `Hej ${n}`,
    body: "Tak for din besked. Vi har modtaget den og vender tilbage inden for 1–2 hverdage. Du finder en kopi af det, du sendte, herunder.",
    yourSubjectLabel: "Emne",
    yourMessageLabel: "Din besked",
    signoff: "— Mystery Maker-teamet",
    footer: "Dette er en automatisk bekræftelse. Svar på denne mail, hvis du vil tilføje noget.",
  },
  sv: {
    subject: "Vi har fått ditt meddelande",
    greeting: (n) => `Hej ${n}!`,
    body: "Tack för att du hör av dig. Vi har tagit emot ditt meddelande och svarar inom 1–2 arbetsdagar. En kopia av det du skickade finns nedan.",
    yourSubjectLabel: "Ämne",
    yourMessageLabel: "Ditt meddelande",
    signoff: "— Mystery Maker-teamet",
    footer: "Det här är en automatisk bekräftelse. Svara på det här mejlet om du vill lägga till något.",
  },
  fi: {
    subject: "Viestisi on perillä",
    greeting: (n) => `Hei ${n},`,
    body: "Kiitos viestistäsi. Olemme vastaanottaneet sen ja vastaamme 1–2 arkipäivän kuluessa. Lähettämäsi viesti löytyy alta.",
    yourSubjectLabel: "Aihe",
    yourMessageLabel: "Viestisi",
    signoff: "— Mystery Maker -tiimi",
    footer: "Tämä on automaattinen vahvistus. Vastaa tähän viestiin, jos haluat lisätä jotain.",
  },
  ko: {
    subject: "메시지를 받았습니다",
    greeting: (n) => `${n}님, 안녕하세요.`,
    body: "문의해 주셔서 감사합니다. 보내주신 메시지를 받았으며 영업일 기준 1~2일 안에 답변드리겠습니다. 보내신 내용 사본은 아래에 있습니다.",
    yourSubjectLabel: "제목",
    yourMessageLabel: "보내신 메시지",
    signoff: "— Mystery Maker 지원팀",
    footer: "이 메일은 자동 발송된 확인 메일입니다. 추가로 전하실 내용이 있으면 이 메일에 회신해 주세요.",
  },
  ja: {
    subject: "メッセージを受け取りました",
    greeting: (n) => `${n}さん、こんにちは。`,
    body: "ご連絡ありがとうございます。メッセージを確かに受け取りました。営業日2日以内にご返信いたします。お送りいただいた内容は下記に控えています。",
    yourSubjectLabel: "件名",
    yourMessageLabel: "お送りいただいた内容",
    signoff: "— Mystery Maker サポートチーム",
    footer: "これは自動返信メールです。追記がある場合はこのメールに返信してください。",
  },
  'zh-cn': {
    subject: "我们已收到你的消息",
    greeting: (n) => `${n}，你好：`,
    body: "感谢你的来信。我们已经收到你的消息，会在 1–2 个工作日内回复。下方附上你发送的内容副本。",
    yourSubjectLabel: "主题",
    yourMessageLabel: "你发送的内容",
    signoff: "— Mystery Maker 客服团队",
    footer: "这是一封自动确认邮件。如需补充，请直接回复此邮件。",
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

async function sendEmail(
  resendApiKey: string,
  payload: { from: string; to: string[]; reply_to?: string; subject: string; html: string },
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error: ${res.status} ${text}`);
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record) {
      throw new Error("No record in webhook payload");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const name = String(record.name ?? "");
    const email = String(record.email ?? "");
    const subject = String(record.subject ?? "");
    const message = String(record.message ?? "");
    const language = String(record.language ?? "en");
    const userId: string | null = record.user_id ?? null;
    const createdAt = record.created_at ?? new Date().toISOString();
    const id = record.id ?? "(unknown)";

    // 1) Internal support email — English. Mirrors notify-feedback styling.
    const supportHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New contact form message</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">From:</td>
              <td style="padding: 8px 0;"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Subject:</td>
              <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(subject)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Language:</td>
              <td style="padding: 8px 0;">${escapeHtml(language)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Logged-in user:</td>
              <td style="padding: 8px 0;">${userId ? escapeHtml(userId) : "Anonymous"}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 6px; white-space: pre-wrap;">${nl2br(message)}</div>
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            ID: ${escapeHtml(String(id))} &bull;
            Submitted: ${escapeHtml(new Date(createdAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }))}
          </div>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      sendEmail(resendApiKey, {
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        reply_to: email,
        subject: `📬 Contact form: ${subject}`,
        html: supportHtml,
      }),
      (async () => {
        const locale = normalizeLocale(language);
        const t = pickByLocale(T, locale);
        const autoReplyHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">${escapeHtml(t.subject)}</h1>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 16px 0;">${escapeHtml(t.greeting(name))}</p>
              <p style="margin: 0 0 16px 0;">${escapeHtml(t.body)}</p>
              <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 6px;">
                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">${escapeHtml(t.yourSubjectLabel)}:</p>
                <p style="margin: 0 0 12px 0; font-weight: 600;">${escapeHtml(subject)}</p>
                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">${escapeHtml(t.yourMessageLabel)}:</p>
                <p style="margin: 0; white-space: pre-wrap;">${nl2br(message)}</p>
              </div>
              <p style="margin-top: 20px;">${escapeHtml(t.signoff)}</p>
              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                ${escapeHtml(t.footer)}
              </div>
            </div>
          </div>
        `;
        await sendEmail(resendApiKey, {
          from: "Mystery Maker <noreply@mysterymaker.party>",
          to: [email],
          reply_to: "support@mysterymaker.party",
          subject: t.subject,
          html: autoReplyHtml,
        });
      })(),
    ]);

    const supportResult = results[0];
    const autoReplyResult = results[1];
    if (supportResult.status === "rejected") {
      console.error("Support notification email failed:", supportResult.reason);
    }
    if (autoReplyResult.status === "rejected") {
      console.error("Auto-reply email failed:", autoReplyResult.reason);
    }

    return new Response(
      JSON.stringify({
        success: supportResult.status === "fulfilled" || autoReplyResult.status === "fulfilled",
        support_sent: supportResult.status === "fulfilled",
        auto_reply_sent: autoReplyResult.status === "fulfilled",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-contact-message error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
