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

interface WelcomeStrings {
  subject: string;
  greetWithName: (name: string) => string;
  greetNoName: string;
  intro: string;
  giftKicker: string;
  amount: string;
  arrowSuffix: string; // text after the price arrow ("for your first mystery package")
  validity: string;
  feat1: string;
  feat2: string;
  feat3: string;
  feat4: string;
  cta: string;
  proTipLabel: string;
  proTipBody: string;
}

const T: Record<Locale, WelcomeStrings> = {
  en: {
    subject: 'Welcome to Mystery Maker!',
    greetWithName: (n) => `Welcome, ${n}!`,
    greetNoName: 'Welcome!',
    intro: "Your account is ready. Here's what you can do now:",
    giftKicker: 'Your welcome gift',
    amount: '20% OFF',
    arrowSuffix: 'for your first mystery package',
    validity: 'Valid for 7 days &mdash; applied automatically at checkout',
    feat1: '<strong>Create custom mysteries</strong> in minutes using AI',
    feat2: '<strong>Choose any theme</strong> &mdash; from Victorian mansions to space stations',
    feat3: '<strong>Send character assignments</strong> directly to your guests',
    feat4: '<strong>Download everything you need</strong> &mdash; host guides, clue cards, and more',
    cta: 'Create Your First Mystery &amp; Save 20%',
    proTipLabel: 'Pro tip:',
    proTipBody: "You can explore and create as many mystery drafts as you like for free. Your 20% discount is applied automatically when you're ready to generate the complete party package.",
  },
  es: {
    subject: '¡Bienvenido a Mystery Maker!',
    greetWithName: (n) => `¡Bienvenido, ${n}!`,
    greetNoName: '¡Bienvenido!',
    intro: 'Tu cuenta ya está lista. Esto es lo que puedes hacer ahora:',
    giftKicker: 'Tu regalo de bienvenida',
    amount: '20% DE DESCUENTO',
    arrowSuffix: 'en tu primer paquete de misterio',
    validity: 'Válido durante 7 días &mdash; se aplica automáticamente al pagar',
    feat1: '<strong>Crea misterios a medida</strong> en minutos con IA',
    feat2: '<strong>Elige la temática que quieras</strong> &mdash; desde mansiones victorianas hasta estaciones espaciales',
    feat3: '<strong>Envía las asignaciones de personajes</strong> directamente a tus invitados',
    feat4: '<strong>Descarga todo lo necesario</strong> &mdash; guías para el anfitrión, cartas de pistas y mucho más',
    cta: 'Crea tu primer misterio y ahorra un 20%',
    proTipLabel: 'Consejo:',
    proTipBody: 'Puedes explorar y crear todos los borradores de misterio que quieras, gratis. Tu descuento del 20% se aplica automáticamente cuando estés listo para generar el paquete completo de la fiesta.',
  },
  fr: {
    subject: 'Bienvenue sur Mystery Maker !',
    greetWithName: (n) => `Bienvenue, ${n} !`,
    greetNoName: 'Bienvenue !',
    intro: 'Votre compte est prêt. Voici ce que vous pouvez faire maintenant :',
    giftKicker: 'Votre cadeau de bienvenue',
    amount: '-20 %',
    arrowSuffix: 'sur votre premier pack de mystère',
    validity: 'Valable 7 jours &mdash; appliqué automatiquement au paiement',
    feat1: "<strong>Créez des mystères sur mesure</strong> en quelques minutes grâce à l'IA",
    feat2: "<strong>Choisissez n'importe quel thème</strong> &mdash; du manoir victorien à la station spatiale",
    feat3: '<strong>Envoyez les rôles</strong> directement à vos invités',
    feat4: "<strong>Téléchargez tout ce qu'il faut</strong> &mdash; guides hôte, cartes d'indices et bien plus",
    cta: 'Créez votre premier mystère et économisez 20 %',
    proTipLabel: 'Astuce :',
    proTipBody: "Vous pouvez explorer et créer autant de brouillons de mystère que vous le souhaitez, gratuitement. Votre réduction de 20 % s'applique automatiquement lorsque vous êtes prêt à générer le pack complet.",
  },
  de: {
    subject: 'Willkommen bei Mystery Maker!',
    greetWithName: (n) => `Willkommen, ${n}!`,
    greetNoName: 'Willkommen!',
    intro: 'Dein Konto ist startklar. Das kannst du jetzt tun:',
    giftKicker: 'Dein Willkommensgeschenk',
    amount: '20% RABATT',
    arrowSuffix: 'auf dein erstes Krimi-Paket',
    validity: '7 Tage gültig &mdash; wird automatisch an der Kasse abgezogen',
    feat1: '<strong>Eigene Krimis erstellen</strong> in wenigen Minuten mit KI',
    feat2: '<strong>Beliebiges Thema wählen</strong> &mdash; vom viktorianischen Herrenhaus bis zur Raumstation',
    feat3: '<strong>Rollen verschicken</strong> direkt an deine Gäste',
    feat4: '<strong>Alles herunterladen</strong> &mdash; Gastgeber-Guide, Hinweiskarten und mehr',
    cta: 'Ersten Krimi erstellen &amp; 20 % sparen',
    proTipLabel: 'Tipp:',
    proTipBody: 'Du kannst kostenlos so viele Krimi-Entwürfe erstellen, wie du möchtest. Dein 20 %-Rabatt wird automatisch angewendet, sobald du das vollständige Partypaket generierst.',
  },
  it: {
    subject: 'Benvenuto su Mystery Maker!',
    greetWithName: (n) => `Benvenuto, ${n}!`,
    greetNoName: 'Benvenuto!',
    intro: 'Il tuo account è pronto. Ecco cosa puoi fare adesso:',
    giftKicker: 'Il tuo regalo di benvenuto',
    amount: '-20%',
    arrowSuffix: 'sul tuo primo pacchetto mystery',
    validity: 'Valido per 7 giorni &mdash; applicato automaticamente al checkout',
    feat1: "<strong>Crea mystery personalizzati</strong> in pochi minuti con l'IA",
    feat2: '<strong>Scegli qualunque ambientazione</strong> &mdash; dalle ville vittoriane alle stazioni spaziali',
    feat3: '<strong>Invia i personaggi</strong> direttamente ai tuoi ospiti',
    feat4: '<strong>Scarica tutto il necessario</strong> &mdash; guide per l\'host, carte indizio e altro',
    cta: 'Crea il tuo primo mystery e risparmia il 20%',
    proTipLabel: 'Consiglio:',
    proTipBody: 'Puoi esplorare e creare tutte le bozze di mystery che vuoi, gratuitamente. Il tuo sconto del 20% si applica automaticamente quando sei pronto a generare il pacchetto completo.',
  },
  pt: {
    subject: 'Bem-vindo ao Mystery Maker!',
    greetWithName: (n) => `Bem-vindo, ${n}!`,
    greetNoName: 'Bem-vindo!',
    intro: 'Sua conta está pronta. Veja o que você pode fazer agora:',
    giftKicker: 'Seu presente de boas-vindas',
    amount: '20% DE DESCONTO',
    arrowSuffix: 'no seu primeiro pacote de mistério',
    validity: 'Válido por 7 dias &mdash; aplicado automaticamente no checkout',
    feat1: '<strong>Crie mistérios personalizados</strong> em minutos com IA',
    feat2: '<strong>Escolha qualquer tema</strong> &mdash; de mansões vitorianas a estações espaciais',
    feat3: '<strong>Envie os personagens</strong> diretamente para seus convidados',
    feat4: '<strong>Baixe tudo o que precisar</strong> &mdash; guias para o anfitrião, cartas de pistas e mais',
    cta: 'Crie seu primeiro mistério e economize 20%',
    proTipLabel: 'Dica:',
    proTipBody: 'Você pode explorar e criar quantos rascunhos de mistério quiser, de graça. Seu desconto de 20% é aplicado automaticamente quando você estiver pronto para gerar o pacote completo da festa.',
  },
  nl: {
    subject: 'Welkom bij Mystery Maker!',
    greetWithName: (n) => `Welkom, ${n}!`,
    greetNoName: 'Welkom!',
    intro: 'Je account is klaar. Dit kun je nu doen:',
    giftKicker: 'Je welkomstcadeau',
    amount: '20% KORTING',
    arrowSuffix: 'op je eerste mysterypakket',
    validity: '7 dagen geldig &mdash; wordt automatisch toegepast bij het afrekenen',
    feat1: '<strong>Maak eigen mysteries</strong> in een paar minuten met AI',
    feat2: '<strong>Kies elk thema</strong> &mdash; van Victoriaanse landhuizen tot ruimtestations',
    feat3: '<strong>Stuur de rollen</strong> rechtstreeks naar je gasten',
    feat4: '<strong>Download alles wat je nodig hebt</strong> &mdash; gastheergidsen, aanwijzingskaarten en meer',
    cta: 'Maak je eerste mystery en bespaar 20%',
    proTipLabel: 'Tip:',
    proTipBody: 'Je kunt gratis zoveel mystery-concepten maken als je wilt. Je 20% korting wordt automatisch toegepast zodra je het volledige feestpakket genereert.',
  },
  da: {
    subject: 'Velkommen til Mystery Maker!',
    greetWithName: (n) => `Velkommen, ${n}!`,
    greetNoName: 'Velkommen!',
    intro: 'Din konto er klar. Her er, hvad du kan gøre nu:',
    giftKicker: 'Din velkomstgave',
    amount: '20% RABAT',
    arrowSuffix: 'på din første mysteriepakke',
    validity: 'Gælder i 7 dage &mdash; bruges automatisk ved bestilling',
    feat1: '<strong>Lav dine egne mysterier</strong> på få minutter med AI',
    feat2: '<strong>Vælg et hvilket som helst tema</strong> &mdash; fra viktorianske herregårde til rumstationer',
    feat3: '<strong>Send roller</strong> direkte til dine gæster',
    feat4: '<strong>Hent alt, du har brug for</strong> &mdash; værtsguides, sporkort og meget mere',
    cta: 'Lav dit første mysterium og spar 20%',
    proTipLabel: 'Tip:',
    proTipBody: 'Du kan udforske og lave så mange mysterieudkast, du vil &mdash; helt gratis. Din 20% rabat aktiveres automatisk, når du er klar til at generere den fulde festpakke.',
  },
  sv: {
    subject: 'Välkommen till Mystery Maker!',
    greetWithName: (n) => `Välkommen, ${n}!`,
    greetNoName: 'Välkommen!',
    intro: 'Ditt konto är klart. Det här kan du göra nu:',
    giftKicker: 'Din välkomstgåva',
    amount: '20% RABATT',
    arrowSuffix: 'på ditt första mysteriepaket',
    validity: 'Gäller i 7 dagar &mdash; dras automatiskt i kassan',
    feat1: '<strong>Skapa egna mysterier</strong> på några minuter med AI',
    feat2: '<strong>Välj vilket tema som helst</strong> &mdash; från viktorianska herrgårdar till rymdstationer',
    feat3: '<strong>Skicka rollerna</strong> direkt till dina gäster',
    feat4: '<strong>Ladda ner allt du behöver</strong> &mdash; värdguider, ledtrådskort och mer',
    cta: 'Skapa ditt första mysterium och spara 20%',
    proTipLabel: 'Tips:',
    proTipBody: 'Du kan utforska och skapa hur många mysterieutkast du vill &mdash; helt gratis. Din 20%-rabatt dras automatiskt när du är redo att generera hela festpaketet.',
  },
  fi: {
    subject: 'Tervetuloa Mystery Makeriin!',
    greetWithName: (n) => `Tervetuloa, ${n}!`,
    greetNoName: 'Tervetuloa!',
    intro: 'Tilisi on valmis. Näin pääset alkuun:',
    giftKicker: 'Tervetuliaislahjasi',
    amount: '-20 %',
    arrowSuffix: 'ensimmäisestä mysteeripaketistasi',
    validity: 'Voimassa 7 päivää &mdash; vähennetään automaattisesti kassalla',
    feat1: '<strong>Luo omia mysteerejä</strong> minuuteissa tekoälyn avulla',
    feat2: '<strong>Valitse mikä tahansa teema</strong> &mdash; viktoriaanisesta kartanosta avaruusasemalle',
    feat3: '<strong>Lähetä roolit</strong> suoraan vieraillesi',
    feat4: '<strong>Lataa kaikki, mitä tarvitset</strong> &mdash; isännän oppaat, vihjekortit ja muuta',
    cta: 'Luo ensimmäinen mysteerisi ja säästä 20 %',
    proTipLabel: 'Vinkki:',
    proTipBody: 'Voit tutkia ja luoda mysteeriluonnoksia ilmaiseksi niin paljon kuin haluat. 20 %:n alennuksesi otetaan automaattisesti käyttöön, kun olet valmis luomaan koko juhlapaketin.',
  },
  ko: {
    subject: 'Mystery Maker에 오신 것을 환영합니다!',
    greetWithName: (n) => `${n}님, 환영합니다!`,
    greetNoName: '환영합니다!',
    intro: '계정이 준비되었습니다. 지금 바로 이런 것들을 해보세요:',
    giftKicker: '환영 선물',
    amount: '20% 할인',
    arrowSuffix: '첫 미스터리 패키지에 적용',
    validity: '7일간 유효 &mdash; 결제 시 자동 적용',
    feat1: '<strong>나만의 미스터리</strong>를 AI로 몇 분 만에 만들기',
    feat2: '<strong>원하는 테마 선택</strong> &mdash; 빅토리아 시대 저택부터 우주 정거장까지',
    feat3: '<strong>캐릭터 배정</strong>을 손님들에게 바로 전송',
    feat4: '<strong>필요한 모든 자료 다운로드</strong> &mdash; 호스트 가이드, 단서 카드 등',
    cta: '첫 미스터리 만들고 20% 절약하기',
    proTipLabel: '팁:',
    proTipBody: '미스터리 초안은 무료로 원하는 만큼 만들고 살펴볼 수 있습니다. 전체 파티 패키지를 생성할 준비가 되면 20% 할인이 자동으로 적용됩니다.',
  },
  ja: {
    subject: 'Mystery Makerへようこそ！',
    greetWithName: (n) => `${n}さん、ようこそ！`,
    greetNoName: 'ようこそ！',
    intro: 'アカウントの準備が整いました。さっそくこちらをお試しください。',
    giftKicker: 'ウェルカムギフト',
    amount: '20%OFF',
    arrowSuffix: '最初のミステリーパッケージに適用',
    validity: '7日間有効 &mdash; お会計時に自動適用',
    feat1: '<strong>オリジナルのミステリー</strong>をAIで数分で作成',
    feat2: '<strong>お好きなテーマを自由に選択</strong> &mdash; ヴィクトリア朝の邸宅から宇宙ステーションまで',
    feat3: '<strong>キャラクター情報</strong>をゲストに直接送信',
    feat4: '<strong>必要なものをすべてダウンロード</strong> &mdash; ホストガイド、手がかりカードなど',
    cta: '最初のミステリーを作成して20%OFFを獲得',
    proTipLabel: 'ワンポイント：',
    proTipBody: 'ミステリーの下書きは何度でも無料でお試しいただけます。完全版のパッケージを生成する準備ができたら、20%OFFが自動で適用されます。',
  },
  'zh-cn': {
    subject: '欢迎来到 Mystery Maker！',
    greetWithName: (n) => `${n}，欢迎你！`,
    greetNoName: '欢迎你！',
    intro: '你的账号已准备就绪。现在你可以这样开始：',
    giftKicker: '专属欢迎礼',
    amount: '8折优惠',
    arrowSuffix: '首个谋杀谜案套装',
    validity: '7天内有效 &mdash; 结账时自动抵扣',
    feat1: '<strong>用AI在几分钟内</strong>创建专属谜案',
    feat2: '<strong>任选主题</strong> &mdash; 从维多利亚庄园到太空站',
    feat3: '<strong>角色分配</strong>一键发送给你的宾客',
    feat4: '<strong>下载全套资料</strong> &mdash; 主持人手册、线索卡等等',
    cta: '创建首个谜案，立享8折',
    proTipLabel: '小贴士：',
    proTipBody: '你可以免费创建任意数量的谜案草稿尽情探索。当你准备好生成完整派对套装时，8折优惠会自动应用。',
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_email, user_name, language } = await req.json();

    if (!user_email) {
      throw new Error("user_email is required");
    }

    const locale: Locale = normalizeLocale(language);
    const t = pickByLocale(T, locale);
    const greeting = user_name ? t.greetWithName(user_name) : t.greetNoName;

    // Send welcome email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: user_email,
        subject: t.subject,
        html: `
          <!DOCTYPE html>
          <html lang="${locale}">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">

            <!-- Header -->
            <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
            </div>

            <!-- Content -->
            <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
              <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">${greeting}</h2>

              <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
                ${t.intro}
              </p>

              <!-- Welcome discount banner -->
              <div style="background: #000000; border: 2px solid #C81400; padding: 24px; margin: 25px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 6px 0; color: rgba(245,240,232,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                  ${t.giftKicker}
                </p>
                <p style="margin: 0 0 10px 0; color: #F5F0E8; font-size: 28px; font-weight: 700;">
                  ${t.amount}
                </p>
                <p style="margin: 0 0 8px 0; color: #F5F0E8; font-size: 16px;">
                  <span style="text-decoration: line-through; color: rgba(245,240,232,0.4);">$24.99</span>
                  &nbsp;&rarr;&nbsp;
                  <span style="color: #C81400; font-weight: 700;">$19.99</span>
                  ${t.arrowSuffix}
                </p>
                <p style="margin: 0; color: rgba(245,240,232,0.5); font-size: 13px;">
                  ${t.validity}
                </p>
              </div>

              <!-- Feature list -->
              <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">
                  &#10024; ${t.feat1}
                </p>
                <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">
                  &#127917; ${t.feat2}
                </p>
                <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">
                  &#128231; ${t.feat3}
                </p>
                <p style="margin: 0; color: #F5F0E8; font-size: 15px;">
                  &#128229; ${t.feat4}
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://www.mysterymaker.party/mystery/create?utm_source=welcome_email&utm_medium=email&utm_campaign=onboarding" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  ${t.cta}
                </a>
              </div>

              <!-- Helpful tip -->
              <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1); line-height: 1.6;">
                <strong style="color: rgba(245,240,232,0.7);">${t.proTipLabel}</strong> ${t.proTipBody}
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
              <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log(`Welcome email sent (${locale}):`, data);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent", locale }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
