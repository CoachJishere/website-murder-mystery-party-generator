import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type Locale, normalizeLocale, pickByLocale } from "../_shared/email-i18n.ts";

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

interface CharacterStrings {
  subject: (character: string, title: string) => string;
  greeting: (name: string) => string;
  intro: (title: string) => string;
  yourCharacter: (character: string) => string;
  ctaIntro: string;
  cta: string;
  tipLabel: string;
  tipBody: string;
  footer1: string; // mentions mysterymaker.party
  footer2: string;
}

const T: Record<Locale, CharacterStrings> = {
  en: {
    subject: (c, t) => `Your Character: ${c} for ${t}`,
    greeting: (n) => `Hi ${n},`,
    intro: (t) => `You've been assigned a character for <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Your Character: ${c}`,
    ctaIntro: 'Click the button below to view your complete character guide:',
    cta: 'View My Character',
    tipLabel: 'Tip:',
    tipBody: 'Save this email or bookmark the link so you can access your character anytime!',
    footer1: 'Your email was provided by the host of this mystery party via <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.',
    footer2: "We may send you one follow-up email to ask about your experience. That's it — no mailing lists, no marketing.",
  },
  es: {
    subject: (c, t) => `Tu personaje: ${c} para ${t}`,
    greeting: (n) => `Hola ${n}:`,
    intro: (t) => `¡Te han asignado un personaje para <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Tu personaje: ${c}`,
    ctaIntro: 'Pulsa el botón para ver la guía completa de tu personaje:',
    cta: 'Ver mi personaje',
    tipLabel: 'Consejo:',
    tipBody: 'Guarda este correo o el enlace en favoritos para acceder a tu personaje cuando quieras.',
    footer1: 'El anfitrión de esta fiesta nos facilitó tu correo a través de <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.',
    footer2: 'Quizás te enviemos un único correo después para preguntarte qué te pareció. Eso es todo: sin listas de distribución, sin marketing.',
  },
  fr: {
    subject: (c, t) => `Votre personnage : ${c} pour ${t}`,
    greeting: (n) => `Bonjour ${n},`,
    intro: (t) => `Un personnage vous a été attribué pour <strong style="color: #F5F0E8;">${t}</strong> !`,
    yourCharacter: (c) => `Votre personnage : ${c}`,
    ctaIntro: 'Cliquez sur le bouton ci-dessous pour découvrir la fiche complète de votre personnage :',
    cta: 'Voir mon personnage',
    tipLabel: 'Astuce :',
    tipBody: 'Conservez cet e-mail ou mettez le lien en favori pour retrouver votre personnage à tout moment.',
    footer1: "Votre adresse e-mail nous a été transmise par l'hôte de cette soirée mystère via <a href=\"https://www.mysterymaker.party\" style=\"color: rgba(245,240,232,0.4); text-decoration: none;\">mysterymaker.party</a>.",
    footer2: "Nous vous enverrons peut-être un seul e-mail de suivi pour vous demander votre avis. C'est tout — pas de liste de diffusion, pas de marketing.",
  },
  de: {
    subject: (c, t) => `Deine Rolle: ${c} für ${t}`,
    greeting: (n) => `Hallo ${n},`,
    intro: (t) => `Du hast eine Rolle für <strong style="color: #F5F0E8;">${t}</strong> bekommen!`,
    yourCharacter: (c) => `Deine Rolle: ${c}`,
    ctaIntro: 'Klicke auf den Button, um deinen vollständigen Rollen-Guide zu öffnen:',
    cta: 'Meine Rolle ansehen',
    tipLabel: 'Tipp:',
    tipBody: 'Speichere diese E-Mail oder den Link, dann kannst du jederzeit auf deine Rolle zugreifen!',
    footer1: 'Deine E-Mail-Adresse wurde uns vom Gastgeber dieser Krimi-Party über <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a> übermittelt.',
    footer2: 'Wir schicken dir vielleicht eine einzige Folge-E-Mail, um zu fragen, wie es war. Mehr nicht — keine Newsletter, kein Marketing.',
  },
  it: {
    subject: (c, t) => `Il tuo personaggio: ${c} per ${t}`,
    greeting: (n) => `Ciao ${n},`,
    intro: (t) => `Ti è stato assegnato un personaggio per <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Il tuo personaggio: ${c}`,
    ctaIntro: 'Clicca il pulsante qui sotto per leggere la guida completa del tuo personaggio:',
    cta: 'Vai al mio personaggio',
    tipLabel: 'Consiglio:',
    tipBody: 'Salva questa email o il link nei preferiti, così puoi accedere al tuo personaggio quando vuoi!',
    footer1: "L'host di questa festa mystery ci ha passato il tuo indirizzo email tramite <a href=\"https://www.mysterymaker.party\" style=\"color: rgba(245,240,232,0.4); text-decoration: none;\">mysterymaker.party</a>.",
    footer2: 'Potremmo mandarti una sola email di follow-up per sapere com\'è andata. Tutto qui &mdash; niente mailing list, niente marketing.',
  },
  pt: {
    subject: (c, t) => `Seu personagem: ${c} em ${t}`,
    greeting: (n) => `Olá, ${n}!`,
    intro: (t) => `Você recebeu um personagem em <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Seu personagem: ${c}`,
    ctaIntro: 'Clique no botão abaixo para ver o guia completo do seu personagem:',
    cta: 'Ver meu personagem',
    tipLabel: 'Dica:',
    tipBody: 'Guarde este e-mail ou salve o link nos favoritos para acessar seu personagem quando quiser!',
    footer1: 'Seu e-mail foi compartilhado pelo anfitrião desta festa de mistério através do <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.',
    footer2: 'Talvez enviemos um único e-mail depois para saber como foi sua experiência. Só isso — sem listas, sem marketing.',
  },
  nl: {
    subject: (c, t) => `Jouw personage: ${c} voor ${t}`,
    greeting: (n) => `Hi ${n},`,
    intro: (t) => `Je hebt een personage gekregen voor <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Jouw personage: ${c}`,
    ctaIntro: 'Klik op de knop hieronder om je volledige personagegids te bekijken:',
    cta: 'Bekijk mijn personage',
    tipLabel: 'Tip:',
    tipBody: 'Bewaar deze e-mail of zet de link in je favorieten zodat je altijd bij je personage kunt!',
    footer1: 'Je e-mailadres is door de gastheer van dit mysteriefeest doorgegeven via <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.',
    footer2: 'We sturen je eventueel één follow-up-mailtje om te vragen hoe je het vond. Meer niet — geen nieuwsbrieven, geen marketing.',
  },
  da: {
    subject: (c, t) => `Din rolle: ${c} til ${t}`,
    greeting: (n) => `Hej ${n}`,
    intro: (t) => `Du har fået en rolle til <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Din rolle: ${c}`,
    ctaIntro: 'Klik på knappen nedenfor for at se hele din rollebeskrivelse:',
    cta: 'Se min rolle',
    tipLabel: 'Tip:',
    tipBody: 'Gem denne mail eller sæt linket som bogmærke, så kan du altid finde din rolle igen!',
    footer1: 'Værten for denne mysteriefest har givet os din mail via <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.',
    footer2: 'Vi sender dig måske én opfølgende mail bagefter for at høre, hvordan det gik. Det er alt — ingen mailinglister, ingen markedsføring.',
  },
  sv: {
    subject: (c, t) => `Din roll: ${c} i ${t}`,
    greeting: (n) => `Hej ${n}!`,
    intro: (t) => `Du har tilldelats en roll i <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Din roll: ${c}`,
    ctaIntro: 'Klicka på knappen nedan för att läsa hela din rollbeskrivning:',
    cta: 'Visa min roll',
    tipLabel: 'Tips:',
    tipBody: 'Spara mejlet eller lägg länken som bokmärke så kommer du alltid åt din roll!',
    footer1: 'Din e-postadress fick vi av värden för det här mysteriefesten via <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.',
    footer2: 'Vi kan komma att skicka ett enda uppföljningsmejl för att höra hur det gick. Det är allt — ingen utskickslista, ingen marknadsföring.',
  },
  fi: {
    subject: (c, t) => `Roolisi: ${c} mysteerissä ${t}`,
    greeting: (n) => `Hei ${n},`,
    intro: (t) => `Olet saanut roolin mysteeriin <strong style="color: #F5F0E8;">${t}</strong>!`,
    yourCharacter: (c) => `Roolisi: ${c}`,
    ctaIntro: 'Avaa täydellinen roolikuvauksesi alla olevasta painikkeesta:',
    cta: 'Avaa hahmoni',
    tipLabel: 'Vinkki:',
    tipBody: 'Tallenna tämä viesti tai lisää linkki kirjanmerkkeihin, niin pääset hahmoosi käsiksi milloin tahansa!',
    footer1: 'Sähköpostiosoitteesi sai meiltä tämän mysteerijuhlan isäntä palvelun <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a> kautta.',
    footer2: 'Saatamme lähettää sinulle yhden seurantaviestin kysyäksemme, miltä juhlat tuntuivat. Siinä kaikki — ei postituslistoja, ei markkinointia.',
  },
  ko: {
    subject: (c, t) => `당신의 캐릭터: ${t}의 ${c}`,
    greeting: (n) => `${n}님, 안녕하세요.`,
    intro: (t) => `<strong style="color: #F5F0E8;">${t}</strong>의 캐릭터가 배정되었습니다!`,
    yourCharacter: (c) => `당신의 캐릭터: ${c}`,
    ctaIntro: '아래 버튼을 눌러 전체 캐릭터 가이드를 확인하세요.',
    cta: '내 캐릭터 보기',
    tipLabel: '팁:',
    tipBody: '이 이메일을 저장하거나 링크를 즐겨찾기에 추가해 두면 언제든 캐릭터를 다시 열어볼 수 있습니다.',
    footer1: '이 이메일 주소는 이번 미스터리 파티의 호스트가 <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>를 통해 전달했습니다.',
    footer2: '경험이 어땠는지 묻는 후속 이메일을 한 번 보내드릴 수 있습니다. 그게 전부이며, 뉴스레터나 마케팅은 일절 없습니다.',
  },
  ja: {
    subject: (c, t) => `あなたの役：『${t}』の${c}`,
    greeting: (n) => `${n}さん、こんにちは。`,
    intro: (t) => `<strong style="color: #F5F0E8;">${t}</strong>の役があなたに割り当てられました！`,
    yourCharacter: (c) => `あなたの役：${c}`,
    ctaIntro: '下のボタンから役のフルガイドをご確認ください。',
    cta: '自分の役を見る',
    tipLabel: 'ワンポイント：',
    tipBody: 'このメールを保存するかリンクをブックマークしておくと、いつでも自分の役を確認できます。',
    footer1: 'このメールアドレスは、本ミステリーパーティーのホストが <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a> 経由で共有しました。',
    footer2: '体験のご感想を伺うため、後日フォローアップメールを1通だけお送りすることがあります。それ以外のメールはお送りしません — メーリングリストや広告メールは一切ございません。',
  },
  'zh-cn': {
    subject: (c, t) => `你的角色：《${t}》中的${c}`,
    greeting: (n) => `${n}，你好：`,
    intro: (t) => `你已被分配到 <strong style="color: #F5F0E8;">${t}</strong> 中的一个角色！`,
    yourCharacter: (c) => `你的角色：${c}`,
    ctaIntro: '点击下方按钮查看完整的角色指南：',
    cta: '查看我的角色',
    tipLabel: '小贴士：',
    tipBody: '把这封邮件保存好或将链接收藏起来，随时都能再打开你的角色。',
    footer1: '本次谜案派对的主持人通过 <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a> 与我们分享了你的邮箱。',
    footer2: '我们之后可能会发一封邮件询问你的体验，仅此一封，没有订阅列表，也没有任何营销内容。',
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guest_email, guest_name, character_name, character_details, access_token, mystery_title, language } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const locale: Locale = normalizeLocale(language);
    const t = pickByLocale(T, locale);

    const characterUrl = `https://www.mysterymaker.party/character/${access_token}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">${t.greeting(guest_name)}</p>

    <p style="margin-bottom: 20px; color: rgba(245,240,232,0.7);">${t.intro(mystery_title)}</p>

    <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h2 style="color: #C81400; margin-top: 0; font-size: 22px;">${t.yourCharacter(character_name)}</h2>
      <p style="margin-bottom: 0; color: rgba(245,240,232,0.7);">${character_details}</p>
    </div>

    <p style="margin-bottom: 25px; color: rgba(245,240,232,0.7);">${t.ctaIntro}</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${characterUrl}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${t.cta}</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">${t.tipLabel}</strong> ${t.tipBody}
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 11px; color: rgba(245,240,232,0.3);">
    <p style="margin: 0 0 8px 0;">${t.footer1}</p>
    <p style="margin: 0;">${t.footer2}</p>
  </div>
</body>
</html>
    `.trim();

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: [guest_email],
        subject: t.subject(character_name, mystery_title),
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Failed to send email: ${resendResponse.status}`);
    }

    const data = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", locale }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
