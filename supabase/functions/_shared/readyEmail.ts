// Pure builder for the "your mystery is ready" email in the customer's language (ADR-0152 follow-up). No Deno APIs: tested with plain node
// (readyEmail.test.mjs). The language is chosen by the caller (the package's own text first, the profile language second, English last).
import { type Locale } from "./email-i18n.ts";

type Strings = {
  subject: string;
  heading: string;
  withName: (name: string, title: string) => string;
  noName: (title: string) => string;
  cta: string;
};

const T: Record<Locale, Strings> = {
  en: { subject: "Your Mystery is Ready!", heading: "Your Mystery Has Been Generated!",
    withName: (n, t) => `Hi ${n}, great news! Your murder mystery "${t}" is ready and waiting for you.`,
    noName: (t) => `Great news! Your murder mystery "${t}" is ready and waiting for you.`, cta: "View Your Mystery" },
  es: { subject: "¡Tu misterio está listo!", heading: "¡Tu misterio ha sido generado!",
    withName: (n, t) => `Hola ${n}, ¡buenas noticias! Tu misterio de asesinato "${t}" está listo y te está esperando.`,
    noName: (t) => `¡Buenas noticias! Tu misterio de asesinato "${t}" está listo y te está esperando.`, cta: "Ver tu misterio" },
  fr: { subject: "Votre mystère est prêt !", heading: "Votre mystère a été généré !",
    withName: (n, t) => `Bonjour ${n}, bonne nouvelle ! Votre mystère « ${t} » est prêt et vous attend.`,
    noName: (t) => `Bonne nouvelle ! Votre mystère « ${t} » est prêt et vous attend.`, cta: "Voir votre mystère" },
  de: { subject: "Dein Krimi ist fertig!", heading: "Dein Krimi wurde erstellt!",
    withName: (n, t) => `Hallo ${n}, gute Neuigkeiten! Dein Krimi „${t}“ ist fertig und wartet auf dich.`,
    noName: (t) => `Gute Neuigkeiten! Dein Krimi „${t}“ ist fertig und wartet auf dich.`, cta: "Zu deinem Krimi" },
  it: { subject: "Il tuo mystery è pronto!", heading: "Il tuo mystery è stato generato!",
    withName: (n, t) => `Ciao ${n}, ottime notizie! Il tuo mystery "${t}" è pronto e ti aspetta.`,
    noName: (t) => `Ottime notizie! Il tuo mystery "${t}" è pronto e ti aspetta.`, cta: "Vedi il tuo mystery" },
  pt: { subject: "Seu mistério está pronto!", heading: "Seu mistério foi gerado!",
    withName: (n, t) => `Olá, ${n}! Boas notícias! Seu mistério "${t}" está pronto e esperando por você.`,
    noName: (t) => `Boas notícias! Seu mistério "${t}" está pronto e esperando por você.`, cta: "Ver seu mistério" },
  nl: { subject: "Je mystery is klaar!", heading: "Je mystery is gegenereerd!",
    withName: (n, t) => `Hoi ${n}, goed nieuws! Je mystery "${t}" is klaar en wacht op je.`,
    noName: (t) => `Goed nieuws! Je mystery "${t}" is klaar en wacht op je.`, cta: "Bekijk je mystery" },
  da: { subject: "Dit mysterium er klar!", heading: "Dit mysterium er blevet genereret!",
    withName: (n, t) => `Hej ${n}, gode nyheder! Dit mordmysterium "${t}" er klar og venter på dig.`,
    noName: (t) => `Gode nyheder! Dit mordmysterium "${t}" er klar og venter på dig.`, cta: "Se dit mysterium" },
  sv: { subject: "Ditt mysterium är klart!", heading: "Ditt mysterium har skapats!",
    withName: (n, t) => `Hej ${n}, goda nyheter! Ditt mordmysterium "${t}" är klart och väntar på dig.`,
    noName: (t) => `Goda nyheter! Ditt mordmysterium "${t}" är klart och väntar på dig.`, cta: "Se ditt mysterium" },
  fi: { subject: "Mysteerisi on valmis!", heading: "Mysteerisi on luotu!",
    withName: (n, t) => `Hei ${n}, hyviä uutisia! Murhamysteerisi "${t}" on valmis ja odottaa sinua.`,
    noName: (t) => `Hyviä uutisia! Murhamysteerisi "${t}" on valmis ja odottaa sinua.`, cta: "Katso mysteerisi" },
  ko: { subject: "미스터리가 준비되었습니다!", heading: "미스터리가 생성되었습니다!",
    withName: (n, t) => `안녕하세요 ${n}님, 좋은 소식입니다! 머더 미스터리 "${t}" 준비가 완료되었습니다. 지금 확인해 보세요.`,
    noName: (t) => `좋은 소식입니다! 머더 미스터리 "${t}" 준비가 완료되었습니다. 지금 확인해 보세요.`, cta: "미스터리 보기" },
  ja: { subject: "ミステリーの準備ができました！", heading: "ミステリーが生成されました！",
    withName: (n, t) => `${n}さん、お待たせしました！マーダーミステリー「${t}」の準備ができました。`,
    noName: (t) => `お待たせしました！マーダーミステリー「${t}」の準備ができました。`, cta: "ミステリーを見る" },
  "zh-cn": { subject: "你的谜案已准备好！", heading: "你的谜案已生成！",
    withName: (n, t) => `你好 ${n}，好消息！你的谋杀谜案“${t}”已准备就绪，等你来玩。`,
    noName: (t) => `好消息！你的谋杀谜案“${t}”已准备就绪，等你来玩。`, cta: "查看你的谜案" },
};

export const READY_EMAIL_LOCALES = Object.keys(T) as Locale[];

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The language the email is written in: the package's own text (what the customer will read), then the profile language, then English. */
export function pickReadyLocale(detected: string | null, profileLocale: Locale): Locale {
  if (detected && detected in T) return detected as Locale;
  return profileLocale;
}

export function buildReadyEmail(locale: Locale, opts: { name: string | null; title: string; conversationId: string }): { subject: string; html: string } {
  const t = T[locale] ?? T.en;
  const title = escapeHtml(opts.title);
  const body = opts.name ? t.withName(escapeHtml(opts.name), title) : t.noName(title);
  const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
        <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
        </div>
        <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
          <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">${t.heading}</h2>
          <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
            ${body}
          </p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://www.mysterymaker.party/mystery/${opts.conversationId}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              ${t.cta}
            </a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
          <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
        </div>
      </body>
      </html>
    `;
  return { subject: t.subject, html };
}
