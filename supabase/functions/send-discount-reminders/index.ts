import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type Locale, normalizeLocale, pickByLocale } from "../_shared/email-i18n.ts";

/**
 * Edge Function: send-discount-reminders
 *
 * Called by a daily pg_cron job. Sends two reminder emails:
 * - Day 5 (48h before expiry): Friendly nudge
 * - Day 7 morning (hours before expiry): Final urgency
 *
 * Only sends to users who haven't purchased yet. Rendered in
 * profiles.language with 'en' fallback.
 */

interface ReminderStrings {
  subjectDay5: string;
  subjectDay7Tonight: string; // > 12h
  subjectDay7Hours: string;   // <= 12h
  headingDay5: string;
  headingDay7: string;
  greeting: (name: string) => string;
  urgencyDay5: string;
  urgencyDay7Tonight: string;
  urgencyDay7Hours: string;
  discountLabel: string;
  pitch: string;
  ctaDay5: string;
  ctaDay7: string;
  footnote: string;
}

const T: Record<Locale, ReminderStrings> = {
  en: {
    subjectDay5: 'Your 20% welcome discount expires in 2 days',
    subjectDay7Tonight: 'Your 20% discount expires tonight',
    subjectDay7Hours: 'Your 20% discount expires in a few hours',
    headingDay5: "Don't forget your 20% discount!",
    headingDay7: 'Last chance for 20% off!',
    greeting: (n) => `Hey ${n}, `,
    urgencyDay5: 'you still have 2 days to claim your exclusive welcome discount.',
    urgencyDay7Tonight: 'your welcome discount expires tonight &mdash; this is your last chance to save.',
    urgencyDay7Hours: 'your welcome discount expires in just a few hours &mdash; this is your last chance to save.',
    discountLabel: 'Your exclusive 20% welcome discount',
    pitch: 'Create a custom murder mystery party with unique characters, clue cards, and a complete host guide &mdash; all generated in minutes.',
    ctaDay5: 'Create Your Mystery Now',
    ctaDay7: "Claim Your Discount Before It's Gone",
    footnote: 'Your discount is automatically applied at checkout &mdash; no code needed. Just create your mystery and the savings are waiting.',
  },
  es: {
    subjectDay5: 'Tu descuento de bienvenida del 20% caduca en 2 días',
    subjectDay7Tonight: 'Tu descuento del 20% caduca esta noche',
    subjectDay7Hours: 'Tu descuento del 20% caduca en unas horas',
    headingDay5: '¡No olvides tu 20% de descuento!',
    headingDay7: '¡Última oportunidad para el 20% de descuento!',
    greeting: (n) => `${n}, `,
    urgencyDay5: 'todavía te quedan 2 días para usar tu descuento exclusivo de bienvenida.',
    urgencyDay7Tonight: 'tu descuento de bienvenida caduca esta noche &mdash; es tu última oportunidad para ahorrar.',
    urgencyDay7Hours: 'tu descuento de bienvenida caduca en unas horas &mdash; es tu última oportunidad para ahorrar.',
    discountLabel: 'Tu descuento exclusivo de bienvenida del 20%',
    pitch: 'Crea una fiesta de misterio a medida con personajes únicos, cartas de pistas y una guía completa para el anfitrión &mdash; todo generado en minutos.',
    ctaDay5: 'Crea tu misterio ahora',
    ctaDay7: 'Aprovecha tu descuento antes de que caduque',
    footnote: 'Tu descuento se aplica automáticamente al pagar &mdash; sin códigos. Solo crea tu misterio y el ahorro te estará esperando.',
  },
  fr: {
    subjectDay5: 'Votre réduction de bienvenue de 20 % expire dans 2 jours',
    subjectDay7Tonight: 'Votre réduction de 20 % expire ce soir',
    subjectDay7Hours: 'Votre réduction de 20 % expire dans quelques heures',
    headingDay5: "N'oubliez pas votre réduction de 20 % !",
    headingDay7: 'Dernière chance pour 20 % de réduction !',
    greeting: (n) => `Bonjour ${n}, `,
    urgencyDay5: 'il vous reste 2 jours pour profiter de votre réduction de bienvenue exclusive.',
    urgencyDay7Tonight: 'votre réduction de bienvenue expire ce soir &mdash; c\'est votre dernière chance d\'en profiter.',
    urgencyDay7Hours: 'votre réduction de bienvenue expire dans quelques heures &mdash; c\'est votre dernière chance d\'en profiter.',
    discountLabel: 'Votre réduction de bienvenue exclusive de 20 %',
    pitch: 'Créez une soirée meurtre et mystère sur mesure avec des personnages uniques, des cartes d\'indices et un guide complet pour l\'hôte &mdash; le tout généré en quelques minutes.',
    ctaDay5: 'Créer mon mystère maintenant',
    ctaDay7: 'Profiter de la réduction avant la fin',
    footnote: 'Votre réduction est appliquée automatiquement au paiement &mdash; aucun code requis. Créez simplement votre mystère et les économies vous attendent.',
  },
  de: {
    subjectDay5: 'Dein 20 %-Willkommensrabatt läuft in 2 Tagen ab',
    subjectDay7Tonight: 'Dein 20 %-Rabatt läuft heute Abend ab',
    subjectDay7Hours: 'Dein 20 %-Rabatt läuft in wenigen Stunden ab',
    headingDay5: 'Vergiss deinen 20 %-Rabatt nicht!',
    headingDay7: 'Letzte Chance auf 20 % Rabatt!',
    greeting: (n) => `Hey ${n}, `,
    urgencyDay5: 'du hast noch 2 Tage Zeit, deinen exklusiven Willkommensrabatt einzulösen.',
    urgencyDay7Tonight: 'dein Willkommensrabatt läuft heute Abend ab &mdash; das ist deine letzte Chance zum Sparen.',
    urgencyDay7Hours: 'dein Willkommensrabatt läuft in wenigen Stunden ab &mdash; das ist deine letzte Chance zum Sparen.',
    discountLabel: 'Dein exklusiver 20 %-Willkommensrabatt',
    pitch: 'Erstelle eine maßgeschneiderte Krimi-Party mit eigenen Charakteren, Hinweiskarten und einem vollständigen Gastgeber-Guide &mdash; alles in wenigen Minuten generiert.',
    ctaDay5: 'Jetzt Krimi erstellen',
    ctaDay7: 'Rabatt sichern, bevor er weg ist',
    footnote: 'Dein Rabatt wird an der Kasse automatisch abgezogen &mdash; kein Code nötig. Erstelle einfach deinen Krimi und die Ersparnis wartet auf dich.',
  },
  it: {
    subjectDay5: 'Il tuo sconto di benvenuto del 20% scade tra 2 giorni',
    subjectDay7Tonight: 'Il tuo sconto del 20% scade stasera',
    subjectDay7Hours: 'Il tuo sconto del 20% scade tra poche ore',
    headingDay5: 'Non dimenticare il tuo 20% di sconto!',
    headingDay7: 'Ultima occasione per il 20% di sconto!',
    greeting: (n) => `Ciao ${n}, `,
    urgencyDay5: 'hai ancora 2 giorni per usare il tuo sconto di benvenuto esclusivo.',
    urgencyDay7Tonight: 'il tuo sconto di benvenuto scade stasera &mdash; è la tua ultima chance per risparmiare.',
    urgencyDay7Hours: 'il tuo sconto di benvenuto scade tra poche ore &mdash; è la tua ultima chance per risparmiare.',
    discountLabel: 'Il tuo sconto di benvenuto esclusivo del 20%',
    pitch: 'Crea una festa di murder mystery su misura con personaggi unici, carte indizio e una guida completa per l\'host &mdash; tutto generato in pochi minuti.',
    ctaDay5: 'Crea ora il tuo mystery',
    ctaDay7: 'Approfitta dello sconto prima che scada',
    footnote: 'Lo sconto si applica automaticamente al checkout &mdash; nessun codice da inserire. Crea il tuo mystery e il risparmio ti sta aspettando.',
  },
  pt: {
    subjectDay5: 'Seu desconto de boas-vindas de 20% expira em 2 dias',
    subjectDay7Tonight: 'Seu desconto de 20% expira hoje à noite',
    subjectDay7Hours: 'Seu desconto de 20% expira em algumas horas',
    headingDay5: 'Não esqueça seu desconto de 20%!',
    headingDay7: 'Última chance de garantir 20% de desconto!',
    greeting: (n) => `Oi ${n}, `,
    urgencyDay5: 'você ainda tem 2 dias para usar seu desconto exclusivo de boas-vindas.',
    urgencyDay7Tonight: 'seu desconto de boas-vindas expira hoje à noite &mdash; é sua última chance de economizar.',
    urgencyDay7Hours: 'seu desconto de boas-vindas expira em algumas horas &mdash; é sua última chance de economizar.',
    discountLabel: 'Seu desconto exclusivo de boas-vindas de 20%',
    pitch: 'Crie uma festa de mistério personalizada com personagens únicos, cartas de pistas e um guia completo para o anfitrião &mdash; tudo gerado em minutos.',
    ctaDay5: 'Crie seu mistério agora',
    ctaDay7: 'Garanta seu desconto antes que acabe',
    footnote: 'Seu desconto é aplicado automaticamente no checkout &mdash; sem precisar de código. É só criar seu mistério e a economia está te esperando.',
  },
  nl: {
    subjectDay5: 'Je welkomstkorting van 20% verloopt over 2 dagen',
    subjectDay7Tonight: 'Je 20% korting verloopt vanavond',
    subjectDay7Hours: 'Je 20% korting verloopt over een paar uur',
    headingDay5: 'Vergeet je 20% korting niet!',
    headingDay7: 'Laatste kans op 20% korting!',
    greeting: (n) => `Hé ${n}, `,
    urgencyDay5: 'je hebt nog 2 dagen om je exclusieve welkomstkorting te gebruiken.',
    urgencyDay7Tonight: 'je welkomstkorting verloopt vanavond &mdash; dit is je laatste kans om te besparen.',
    urgencyDay7Hours: 'je welkomstkorting verloopt over een paar uur &mdash; dit is je laatste kans om te besparen.',
    discountLabel: 'Jouw exclusieve welkomstkorting van 20%',
    pitch: 'Maak een eigen moordmystery-feest met unieke personages, aanwijzingskaarten en een complete gastheergids &mdash; allemaal in een paar minuten gegenereerd.',
    ctaDay5: 'Maak nu je mystery',
    ctaDay7: 'Pak je korting voordat hij weg is',
    footnote: 'Je korting wordt automatisch toegepast bij het afrekenen &mdash; geen code nodig. Maak gewoon je mystery en de korting staat klaar.',
  },
  da: {
    subjectDay5: 'Din 20 % velkomstrabat udløber om 2 dage',
    subjectDay7Tonight: 'Din 20 % rabat udløber i aften',
    subjectDay7Hours: 'Din 20 % rabat udløber om få timer',
    headingDay5: 'Glem ikke din 20 % rabat!',
    headingDay7: 'Sidste chance for 20 % rabat!',
    greeting: (n) => `Hej ${n}, `,
    urgencyDay5: 'du har stadig 2 dage til at bruge din eksklusive velkomstrabat.',
    urgencyDay7Tonight: 'din velkomstrabat udløber i aften &mdash; det er din sidste chance for at spare.',
    urgencyDay7Hours: 'din velkomstrabat udløber om få timer &mdash; det er din sidste chance for at spare.',
    discountLabel: 'Din eksklusive 20 % velkomstrabat',
    pitch: 'Lav en skræddersyet mordmysteriefest med unikke roller, sporkort og en komplet værtsguide &mdash; alt sammen lavet på få minutter.',
    ctaDay5: 'Lav dit mysterium nu',
    ctaDay7: 'Brug din rabat, før den er væk',
    footnote: 'Rabatten trækkes automatisk ved bestilling &mdash; ingen kode nødvendig. Lav bare dit mysterium, så er besparelsen klar.',
  },
  sv: {
    subjectDay5: 'Din 20 % välkomstrabatt går ut om 2 dagar',
    subjectDay7Tonight: 'Din 20 % rabatt går ut ikväll',
    subjectDay7Hours: 'Din 20 % rabatt går ut om några timmar',
    headingDay5: 'Glöm inte din 20 % rabatt!',
    headingDay7: 'Sista chansen för 20 % rabatt!',
    greeting: (n) => `Hej ${n}, `,
    urgencyDay5: 'du har fortfarande 2 dagar på dig att använda din exklusiva välkomstrabatt.',
    urgencyDay7Tonight: 'din välkomstrabatt går ut ikväll &mdash; det här är din sista chans att spara.',
    urgencyDay7Hours: 'din välkomstrabatt går ut om några timmar &mdash; det här är din sista chans att spara.',
    discountLabel: 'Din exklusiva välkomstrabatt på 20 %',
    pitch: 'Skapa ett egen mordmysterium-fest med unika roller, ledtrådskort och en komplett värdguide &mdash; allt genererat på några minuter.',
    ctaDay5: 'Skapa ditt mysterium nu',
    ctaDay7: 'Ta din rabatt innan den försvinner',
    footnote: 'Rabatten dras automatiskt i kassan &mdash; ingen kod behövs. Skapa bara ditt mysterium så väntar besparingen.',
  },
  fi: {
    subjectDay5: '20 %:n tervetuloalennuksesi päättyy 2 päivän kuluttua',
    subjectDay7Tonight: '20 %:n alennuksesi päättyy tänä iltana',
    subjectDay7Hours: '20 %:n alennuksesi päättyy muutaman tunnin kuluttua',
    headingDay5: 'Älä unohda 20 %:n alennustasi!',
    headingDay7: 'Viimeinen mahdollisuus 20 %:n alennukseen!',
    greeting: (n) => `Hei ${n}, `,
    urgencyDay5: 'sinulla on vielä 2 päivää aikaa käyttää eksklusiivinen tervetuloalennuksesi.',
    urgencyDay7Tonight: 'tervetuloalennuksesi päättyy tänä iltana &mdash; tämä on viimeinen tilaisuutesi säästää.',
    urgencyDay7Hours: 'tervetuloalennuksesi päättyy muutaman tunnin kuluttua &mdash; tämä on viimeinen tilaisuutesi säästää.',
    discountLabel: 'Eksklusiivinen 20 %:n tervetuloalennuksesi',
    pitch: 'Luo räätälöity murhamysteerijuhla omine hahmoineen, vihjekortteineen ja täydellisen isäntäoppaan kera &mdash; kaikki valmiina muutamassa minuutissa.',
    ctaDay5: 'Luo mysteerisi nyt',
    ctaDay7: 'Lunasta alennus ennen kuin se katoaa',
    footnote: 'Alennus käytetään automaattisesti kassalla &mdash; koodia ei tarvita. Luo vain mysteerisi, ja säästöt ovat valmiina.',
  },
  ko: {
    subjectDay5: '20% 환영 할인이 2일 뒤 만료됩니다',
    subjectDay7Tonight: '20% 할인이 오늘 밤 만료됩니다',
    subjectDay7Hours: '20% 할인이 몇 시간 후 만료됩니다',
    headingDay5: '20% 할인을 잊지 마세요!',
    headingDay7: '20% 할인 마지막 기회입니다!',
    greeting: (n) => `${n}님, `,
    urgencyDay5: '아직 2일 동안 환영 할인을 사용할 수 있습니다.',
    urgencyDay7Tonight: '환영 할인이 오늘 밤 만료됩니다 &mdash; 절약할 수 있는 마지막 기회예요.',
    urgencyDay7Hours: '환영 할인이 몇 시간 후 만료됩니다 &mdash; 절약할 수 있는 마지막 기회예요.',
    discountLabel: '회원님만을 위한 20% 환영 할인',
    pitch: '나만의 캐릭터, 단서 카드, 호스트 가이드까지 포함한 머더 미스터리 파티 패키지를 단 몇 분 만에 만들어 보세요.',
    ctaDay5: '지금 미스터리 만들기',
    ctaDay7: '할인 만료 전에 사용하기',
    footnote: '할인은 결제 시 자동 적용됩니다 &mdash; 별도 코드는 필요 없어요. 미스터리를 생성하기만 하면 할인이 그대로 적용됩니다.',
  },
  ja: {
    subjectDay5: '20%のウェルカム割引はあと2日で終了します',
    subjectDay7Tonight: '20%割引は今夜終了します',
    subjectDay7Hours: '20%割引はあと数時間で終了します',
    headingDay5: '20%割引をお忘れなく！',
    headingDay7: '20%OFFはこれが最後のチャンスです！',
    greeting: (n) => `${n}さん、`,
    urgencyDay5: '専用のウェルカム割引はあと2日間ご利用いただけます。',
    urgencyDay7Tonight: 'ウェルカム割引は今夜で終了します &mdash; お得にご利用いただける最後のチャンスです。',
    urgencyDay7Hours: 'ウェルカム割引はあと数時間で終了します &mdash; お得にご利用いただける最後のチャンスです。',
    discountLabel: 'お客様限定の20%ウェルカム割引',
    pitch: 'オリジナルのキャラクターと手がかりカード、完全なホストガイドを備えたマーダーミステリーパーティーを、たった数分で作成できます。',
    ctaDay5: 'ミステリーを今すぐ作成',
    ctaDay7: '終了前に割引を利用する',
    footnote: '割引はお会計時に自動適用されます &mdash; コードの入力は不要です。ミステリーを作成するだけで、お得な割引がそのまま反映されます。',
  },
  'zh-cn': {
    subjectDay5: '你的8折欢迎优惠将在2天后到期',
    subjectDay7Tonight: '你的8折优惠今晚到期',
    subjectDay7Hours: '你的8折优惠几小时后就到期了',
    headingDay5: '别错过你的8折优惠！',
    headingDay7: '8折优惠最后的机会！',
    greeting: (n) => `${n}，`,
    urgencyDay5: '你还有2天时间使用专属欢迎优惠。',
    urgencyDay7Tonight: '你的欢迎优惠今晚就到期了 &mdash; 这是你最后一次省钱的机会。',
    urgencyDay7Hours: '你的欢迎优惠几小时后就到期了 &mdash; 这是你最后一次省钱的机会。',
    discountLabel: '你的专属8折欢迎优惠',
    pitch: '创建一场专属的谋杀谜案派对，自带独一无二的角色、线索卡和完整的主持人手册 &mdash; 几分钟就能搞定。',
    ctaDay5: '现在就创建你的谜案',
    ctaDay7: '在优惠失效前赶紧领取',
    footnote: '结账时优惠会自动应用 &mdash; 不需要任何兑换码。只要创建谜案，省钱就在等着你。',
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
    const now = new Date();

    // Find users with active welcome discounts who haven't purchased
    // Day 5 reminder: expires_at is between 24h and 48h from now
    // Day 7 reminder: expires_at is between 0 and 24h from now
    const { data: eligibleUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("id, language, welcome_promo_code, welcome_promo_expires_at, discount_reminder_day5_sent, discount_reminder_day7_sent")
      .not("welcome_promo_code", "is", null)
      .gt("welcome_promo_expires_at", now.toISOString());

    if (fetchError) throw fetchError;

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No eligible users" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of eligibleUsers) {
      try {
        const expiresAt = new Date(profile.welcome_promo_expires_at);
        const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Determine which reminder to send
        let reminderType: "day5" | "day7" | null = null;

        if (hoursUntilExpiry <= 48 && hoursUntilExpiry > 24 && !profile.discount_reminder_day5_sent) {
          reminderType = "day5";
        } else if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0 && !profile.discount_reminder_day7_sent) {
          reminderType = "day7";
        }

        if (!reminderType) continue;

        // Check if user has purchased
        const { data: purchases } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", profile.id)
          .eq("is_paid", true)
          .limit(1);

        if (purchases && purchases.length > 0) continue;

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        const userEmail = userData?.user?.email;
        if (!userEmail) continue;

        const userName = userData?.user?.user_metadata?.full_name
          || userData?.user?.user_metadata?.name
          || userEmail.split("@")[0];

        const locale: Locale = normalizeLocale(profile.language);
        const t = pickByLocale(T, locale);

        const hoursLeft = Math.round(hoursUntilExpiry);
        const isHours = hoursLeft <= 12;

        const subject = reminderType === "day5"
          ? t.subjectDay5
          : (isHours ? t.subjectDay7Hours : t.subjectDay7Tonight);

        const htmlBody = buildReminderEmail(locale, t, userName, reminderType, isHours);

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [userEmail],
            subject,
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          errors.push(`${profile.id}: Resend error ${resendResponse.status}`);
          console.error(`Failed to send reminder for ${profile.id}:`, errorText);
          continue;
        }

        // Mark reminder as sent
        const updateField = reminderType === "day5"
          ? { discount_reminder_day5_sent: true }
          : { discount_reminder_day7_sent: true };

        await supabase
          .from("profiles")
          .update(updateField)
          .eq("id", profile.id);

        sentCount++;
        console.log(`Sent ${reminderType} discount reminder (${locale}) to ${profile.id}`);
      } catch (err) {
        errors.push(`${profile.id}: ${err.message}`);
        console.error(`Error processing ${profile.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: eligibleUsers.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-discount-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildReminderEmail(
  locale: Locale,
  t: ReminderStrings,
  name: string,
  type: "day5" | "day7",
  isHours: boolean
): string {
  const heading = type === "day5" ? t.headingDay5 : t.headingDay7;
  const urgency = type === "day5"
    ? t.urgencyDay5
    : (isHours ? t.urgencyDay7Hours : t.urgencyDay7Tonight);
  const cta = type === "day5" ? t.ctaDay5 : t.ctaDay7;

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">

      <!-- Header -->
      <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
      </div>

      <!-- Content -->
      <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
        <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">
          ${heading}
        </h2>

        <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
          ${t.greeting(name)}${urgency}
        </p>

        <!-- Discount callout -->
        <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #F5F0E8; font-size: 18px; font-weight: 700;">
            <span style="text-decoration: line-through; color: rgba(245,240,232,0.5);">$24.99</span>
            &nbsp;&rarr;&nbsp;
            <span style="color: #C81400;">$19.99</span>
          </p>
          <p style="margin: 0; color: rgba(245,240,232,0.5); font-size: 14px;">
            ${t.discountLabel}
          </p>
        </div>

        <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 25px; line-height: 1.6;">
          ${t.pitch}
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.mysterymaker.party/dashboard?utm_source=discount_reminder&utm_medium=email&utm_campaign=${type}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${cta}
          </a>
        </div>

        <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1); line-height: 1.6;">
          ${t.footnote}
        </p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
        <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
      </div>
    </body>
    </html>
  `;
}
