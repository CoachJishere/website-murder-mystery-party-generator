import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type Locale } from "../_shared/email-i18n.ts";
import { languageOfMasterContext } from "../_shared/packageScaffold.ts";

/**
 * send-adaptation-complete-email — "Remove a Character" (renamed from
 * "Recast" — ADR-0091), ADR-0088. STAGING ONLY.
 *
 * Service-role only, fired-and-forgotten by adapt-mystery-apply's finally
 * block exactly once per batch, at the moment chain-dispatch determines
 * every row in that batch_id has reached a terminal status. Exists because a
 * batch can realistically take several minutes (longer with a
 * murderer/accomplice reassignment in it — a much bigger generation than a
 * plain removal), and the intended UX is non-blocking: the host closes the
 * dialog and keeps using the rest of their mystery rather than staring at a
 * spinner. This email is the reliable way they find out it's done if they've
 * closed the tab (the realtime subscription already wired in MysteryView.tsx
 * covers the case where they're still in-app).
 *
 * Localized in 13 languages (ADR-0161) in the language of the mystery itself
 * (detected from master_context), like the ready email; English when unclear.
 *
 * POST body: { batch_id }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ENABLED = Deno.env.get("ENABLE_GUEST_DROPOUT_ADAPTATION") === "true";

// ---------------------------------------------------------------------------------------------------------------------------------
// Strings (ADR-0161). {t} title, {c} removed character, {p} promoted character, {role} role word. Inline in this function so it stays
// self-contained on a cold start, like the other transactional emails. Informal register; not natively reviewed.
// ---------------------------------------------------------------------------------------------------------------------------------
interface Strings {
  header: string; cta: string; fallbackTitle: string;
  introAll: string; introFail: string; introNeutral: string;
  rDetective: string; rPromoted: string; rPlain: string; rFail: string;
  noticeDetective: string; noticeSlip: string; noticeLabel: string;
  subjectOk: string; subjectMixed: string;
  murderer: string; accomplice: string;
}
const STRINGS: Record<Locale, Strings> = {
  en: { header: "REMOVE A CHARACTER", cta: "View your mystery", fallbackTitle: "your mystery",
    introAll: "Your requested changes to <strong>{t}</strong> are done.",
    introFail: "We finished working on <strong>{t}</strong> — most of it went through, but see below for one that didn't.",
    introNeutral: "We finished working on <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> removed — a key story role was reassigned to another character. The updated Detective Guide has the details.",
    rPromoted: "<strong>{c}</strong> removed — <strong>{p}</strong> is now the {role}.",
    rPlain: "<strong>{c}</strong> removed from every character sheet, the detective script, and evidence cards.",
    rFail: "<strong>{c}</strong> — this one couldn't be safely completed and was left unchanged. Support can help if this keeps happening.",
    noticeDetective: "reassigning a key story role meant rewriting the Detective Guide's Reveal and a confession. If you are not playing a suspect yourself, we recommend reading both once before hosting; if you are, ask a helper who is not playing to do it.",
    noticeSlip: "reassigning who the culprit is meant rewriting the detective script's reveal and a confession — we recommend reading through both once before hosting.",
    noticeLabel: "Worth a skim before the party:", subjectOk: "Done — {t} has been updated", subjectMixed: "{t} — update finished (see details)",
    murderer: "murderer", accomplice: "accomplice" },
  es: { header: "ELIMINAR UN PERSONAJE", cta: "Ver tu misterio", fallbackTitle: "tu misterio",
    introAll: "Los cambios que pediste en <strong>{t}</strong> están listos.",
    introFail: "Terminamos de trabajar en <strong>{t}</strong>: casi todo salió bien, pero abajo verás un cambio que no.",
    introNeutral: "Terminamos de trabajar en <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> eliminado: un papel clave de la historia se reasignó a otro personaje. La Guía del Detective actualizada tiene los detalles.",
    rPromoted: "<strong>{c}</strong> eliminado: <strong>{p}</strong> es ahora el/la {role}.",
    rPlain: "<strong>{c}</strong> eliminado de todas las fichas de personaje, del guion del detective y de las tarjetas de evidencia.",
    rFail: "<strong>{c}</strong>: este cambio no se pudo completar con seguridad y se dejó sin modificar. Soporte puede ayudarte si sigue pasando.",
    noticeDetective: "reasignar un papel clave de la historia obligó a reescribir la Revelación de la Guía del Detective y una confesión. Si no juegas como sospechoso, te recomendamos leer ambas una vez antes de ser anfitrión; si juegas, pide a un ayudante que no participe que lo haga.",
    noticeSlip: "reasignar quién es el culpable obligó a reescribir la revelación del guion del detective y una confesión; te recomendamos leer ambas una vez antes de ser anfitrión.",
    noticeLabel: "Conviene echarle un vistazo antes de la fiesta:", subjectOk: "Listo: {t} se ha actualizado", subjectMixed: "{t}: actualización terminada (ver detalles)",
    murderer: "asesino/a", accomplice: "cómplice" },
  fr: { header: "SUPPRIMER UN PERSONNAGE", cta: "Voir votre mystère", fallbackTitle: "votre mystère",
    introAll: "Les modifications demandées pour <strong>{t}</strong> sont terminées.",
    introFail: "Nous avons terminé le travail sur <strong>{t}</strong> : presque tout est passé, mais un changement n'a pas abouti (voir ci-dessous).",
    introNeutral: "Nous avons terminé le travail sur <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> supprimé(e) : un rôle clé de l'histoire a été réattribué à un autre personnage. Le Guide du détective mis à jour donne les détails.",
    rPromoted: "<strong>{c}</strong> supprimé(e) : <strong>{p}</strong> est désormais le/la {role}.",
    rPlain: "<strong>{c}</strong> retiré(e) de toutes les fiches de personnage, du script du détective et des cartes d'indices.",
    rFail: "<strong>{c}</strong> : ce changement n'a pas pu être terminé en toute sécurité et a été laissé tel quel. Le support peut vous aider si cela se répète.",
    noticeDetective: "réattribuer un rôle clé de l'histoire a obligé à réécrire la Révélation du Guide du détective et une confession. Si vous ne jouez pas un suspect, nous vous conseillons de lire les deux une fois avant de recevoir ; si vous jouez, demandez à un assistant qui ne joue pas de le faire.",
    noticeSlip: "changer qui est le coupable a obligé à réécrire la révélation du script du détective et une confession ; nous vous conseillons de lire les deux une fois avant de recevoir.",
    noticeLabel: "À parcourir avant la soirée :", subjectOk: "C'est fait : {t} a été mis à jour", subjectMixed: "{t} : mise à jour terminée (voir les détails)",
    murderer: "meurtrier(ère)", accomplice: "complice" },
  de: { header: "EINEN CHARAKTER ENTFERNEN", cta: "Dein Rätsel ansehen", fallbackTitle: "dein Rätsel",
    introAll: "Deine gewünschten Änderungen an <strong>{t}</strong> sind erledigt.",
    introFail: "Wir sind mit <strong>{t}</strong> fertig: das meiste hat geklappt, aber eine Änderung nicht (siehe unten).",
    introNeutral: "Wir sind mit <strong>{t}</strong> fertig.",
    rDetective: "<strong>{c}</strong> entfernt: eine zentrale Rolle der Geschichte wurde einem anderen Charakter zugewiesen. Der aktualisierte Detektiv-Leitfaden enthält die Details.",
    rPromoted: "<strong>{c}</strong> entfernt: <strong>{p}</strong> ist jetzt der/die {role}.",
    rPlain: "<strong>{c}</strong> wurde aus allen Charakterbögen, dem Detektiv-Skript und den Beweiskarten entfernt.",
    rFail: "<strong>{c}</strong>: Diese Änderung ließ sich nicht sicher abschließen und blieb unverändert. Der Support hilft dir, falls das öfter passiert.",
    noticeDetective: "die Neuzuweisung einer zentralen Rolle erforderte, die Enthüllung im Detektiv-Leitfaden und ein Geständnis neu zu schreiben. Wenn du nicht selbst einen Verdächtigen spielst, empfehlen wir, beides vor dem Fest einmal zu lesen; spielst du mit, bitte einen Helfer, der nicht mitspielt, es zu tun.",
    noticeSlip: "die Neuzuweisung des Täters erforderte, die Enthüllung im Detektiv-Skript und ein Geständnis neu zu schreiben; wir empfehlen, beides vor dem Fest einmal zu lesen.",
    noticeLabel: "Einen Blick wert vor der Party:", subjectOk: "Fertig: {t} wurde aktualisiert", subjectMixed: "{t}: Aktualisierung abgeschlossen (Details ansehen)",
    murderer: "Mörder(in)", accomplice: "Komplize/Komplizin" },
  it: { header: "RIMUOVI UN PERSONAGGIO", cta: "Vedi il tuo mistero", fallbackTitle: "il tuo mistero",
    introAll: "Le modifiche richieste per <strong>{t}</strong> sono state completate.",
    introFail: "Abbiamo finito di lavorare su <strong>{t}</strong>: quasi tutto è andato a buon fine, ma una modifica no (vedi sotto).",
    introNeutral: "Abbiamo finito di lavorare su <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> rimosso/a: un ruolo chiave della storia è stato riassegnato a un altro personaggio. La Guida del Detective aggiornata contiene i dettagli.",
    rPromoted: "<strong>{c}</strong> rimosso/a: <strong>{p}</strong> è ora l'/la {role}.",
    rPlain: "<strong>{c}</strong> rimosso/a da tutte le schede dei personaggi, dal copione del detective e dalle carte degli indizi.",
    rFail: "<strong>{c}</strong>: questa modifica non è stata completata in sicurezza ed è rimasta invariata. L'assistenza può aiutarti se succede ancora.",
    noticeDetective: "riassegnare un ruolo chiave ha richiesto di riscrivere la Rivelazione della Guida del Detective e una confessione. Se non interpreti un sospettato, ti consigliamo di leggere entrambe una volta prima della serata; se lo interpreti, chiedi a un aiutante che non gioca di farlo.",
    noticeSlip: "riassegnare chi è il colpevole ha richiesto di riscrivere la rivelazione del copione del detective e una confessione; ti consigliamo di leggere entrambe una volta prima della serata.",
    noticeLabel: "Da sfogliare prima della festa:", subjectOk: "Fatto: {t} è stato aggiornato", subjectMixed: "{t}: aggiornamento terminato (vedi i dettagli)",
    murderer: "assassino/a", accomplice: "complice" },
  pt: { header: "REMOVER UM PERSONAGEM", cta: "Ver seu mistério", fallbackTitle: "seu mistério",
    introAll: "As alterações que você pediu em <strong>{t}</strong> estão prontas.",
    introFail: "Terminamos o trabalho em <strong>{t}</strong>: quase tudo deu certo, mas uma alteração não (veja abaixo).",
    introNeutral: "Terminamos o trabalho em <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> removido(a): um papel central da história foi reatribuído a outro personagem. O Guia do Detetive atualizado traz os detalhes.",
    rPromoted: "<strong>{c}</strong> removido(a): <strong>{p}</strong> agora é o(a) {role}.",
    rPlain: "<strong>{c}</strong> removido(a) de todas as fichas de personagem, do roteiro do detetive e dos cartões de evidências.",
    rFail: "<strong>{c}</strong>: esta alteração não pôde ser concluída com segurança e foi deixada como estava. O suporte pode ajudar se isso continuar acontecendo.",
    noticeDetective: "reatribuir um papel central exigiu reescrever a Revelação do Guia do Detetive e uma confissão. Se você não estiver jogando como suspeito, recomendamos ler as duas uma vez antes de receber; se estiver, peça a um ajudante que não joga para fazer isso.",
    noticeSlip: "reatribuir quem é o culpado exigiu reescrever a revelação do roteiro do detetive e uma confissão; recomendamos ler as duas uma vez antes de receber.",
    noticeLabel: "Vale uma olhada antes da festa:", subjectOk: "Pronto: {t} foi atualizado", subjectMixed: "{t}: atualização concluída (veja os detalhes)",
    murderer: "assassino(a)", accomplice: "cúmplice" },
  nl: { header: "EEN PERSONAGE VERWIJDEREN", cta: "Bekijk je mysterie", fallbackTitle: "je mysterie",
    introAll: "De wijzigingen die je hebt aangevraagd voor <strong>{t}</strong> zijn klaar.",
    introFail: "We zijn klaar met <strong>{t}</strong>: het meeste is gelukt, maar één wijziging niet (zie hieronder).",
    introNeutral: "We zijn klaar met <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> verwijderd: een sleutelrol in het verhaal is aan een ander personage toegewezen. De bijgewerkte Detectivegids bevat de details.",
    rPromoted: "<strong>{c}</strong> verwijderd: <strong>{p}</strong> is nu de {role}.",
    rPlain: "<strong>{c}</strong> verwijderd uit alle personagebladen, het detectivescript en de bewijskaarten.",
    rFail: "<strong>{c}</strong>: deze wijziging kon niet veilig worden afgerond en is ongewijzigd gelaten. Support helpt je graag als dit blijft gebeuren.",
    noticeDetective: "het opnieuw toewijzen van een sleutelrol betekende dat de Onthulling in de Detectivegids en een bekentenis opnieuw geschreven moesten worden. Speel je zelf geen verdachte, lees dan beide één keer voor je gaat hosten; speel je wel mee, vraag dan een helper die niet meespeelt.",
    noticeSlip: "het opnieuw toewijzen van de dader betekende dat de onthulling in het detectivescript en een bekentenis opnieuw geschreven moesten worden; lees beide één keer voor je gaat hosten.",
    noticeLabel: "Even doorlezen voor het feest:", subjectOk: "Klaar: {t} is bijgewerkt", subjectMixed: "{t}: update afgerond (zie details)",
    murderer: "moordenaar", accomplice: "handlanger" },
  da: { header: "FJERN EN KARAKTER", cta: "Se dit mysterium", fallbackTitle: "dit mysterium",
    introAll: "Dine ønskede ændringer i <strong>{t}</strong> er færdige.",
    introFail: "Vi er færdige med <strong>{t}</strong>: det meste gik igennem, men én ændring gjorde ikke (se nedenfor).",
    introNeutral: "Vi er færdige med <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> fjernet: en central rolle i historien er givet til en anden karakter. Den opdaterede Detektivguide har detaljerne.",
    rPromoted: "<strong>{c}</strong> fjernet: <strong>{p}</strong> er nu {role}.",
    rPlain: "<strong>{c}</strong> er fjernet fra alle karakterark, detektivmanuskriptet og beviskortene.",
    rFail: "<strong>{c}</strong>: denne ændring kunne ikke gennemføres sikkert og blev ladt uændret. Support kan hjælpe, hvis det bliver ved.",
    noticeDetective: "omfordelingen af en central rolle betød, at Afsløringen i Detektivguiden og en tilståelse måtte skrives om. Spiller du ikke selv en mistænkt, anbefaler vi at læse begge igennem én gang før festen; spiller du med, så bed en hjælper, som ikke spiller, om at gøre det.",
    noticeSlip: "omfordelingen af gerningsmanden betød, at afsløringen i detektivmanuskriptet og en tilståelse måtte skrives om; vi anbefaler at læse begge igennem én gang før festen.",
    noticeLabel: "Værd at skimme før festen:", subjectOk: "Færdig: {t} er opdateret", subjectMixed: "{t}: opdatering færdig (se detaljer)",
    murderer: "morderen", accomplice: "medskyldig" },
  sv: { header: "TA BORT EN KARAKTÄR", cta: "Visa ditt mysterium", fallbackTitle: "ditt mysterium",
    introAll: "Dina begärda ändringar i <strong>{t}</strong> är klara.",
    introFail: "Vi är klara med <strong>{t}</strong>: det mesta gick igenom, men en ändring gjorde det inte (se nedan).",
    introNeutral: "Vi är klara med <strong>{t}</strong>.",
    rDetective: "<strong>{c}</strong> borttagen: en nyckelroll i berättelsen har getts till en annan karaktär. Den uppdaterade Detektivguiden har detaljerna.",
    rPromoted: "<strong>{c}</strong> borttagen: <strong>{p}</strong> är nu {role}.",
    rPlain: "<strong>{c}</strong> har tagits bort från alla karaktärsblad, detektivmanuset och beviskorten.",
    rFail: "<strong>{c}</strong>: den här ändringen kunde inte slutföras på ett säkert sätt och lämnades oförändrad. Supporten hjälper dig om det fortsätter hända.",
    noticeDetective: "omfördelningen av en nyckelroll innebar att Avslöjandet i Detektivguiden och en bekännelse skrevs om. Om du inte själv spelar en misstänkt rekommenderar vi att du läser båda en gång före festen; spelar du med, be en hjälpare som inte spelar att göra det.",
    noticeSlip: "omfördelningen av vem som är skyldig innebar att avslöjandet i detektivmanuset och en bekännelse skrevs om; vi rekommenderar att du läser båda en gång före festen.",
    noticeLabel: "Värt att skumma före festen:", subjectOk: "Klart: {t} har uppdaterats", subjectMixed: "{t}: uppdateringen är klar (se detaljer)",
    murderer: "mördaren", accomplice: "medhjälparen" },
  fi: { header: "POISTA HAHMO", cta: "Katso mysteerisi", fallbackTitle: "mysteerisi",
    introAll: "Pyytämäsi muutokset kohteeseen <strong>{t}</strong> on tehty.",
    introFail: "Olemme valmiita kohteen <strong>{t}</strong> kanssa: suurin osa onnistui, mutta yksi muutos ei (katso alta).",
    introNeutral: "Olemme valmiita kohteen <strong>{t}</strong> kanssa.",
    rDetective: "<strong>{c}</strong> poistettu: tarinan avainrooli siirrettiin toiselle hahmolle. Päivitetyssä Etsivän oppaassa on yksityiskohdat.",
    rPromoted: "<strong>{c}</strong> poistettu: <strong>{p}</strong> on nyt {role}.",
    rPlain: "<strong>{c}</strong> poistettiin kaikista hahmolomakkeista, etsivän käsikirjoituksesta ja todistekorteista.",
    rFail: "<strong>{c}</strong>: tätä muutosta ei voitu viedä turvallisesti loppuun, ja se jätettiin ennalleen. Tuki auttaa, jos tätä tapahtuu uudelleen.",
    noticeDetective: "avainroolin siirtäminen vaati Etsivän oppaan Paljastuksen ja yhden tunnustuksen uudelleenkirjoittamista. Jos et itse pelaa epäiltyä, suosittelemme lukemaan molemmat kerran ennen isännöintiä; jos pelaat, pyydä avustaja, joka ei pelaa, tekemään se.",
    noticeSlip: "syyllisen vaihtaminen vaati etsivän käsikirjoituksen paljastuksen ja yhden tunnustuksen uudelleenkirjoittamista; suosittelemme lukemaan molemmat kerran ennen isännöintiä.",
    noticeLabel: "Kannattaa selata ennen juhlia:", subjectOk: "Valmis: {t} on päivitetty", subjectMixed: "{t}: päivitys valmis (katso tiedot)",
    murderer: "murhaaja", accomplice: "rikoskumppani" },
  ko: { header: "캐릭터 제거", cta: "내 미스터리 보기", fallbackTitle: "내 미스터리",
    introAll: "요청하신 <strong>{t}</strong>의 변경 사항이 모두 완료되었습니다.",
    introFail: "<strong>{t}</strong> 작업을 마쳤습니다. 대부분 반영되었지만 한 건은 그렇지 못했습니다(아래 참고).",
    introNeutral: "<strong>{t}</strong> 작업을 마쳤습니다.",
    rDetective: "<strong>{c}</strong> 제거됨: 이야기의 핵심 역할이 다른 캐릭터에게 재배정되었습니다. 업데이트된 탐정 가이드에 자세한 내용이 있습니다.",
    rPromoted: "<strong>{c}</strong> 제거됨: 이제 <strong>{p}</strong>이(가) {role}입니다.",
    rPlain: "<strong>{c}</strong>을(를) 모든 캐릭터 시트, 탐정 대본, 증거 카드에서 제거했습니다.",
    rFail: "<strong>{c}</strong>: 이 변경은 안전하게 완료할 수 없어 그대로 두었습니다. 같은 일이 반복되면 고객 지원에 문의해 주세요.",
    noticeDetective: "핵심 역할을 재배정하면서 탐정 가이드의 진실 공개 부분과 자백 하나를 다시 써야 했습니다. 직접 용의자 역할을 하지 않는다면 진행 전에 둘 다 한 번 읽어 보시길 권합니다. 직접 참여한다면 참여하지 않는 도우미에게 부탁하세요.",
    noticeSlip: "범인을 다시 정하면서 탐정 대본의 진실 공개 부분과 자백 하나를 다시 써야 했습니다. 진행 전에 둘 다 한 번 읽어 보시길 권합니다.",
    noticeLabel: "파티 전에 훑어보세요:", subjectOk: "완료: {t}이(가) 업데이트되었습니다", subjectMixed: "{t}: 업데이트 완료(자세한 내용 확인)",
    murderer: "범인", accomplice: "공범" },
  ja: { header: "キャラクターの削除", cta: "ミステリーを見る", fallbackTitle: "あなたのミステリー",
    introAll: "ご依頼の<strong>{t}</strong>の変更が完了しました。",
    introFail: "<strong>{t}</strong>の作業が終わりました。ほとんどは反映されましたが、1件は反映されませんでした（下記参照）。",
    introNeutral: "<strong>{t}</strong>の作業が終わりました。",
    rDetective: "<strong>{c}</strong>を削除しました。物語の重要な役割が別のキャラクターに割り当て直されました。詳細は更新された探偵ガイドをご覧ください。",
    rPromoted: "<strong>{c}</strong>を削除しました。<strong>{p}</strong>が新しい{role}です。",
    rPlain: "<strong>{c}</strong>をすべてのキャラクターシート、探偵の台本、証拠カードから削除しました。",
    rFail: "<strong>{c}</strong>：この変更は安全に完了できなかったため、そのままにしてあります。繰り返し起きる場合はサポートにご相談ください。",
    noticeDetective: "重要な役割の割り当て直しに伴い、探偵ガイドの真相発表と自白を1つ書き直しました。ご自身が容疑者役でない場合は、開催前に両方を一度お読みになることをおすすめします。参加される場合は、参加しない手伝いの方にお願いしてください。",
    noticeSlip: "犯人の割り当て直しに伴い、探偵の台本の真相発表と自白を1つ書き直しました。開催前に両方を一度お読みになることをおすすめします。",
    noticeLabel: "パーティーの前にざっと確認を：", subjectOk: "完了：{t}を更新しました", subjectMixed: "{t}：更新が完了しました（詳細をご確認ください）",
    murderer: "犯人", accomplice: "共犯者" },
  "zh-cn": { header: "移除角色", cta: "查看你的谜案", fallbackTitle: "你的谜案",
    introAll: "你要求的<strong>{t}</strong>修改已完成。",
    introFail: "<strong>{t}</strong>的处理已结束：大部分已完成，但有一项没有成功（见下方）。",
    introNeutral: "<strong>{t}</strong>的处理已结束。",
    rDetective: "已移除<strong>{c}</strong>：故事中的一个关键角色已重新分配给另一位角色。更新后的侦探指南中有详细说明。",
    rPromoted: "已移除<strong>{c}</strong>：现在<strong>{p}</strong>是{role}。",
    rPlain: "已从所有角色卡、侦探剧本和证据卡中移除<strong>{c}</strong>。",
    rFail: "<strong>{c}</strong>：这项修改无法安全完成，已保持原样。如果反复出现，请联系客服。",
    noticeDetective: "重新分配关键角色时，需要改写侦探指南中的真相揭晓部分和一段供词。如果你自己不扮演嫌疑人，建议在主持前把两者各读一遍；如果你参与游戏，请让一位不参与的帮手来读。",
    noticeSlip: "重新指定凶手时，需要改写侦探剧本中的真相揭晓部分和一段供词。建议在主持前把两者各读一遍。",
    noticeLabel: "派对前值得浏览一下：", subjectOk: "完成：{t}已更新", subjectMixed: "{t}：更新已完成（请查看详情）",
    murderer: "凶手", accomplice: "共犯" },
};
const fill = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_m, k) => v[k] ?? "");

interface AdaptationSummaryRow {
  character_name: string;
  character_role: string | null;
  status: string;
  requested_by_email: string | null;
  conversation_id: string;
  package_id: string;
  transform_result: { reassignment?: { promoted_character_name?: string }; host_review_recommended?: boolean } | null;
  error_message: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildEmailHtml(params: {
  introLine: string;
  resultLines: string[];
  reviewNoticeHtml: string | null;
  ctaUrl: string;
  header: string;
  cta: string;
  lang: string;
}): string {
  const { introLine, resultLines, reviewNoticeHtml, ctaUrl, header, cta, lang } = params;
  const resultListHtml = resultLines.map((line) => `<li style="margin-bottom: 8px;">${line}</li>`).join("");

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto 16px auto; border: 0; outline: none; text-decoration: none;" />
    <h1 style="color: #F5F0E8; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">${header}</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">${introLine}</p>

    <ul style="background: #000000; border-left: 4px solid #C81400; padding: 20px 20px 20px 40px; margin: 20px 0; border-radius: 4px; color: rgba(245,240,232,0.85);">
      ${resultListHtml}
    </ul>

    ${reviewNoticeHtml ?? ""}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${cta}</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!ENABLED) return jsonResponse({ error: "not_enabled" }, 404);
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const { batch_id } = await req.json();
    if (!batch_id) return jsonResponse({ error: "batch_id required" }, 400);

    const { data: rows, error: rowsErr } = await supabase
      .from("mystery_adaptations")
      .select("character_name, character_role, status, requested_by_email, conversation_id, package_id, transform_result, error_message")
      .eq("batch_id", batch_id)
      .order("batch_sequence", { ascending: true });
    if (rowsErr) throw new Error(`batch lookup failed: ${rowsErr.message}`);
    if (!rows || rows.length === 0) {
      console.warn(`send-adaptation-complete-email: no rows found for batch ${batch_id} — nothing to send`);
      return jsonResponse({ sent: false, reason: "no_rows_for_batch" });
    }
    const batchRows = rows as AdaptationSummaryRow[];

    const recipientEmail = batchRows.find((r) => r.requested_by_email)?.requested_by_email;
    if (!recipientEmail) {
      console.warn(`send-adaptation-complete-email: batch ${batch_id} has no requested_by_email on any row — nothing to send`);
      return jsonResponse({ sent: false, reason: "no_recipient_email" });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("send-adaptation-complete-email: RESEND_API_KEY not configured — skipping send (staging)");
      return jsonResponse({ sent: false, reason: "resend_not_configured" });
    }

    const { data: pkg } = await supabase
      .from("mystery_packages").select("title, mystery_style, master_context").eq("id", batchRows[0].package_id).maybeSingle();
    // ADR-0161: the email is written in the language of the mystery (like the ready email); English when unclear.
    const lang = (languageOfMasterContext((pkg as { master_context?: unknown } | null)?.master_context) ?? "en") as Locale;
    const L = STRINGS[lang] ?? STRINGS.en;
    const mysteryTitle = (pkg as { title?: string } | null)?.title || L.fallbackTitle;
    // ADR-0158: in detective style the new culprit must not be named in an email, because the host may
    // be playing a suspect and this server cannot know that (the switch lives in their browser). The
    // updated Detective Guide has the details for a host who is not playing.
    const isDetectiveStyle = (pkg as { mystery_style?: string | null } | null)?.mystery_style !== "character";

    const allVerified = batchRows.every((r) => r.status === "verified");
    const anyFailed = batchRows.some((r) => r.status === "failed" || r.status === "rolled_back");
    const anyReviewRecommended = batchRows.some((r) => r.transform_result?.host_review_recommended);

    const roleWord = (role: string | null) => role === "murderer" ? L.murderer : role === "accomplice" ? L.accomplice : (role ?? "");
    const resultLines = batchRows.map((r) => {
      const promoted = r.transform_result?.reassignment?.promoted_character_name;
      if (r.status === "verified") {
        if (promoted && isDetectiveStyle) return fill(L.rDetective, { c: r.character_name });
        return promoted
          ? fill(L.rPromoted, { c: r.character_name, p: promoted, role: roleWord(r.character_role) })
          : fill(L.rPlain, { c: r.character_name });
      }
      return fill(L.rFail, { c: r.character_name });
    });

    const introLine = allVerified
      ? fill(L.introAll, { t: mysteryTitle })
      : anyFailed
        ? fill(L.introFail, { t: mysteryTitle })
        : fill(L.introNeutral, { t: mysteryTitle });

    // ADR-0158: in detective style the notice must not tell a host who may be playing a suspect to read the
    // Reveal, so it says to do so only if they are not playing.
    const reviewNoticeText = isDetectiveStyle ? L.noticeDetective : L.noticeSlip;
    const reviewNoticeHtml = anyReviewRecommended
      ? `<div style="background: rgba(217,119,6,0.12); border-left: 4px solid #d97706; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
           <p style="margin: 0; color: rgba(245,240,232,0.85); font-size: 14px;">
             <strong style="color: #f0b429;">${L.noticeLabel}</strong> ${reviewNoticeText}
           </p>
         </div>`
      : null;

    const ctaUrl = `https://www.mysterymaker.party/mystery/${batchRows[0].conversation_id}`;
    const subject = fill(allVerified ? L.subjectOk : L.subjectMixed, { t: mysteryTitle });

    const html = buildEmailHtml({ introLine, resultLines, reviewNoticeHtml, ctaUrl, header: L.header, cta: L.cta, lang });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Resend send failed: ${resp.status} - ${errText}`);
    }

    return jsonResponse({ sent: true, recipient: recipientEmail, batch_id });
  } catch (error) {
    // Best-effort notification — never let an email failure look like a
    // bigger problem than it is. Logged for visibility, not retried here
    // (matches this feature's existing "cheap, not elaborate" retry posture).
    console.error("send-adaptation-complete-email error:", (error as Error).message);
    return jsonResponse({ sent: false, error: (error as Error).message }, 200);
  }
});
