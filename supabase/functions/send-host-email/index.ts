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

interface HostStrings {
  guideSubject: (title: string) => string;
  guideHeading: string;
  guideReady: (title: string) => string;
  guideDescription: string;
  guideCta: string;
  detectiveSubject: (title: string) => string;
  detectiveHeading: string;
  detectiveReady: (title: string) => string;
  detectiveDescription: string;
  detectiveCta: string;
  tipLabel: string;
  tipBody: string;
}

const T: Record<Locale, HostStrings> = {
  en: {
    guideSubject: (t) => `Host Guide: ${t}`,
    guideHeading: 'HOST GUIDE',
    guideReady: (t) => `Your host guide for <strong>${t}</strong> is ready!`,
    guideDescription: 'Everything you need to prepare for your mystery party: game overview, timeline, materials list, and hosting tips.',
    guideCta: 'View Host Guide',
    detectiveSubject: (t) => `Detective Kit: ${t}`,
    detectiveHeading: 'DETECTIVE &amp; EVIDENCE KIT',
    detectiveReady: (t) => `Your detective kit for <strong>${t}</strong> is ready!`,
    detectiveDescription: 'Your detective script and evidence cards for running the game. Use this during the party to guide the investigation.',
    detectiveCta: 'View Detective Kit',
    tipLabel: 'Tip:',
    tipBody: 'Bookmark this link so you can easily access it on your phone during the party!',
  },
  es: {
    guideSubject: (t) => `Guía del anfitrión: ${t}`,
    guideHeading: 'GUÍA DEL ANFITRIÓN',
    guideReady: (t) => `Tu guía del anfitrión para <strong>${t}</strong> ya está lista.`,
    guideDescription: 'Todo lo que necesitas para preparar tu fiesta de misterio: resumen del juego, cronograma, lista de materiales y consejos para el anfitrión.',
    guideCta: 'Ver guía del anfitrión',
    detectiveSubject: (t) => `Kit del detective: ${t}`,
    detectiveHeading: 'KIT DEL DETECTIVE Y PRUEBAS',
    detectiveReady: (t) => `Tu kit del detective para <strong>${t}</strong> ya está listo.`,
    detectiveDescription: 'Tu guion del detective y las cartas de pruebas para dirigir la partida. Úsalas durante la fiesta para guiar la investigación.',
    detectiveCta: 'Ver kit del detective',
    tipLabel: 'Consejo:',
    tipBody: 'Guarda este enlace en favoritos para acceder fácilmente desde el móvil durante la fiesta.',
  },
  fr: {
    guideSubject: (t) => `Guide de l'hôte : ${t}`,
    guideHeading: "GUIDE DE L'HÔTE",
    guideReady: (t) => `Votre guide de l'hôte pour <strong>${t}</strong> est prêt !`,
    guideDescription: "Tout ce qu'il vous faut pour préparer votre soirée mystère : présentation du jeu, planning, liste de matériel et conseils pour l'hôte.",
    guideCta: "Voir le guide de l'hôte",
    detectiveSubject: (t) => `Kit du détective : ${t}`,
    detectiveHeading: 'KIT DU DÉTECTIVE ET INDICES',
    detectiveReady: (t) => `Votre kit du détective pour <strong>${t}</strong> est prêt !`,
    detectiveDescription: "Le script du détective et les cartes d'indices pour mener la partie. À utiliser pendant la soirée pour guider l'enquête.",
    detectiveCta: 'Voir le kit du détective',
    tipLabel: 'Astuce :',
    tipBody: 'Mettez ce lien en favori pour y accéder facilement depuis votre téléphone le soir de la fête.',
  },
  de: {
    guideSubject: (t) => `Gastgeber-Guide: ${t}`,
    guideHeading: 'GASTGEBER-GUIDE',
    guideReady: (t) => `Dein Gastgeber-Guide für <strong>${t}</strong> ist fertig!`,
    guideDescription: 'Alles, was du zur Vorbereitung deiner Krimi-Party brauchst: Spielüberblick, Ablauf, Materialliste und Tipps für Gastgeber.',
    guideCta: 'Gastgeber-Guide ansehen',
    detectiveSubject: (t) => `Detektiv-Kit: ${t}`,
    detectiveHeading: 'DETEKTIV-KIT &amp; HINWEISE',
    detectiveReady: (t) => `Dein Detektiv-Kit für <strong>${t}</strong> ist fertig!`,
    detectiveDescription: 'Dein Detektiv-Skript und die Hinweiskarten zum Leiten des Spiels. Damit führst du die Ermittlungen während der Party.',
    detectiveCta: 'Detektiv-Kit ansehen',
    tipLabel: 'Tipp:',
    tipBody: 'Speichere den Link als Lesezeichen, damit du ihn während der Party schnell auf deinem Handy aufrufen kannst.',
  },
  it: {
    guideSubject: (t) => `Guida per l'host: ${t}`,
    guideHeading: "GUIDA PER L'HOST",
    guideReady: (t) => `La tua guida per l'host di <strong>${t}</strong> è pronta!`,
    guideDescription: 'Tutto il necessario per preparare la tua festa mystery: panoramica del gioco, tempistiche, lista materiali e consigli per l\'host.',
    guideCta: "Vai alla guida per l'host",
    detectiveSubject: (t) => `Kit del detective: ${t}`,
    detectiveHeading: 'KIT DEL DETECTIVE E INDIZI',
    detectiveReady: (t) => `Il tuo kit del detective per <strong>${t}</strong> è pronto!`,
    detectiveDescription: 'Il copione del detective e le carte indizio per condurre il gioco. Usali durante la festa per guidare l\'indagine.',
    detectiveCta: 'Vai al kit del detective',
    tipLabel: 'Consiglio:',
    tipBody: 'Salva questo link nei preferiti così potrai aprirlo velocemente dal telefono durante la festa!',
  },
  pt: {
    guideSubject: (t) => `Guia do anfitrião: ${t}`,
    guideHeading: 'GUIA DO ANFITRIÃO',
    guideReady: (t) => `Seu guia do anfitrião para <strong>${t}</strong> está pronto!`,
    guideDescription: 'Tudo o que você precisa para preparar sua festa de mistério: visão geral do jogo, cronograma, lista de materiais e dicas para o anfitrião.',
    guideCta: 'Ver guia do anfitrião',
    detectiveSubject: (t) => `Kit do detetive: ${t}`,
    detectiveHeading: 'KIT DO DETETIVE E EVIDÊNCIAS',
    detectiveReady: (t) => `Seu kit do detetive para <strong>${t}</strong> está pronto!`,
    detectiveDescription: 'Seu roteiro de detetive e as cartas de evidência para conduzir o jogo. Use durante a festa para guiar a investigação.',
    detectiveCta: 'Ver kit do detetive',
    tipLabel: 'Dica:',
    tipBody: 'Salve este link nos favoritos para acessá-lo facilmente pelo celular durante a festa!',
  },
  nl: {
    guideSubject: (t) => `Gastheergids: ${t}`,
    guideHeading: 'GASTHEERGIDS',
    guideReady: (t) => `Je gastheergids voor <strong>${t}</strong> staat klaar!`,
    guideDescription: 'Alles wat je nodig hebt om je mysteriefeest voor te bereiden: spelopzet, tijdlijn, materialenlijst en tips voor de gastheer.',
    guideCta: 'Bekijk de gastheergids',
    detectiveSubject: (t) => `Detective-kit: ${t}`,
    detectiveHeading: 'DETECTIVE-KIT &amp; AANWIJZINGEN',
    detectiveReady: (t) => `Je detective-kit voor <strong>${t}</strong> staat klaar!`,
    detectiveDescription: 'Je detective-script en aanwijzingskaarten om het spel te leiden. Gebruik ze tijdens het feest om het onderzoek te sturen.',
    detectiveCta: 'Bekijk de detective-kit',
    tipLabel: 'Tip:',
    tipBody: 'Zet deze link in je favorieten zodat je hem tijdens het feest snel op je telefoon kunt openen!',
  },
  da: {
    guideSubject: (t) => `Værtsguide: ${t}`,
    guideHeading: 'VÆRTSGUIDE',
    guideReady: (t) => `Din værtsguide til <strong>${t}</strong> er klar!`,
    guideDescription: 'Alt du skal bruge til at forberede din mysteriefest: spilforklaring, tidslinje, materialeliste og værtstips.',
    guideCta: 'Se værtsguiden',
    detectiveSubject: (t) => `Detektivpakke: ${t}`,
    detectiveHeading: 'DETEKTIVPAKKE &amp; SPOR',
    detectiveReady: (t) => `Din detektivpakke til <strong>${t}</strong> er klar!`,
    detectiveDescription: 'Dit detektivmanuskript og sporkortene, du skal bruge for at lede spillet. Brug dem under festen til at styre efterforskningen.',
    detectiveCta: 'Se detektivpakken',
    tipLabel: 'Tip:',
    tipBody: 'Gem linket som bogmærke, så kan du nemt åbne det på telefonen under festen!',
  },
  sv: {
    guideSubject: (t) => `Värdguide: ${t}`,
    guideHeading: 'VÄRDGUIDE',
    guideReady: (t) => `Din värdguide till <strong>${t}</strong> är klar!`,
    guideDescription: 'Allt du behöver för att förbereda din mysteriefest: spelöversikt, tidslinje, materialista och värdtips.',
    guideCta: 'Visa värdguiden',
    detectiveSubject: (t) => `Detektivpaket: ${t}`,
    detectiveHeading: 'DETEKTIVPAKET &amp; LEDTRÅDAR',
    detectiveReady: (t) => `Ditt detektivpaket till <strong>${t}</strong> är klart!`,
    detectiveDescription: 'Ditt detektivmanus och ledtrådskorten för att leda spelet. Använd dem under festen för att styra utredningen.',
    detectiveCta: 'Visa detektivpaketet',
    tipLabel: 'Tips:',
    tipBody: 'Spara länken som bokmärke så att du enkelt kan öppna den i telefonen under festen!',
  },
  fi: {
    guideSubject: (t) => `Isännän opas: ${t}`,
    guideHeading: 'ISÄNNÄN OPAS',
    guideReady: (t) => `Isännän oppaasi mysteeriin <strong>${t}</strong> on valmis!`,
    guideDescription: 'Kaikki, mitä tarvitset mysteerijuhlien valmisteluun: pelin yleiskuvaus, aikataulu, tarvikelista ja isännöintivinkit.',
    guideCta: 'Katso isännän opas',
    detectiveSubject: (t) => `Etsiväpaketti: ${t}`,
    detectiveHeading: 'ETSIVÄPAKETTI &amp; VIHJEET',
    detectiveReady: (t) => `Etsiväpakettisi mysteeriin <strong>${t}</strong> on valmis!`,
    detectiveDescription: 'Etsivän käsikirjoitus ja vihjekortit pelin vetämiseen. Käytä niitä juhlien aikana ohjaamaan tutkintaa.',
    detectiveCta: 'Katso etsiväpaketti',
    tipLabel: 'Vinkki:',
    tipBody: 'Lisää linkki kirjanmerkkeihin, niin saat sen nopeasti auki puhelimellasi juhlien aikana!',
  },
  ko: {
    guideSubject: (t) => `호스트 가이드: ${t}`,
    guideHeading: '호스트 가이드',
    guideReady: (t) => `<strong>${t}</strong>의 호스트 가이드가 준비되었습니다!`,
    guideDescription: '미스터리 파티 준비에 필요한 모든 것: 게임 개요, 진행 일정, 준비물 목록, 호스팅 팁까지.',
    guideCta: '호스트 가이드 보기',
    detectiveSubject: (t) => `디텍티브 키트: ${t}`,
    detectiveHeading: '디텍티브 &amp; 단서 키트',
    detectiveReady: (t) => `<strong>${t}</strong>의 디텍티브 키트가 준비되었습니다!`,
    detectiveDescription: '게임을 진행할 디텍티브 스크립트와 단서 카드입니다. 파티 중 수사를 이끌 때 사용하세요.',
    detectiveCta: '디텍티브 키트 보기',
    tipLabel: '팁:',
    tipBody: '이 링크를 즐겨찾기에 추가해 두면 파티 도중 휴대폰에서 바로 열어볼 수 있습니다!',
  },
  ja: {
    guideSubject: (t) => `ホストガイド：${t}`,
    guideHeading: 'ホストガイド',
    guideReady: (t) => `<strong>${t}</strong>のホストガイドが準備できました！`,
    guideDescription: 'ミステリーパーティーの準備に必要なすべて：ゲーム概要、進行スケジュール、用意するもの、ホスティングのコツ。',
    guideCta: 'ホストガイドを見る',
    detectiveSubject: (t) => `探偵キット：${t}`,
    detectiveHeading: '探偵キット &amp; 証拠カード',
    detectiveReady: (t) => `<strong>${t}</strong>の探偵キットが準備できました！`,
    detectiveDescription: 'ゲーム進行用の探偵スクリプトと証拠カードです。パーティー本番で捜査をリードするのに使用してください。',
    detectiveCta: '探偵キットを見る',
    tipLabel: 'ワンポイント：',
    tipBody: 'このリンクをブックマークしておくと、パーティー中にスマホからすぐ開けて便利です！',
  },
  'zh-cn': {
    guideSubject: (t) => `主持人手册：${t}`,
    guideHeading: '主持人手册',
    guideReady: (t) => `你的<strong>${t}</strong>主持人手册已经准备好！`,
    guideDescription: '准备一场谜案派对所需的一切：游戏概览、流程时间表、材料清单和主持小贴士。',
    guideCta: '查看主持人手册',
    detectiveSubject: (t) => `侦探套件：${t}`,
    detectiveHeading: '侦探套件 &amp; 证据卡',
    detectiveReady: (t) => `你的<strong>${t}</strong>侦探套件已经准备好！`,
    detectiveDescription: '用于带领游戏的侦探剧本和证据卡。在派对当天用它引导大家展开调查。',
    detectiveCta: '查看侦探套件',
    tipLabel: '小贴士：',
    tipBody: '把这个链接收藏起来，派对当天就能在手机上一键打开了！',
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { host_email, mystery_title, access_token, language } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const locale: Locale = normalizeLocale(language);
    const t = pickByLocale(T, locale);

    const guideUrl = `https://www.mysterymaker.party/host/${access_token}#guide`;
    const detectiveUrl = `https://www.mysterymaker.party/host/${access_token}#detective`;

    const buildEmailHtml = (
      heading: string,
      readyLine: string,
      description: string,
      ctaLabel: string,
      ctaUrl: string
    ) => `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">${heading}</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">${readyLine}</p>

    <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: rgba(245,240,232,0.7);">${description}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${ctaLabel}</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">${t.tipLabel}</strong> ${t.tipBody}
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
    `.trim();

    const guideHtml = buildEmailHtml(
      t.guideHeading,
      t.guideReady(mystery_title),
      t.guideDescription,
      t.guideCta,
      guideUrl
    );

    const detectiveHtml = buildEmailHtml(
      t.detectiveHeading,
      t.detectiveReady(mystery_title),
      t.detectiveDescription,
      t.detectiveCta,
      detectiveUrl
    );

    const sendEmail = async (subject: string, html: string) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Mystery Maker <noreply@mysterymaker.party>",
          to: [host_email],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
      }

      return response.json();
    };

    await Promise.all([
      sendEmail(t.guideSubject(mystery_title), guideHtml),
      sendEmail(t.detectiveSubject(mystery_title), detectiveHtml),
    ]);

    return new Response(
      JSON.stringify({ success: true, message: "Host emails sent successfully", locale }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
