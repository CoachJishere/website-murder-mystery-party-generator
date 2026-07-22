// send-cold-case-ready — the READY email for Cold Case Files (ADR-0029).
//
// Called by the worker container after it uploads the built HTML and marks the
// order 'ready'. POST { order_id }. Auth: Authorization: Bearer <service role key>
// (compared directly — verify_jwt is off because the anon key must NOT be enough).
//
// Localized in all 13 site languages via buyer_language (captured at checkout from
// the Payment Link locale — guests have no profiles.language row). Per-function
// inlined locale table, same pattern as the other send-* functions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

type Strings = {
  subject: string;
  heading: string;
  ready: string;      // "Your case file is ready."
  oneOfOne: string;   // one-of-one framing line
  cta: string;        // button label
  keep: string;       // link validity / offline note
  questions: string;
};

const L: Record<string, Strings> = {
  en: {
    subject: "Your cold case is ready 🔍",
    heading: "The file is on your desk, detective",
    ready: "Your case file is ready.",
    oneOfOne: "This case was generated for you alone — it has never existed before and will never be produced again. Everything you need to solve it is inside the file.",
    cta: "Open your case file",
    keep: "The file works offline on any device — save a copy somewhere safe. This link stays valid, so you can re-download any time.",
    questions: "Questions? Just reply to this email.",
  },
  es: {
    subject: "Tu caso sin resolver está listo 🔍",
    heading: "El expediente está en tu mesa, detective",
    ready: "Tu expediente del caso está listo.",
    oneOfOne: "Este caso fue generado solo para ti: nunca ha existido antes y nunca se producirá de nuevo. Todo lo que necesitas para resolverlo está dentro del archivo.",
    cta: "Abrir tu expediente",
    keep: "El archivo funciona sin conexión en cualquier dispositivo; guarda una copia en un lugar seguro. Este enlace sigue siendo válido y puedes volver a descargarlo cuando quieras.",
    questions: "¿Preguntas? Simplemente responde a este correo.",
  },
  fr: {
    subject: "Votre affaire classée est prête 🔍",
    heading: "Le dossier est sur votre bureau, détective",
    ready: "Votre dossier d'enquête est prêt.",
    oneOfOne: "Cette affaire a été générée pour vous seul : elle n'a jamais existé auparavant et ne sera jamais reproduite. Tout ce qu'il faut pour la résoudre se trouve dans le fichier.",
    cta: "Ouvrir votre dossier",
    keep: "Le fichier fonctionne hors ligne sur tout appareil — sauvegardez-en une copie. Ce lien reste valide : vous pouvez retélécharger à tout moment.",
    questions: "Des questions ? Répondez simplement à cet e-mail.",
  },
  de: {
    subject: "Dein Cold Case ist bereit 🔍",
    heading: "Die Akte liegt auf deinem Schreibtisch, Detective",
    ready: "Deine Fallakte ist bereit.",
    oneOfOne: "Dieser Fall wurde nur für dich generiert — er hat nie zuvor existiert und wird nie wieder erzeugt. Alles, was du zur Lösung brauchst, steckt in der Datei.",
    cta: "Fallakte öffnen",
    keep: "Die Datei funktioniert offline auf jedem Gerät — speichere eine Kopie an einem sicheren Ort. Dieser Link bleibt gültig, du kannst jederzeit erneut herunterladen.",
    questions: "Fragen? Antworte einfach auf diese E-Mail.",
  },
  it: {
    subject: "Il tuo cold case è pronto 🔍",
    heading: "Il fascicolo è sulla tua scrivania, detective",
    ready: "Il tuo fascicolo del caso è pronto.",
    oneOfOne: "Questo caso è stato generato solo per te: non è mai esistito prima e non sarà mai riprodotto. Tutto ciò che serve per risolverlo è nel file.",
    cta: "Apri il fascicolo",
    keep: "Il file funziona offline su qualsiasi dispositivo: salvane una copia. Questo link resta valido, puoi riscaricarlo quando vuoi.",
    questions: "Domande? Rispondi semplicemente a questa email.",
  },
  pt: {
    subject: "O seu caso arquivado está pronto 🔍",
    heading: "O dossiê está na sua mesa, detetive",
    ready: "O seu dossiê do caso está pronto.",
    oneOfOne: "Este caso foi gerado só para si — nunca existiu antes e nunca será produzido novamente. Tudo o que precisa para o resolver está dentro do ficheiro.",
    cta: "Abrir o dossiê",
    keep: "O ficheiro funciona offline em qualquer dispositivo — guarde uma cópia. Este link continua válido; pode voltar a descarregar quando quiser.",
    questions: "Dúvidas? Basta responder a este email.",
  },
  nl: {
    subject: "Je cold case is klaar 🔍",
    heading: "Het dossier ligt op je bureau, rechercheur",
    ready: "Je zaakdossier is klaar.",
    oneOfOne: "Deze zaak is alleen voor jou gegenereerd — hij heeft nooit eerder bestaan en wordt nooit opnieuw gemaakt. Alles wat je nodig hebt om hem op te lossen zit in het bestand.",
    cta: "Open je dossier",
    keep: "Het bestand werkt offline op elk apparaat — bewaar een kopie. Deze link blijft geldig; je kunt altijd opnieuw downloaden.",
    questions: "Vragen? Beantwoord gewoon deze e-mail.",
  },
  da: {
    subject: "Din cold case er klar 🔍",
    heading: "Sagsmappen ligger på dit skrivebord, detektiv",
    ready: "Din sagsmappe er klar.",
    oneOfOne: "Denne sag er genereret kun til dig — den har aldrig eksisteret før og bliver aldrig lavet igen. Alt, du skal bruge for at løse den, er i filen.",
    cta: "Åbn din sagsmappe",
    keep: "Filen virker offline på alle enheder — gem en kopi et sikkert sted. Linket forbliver gyldigt, så du kan downloade igen når som helst.",
    questions: "Spørgsmål? Svar blot på denne mail.",
  },
  sv: {
    subject: "Ditt kalla fall är klart 🔍",
    heading: "Akten ligger på ditt skrivbord, utredare",
    ready: "Din fallakt är klar.",
    oneOfOne: "Det här fallet genererades enbart för dig — det har aldrig funnits förut och kommer aldrig att skapas igen. Allt du behöver för att lösa det finns i filen.",
    cta: "Öppna din fallakt",
    keep: "Filen fungerar offline på alla enheter — spara en kopia. Länken förblir giltig; du kan ladda ner igen när som helst.",
    questions: "Frågor? Svara bara på det här mejlet.",
  },
  fi: {
    subject: "Kylmä tapauksesi on valmis 🔍",
    heading: "Kansio on pöydälläsi, etsivä",
    ready: "Tapauskansiosi on valmis.",
    oneOfOne: "Tämä tapaus luotiin vain sinulle — sitä ei ole koskaan ollut olemassa eikä sitä koskaan luoda uudelleen. Kaikki ratkaisuun tarvittava on tiedostossa.",
    cta: "Avaa tapauskansio",
    keep: "Tiedosto toimii offline-tilassa kaikilla laitteilla — tallenna kopio talteen. Linkki pysyy voimassa; voit ladata uudelleen milloin tahansa.",
    questions: "Kysymyksiä? Vastaa tähän sähköpostiin.",
  },
  ko: {
    subject: "미제 사건 파일이 준비되었습니다 🔍",
    heading: "형사님, 사건 파일이 책상 위에 있습니다",
    ready: "사건 파일이 준비되었습니다.",
    oneOfOne: "이 사건은 오직 당신만을 위해 생성되었습니다. 이전에 존재한 적 없고 다시 만들어지지도 않습니다. 해결에 필요한 모든 것이 파일 안에 있습니다.",
    cta: "사건 파일 열기",
    keep: "이 파일은 모든 기기에서 오프라인으로 작동합니다. 안전한 곳에 사본을 저장하세요. 링크는 계속 유효하며 언제든 다시 다운로드할 수 있습니다.",
    questions: "궁금한 점이 있으면 이 이메일에 회신해 주세요.",
  },
  ja: {
    subject: "未解決事件ファイルの準備ができました 🔍",
    heading: "刑事殿、ファイルは机の上に",
    ready: "事件ファイルの準備ができました。",
    oneOfOne: "この事件はあなただけのために生成されました。過去に存在したことはなく、二度と作られることもありません。解決に必要なものはすべてファイルの中にあります。",
    cta: "事件ファイルを開く",
    keep: "ファイルはどのデバイスでもオフラインで動作します。安全な場所にコピーを保存してください。このリンクは有効なままなので、いつでも再ダウンロードできます。",
    questions: "ご質問はこのメールにご返信ください。",
  },
  "zh-cn": {
    subject: "您的悬案卷宗已就绪 🔍",
    heading: "侦探，卷宗已放在您的桌上",
    ready: "您的案件卷宗已准备就绪。",
    oneOfOne: "这个案件是专为您生成的——它从未存在过，也永远不会再次生成。破案所需的一切都在文件之中。",
    cta: "打开案件卷宗",
    keep: "该文件可在任何设备上离线使用——请妥善保存副本。此链接持续有效，您可以随时重新下载。",
    questions: "有疑问？直接回复此邮件即可。",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role only: the anon key must not be able to trigger customer emails.
  const auth = req.headers.get("authorization") || "";
  if (!SERVICE_KEY || auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { order_id } = await req.json();
    const { data: order, error } = await supabase
      .from("cold_case_orders")
      .select("id, email, buyer_language, slug, status, storage_path, delivery_token, delivered_at")
      .eq("id", order_id)
      .single();

    if (error || !order) throw new Error(`order not found: ${order_id}`);
    if (order.status !== "ready" || !order.storage_path) {
      throw new Error(`order ${order_id} not ready (status=${order.status})`);
    }

    const t = L[order.buyer_language] || L.en;
    const siteUrl = Deno.env.get("SITE_URL") || "https://www.mysterymaker.party";
    const link = `${siteUrl}/cold-case/${order.delivery_token}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not set");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: [order.email],
        subject: t.subject,
        html: `
          <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #14100e; color: #f2ede6; padding: 28px 24px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-weight: 600; letter-spacing: .02em;">${t.heading}</h2>
            </div>
            <div style="background: #f7f4ee; padding: 26px 24px; border: 1px solid #e3ded3; border-top: none; border-radius: 0 0 8px 8px; line-height: 1.7;">
              <p><strong>${t.ready}</strong></p>
              <p>${t.oneOfOne}</p>
              <p style="text-align: center; margin: 26px 0;">
                <a href="${link}" style="background: #8a2b1d; color: #f7f4ee; padding: 13px 30px; border-radius: 4px; text-decoration: none; font-weight: 600; display: inline-block;">${t.cta}</a>
              </p>
              <p style="font-size: 13.5px; color: #574f42;">${t.keep}</p>
              <p style="font-size: 13px; color: #6d675c; margin-top: 22px;">${t.questions}</p>
            </div>
          </div>`,
      }),
    });

    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);

    await supabase
      .from("cold_case_orders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", order.id);

    console.log(`[cold-case-ready] delivered ${order.slug} to ${order.email} (${order.buyer_language})`);
    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[cold-case-ready] error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
