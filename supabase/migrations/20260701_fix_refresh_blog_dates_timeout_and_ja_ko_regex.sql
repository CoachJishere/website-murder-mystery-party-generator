-- Fix the quarterly "Last updated" refresh RPC (refresh_blog_dates).
--
-- Two problems fixed here:
--
-- 1. TIMEOUT (the actual job failure on 2026-07-01, error 57014):
--    the function runs 13 sequential per-language UPDATEs, each ~2.3s
--    (de-TOAST + regex-scan ~420 rows, rewrite ~377). Total ~30s now that
--    blog_posts has grown to ~5,470 rows / 119MB — exceeding the short
--    statement_timeout the service_role RPC inherits. Fix: give the function
--    its own generous budget via `SET statement_timeout TO '120s'` (applies
--    only during this function's execution). Worked in past quarters when the
--    table was smaller; it crossed the line in July.
--
-- 2. ja / ko marker regexes never matched the real content (silently stale
--    every quarter):
--      - ja: content uses a FULLWIDTH colon `：` (U+FF1A), not ASCII `:`.
--            Only 1 of ~190 marker posts matched; the rest kept old dates.
--      - ko: the dominant label is `마지막 업데이트` ("last"), not `최종 업데이트`
--            ("final"); only ~25 of ~364 matched.
--    Both rewritten with capture groups so the post's EXISTING label/colon/
--    spacing is preserved and only the date is swapped (no style normalization).
--
-- NOTE: this migration is the corrected function definition only (DDL). The
-- one-off backfill of the already-stale ja/ko rows for July 2026 was applied
-- separately and is recorded in ADR-0027 / CHANGELOG (not replayed here).

CREATE OR REPLACE FUNCTION public.refresh_blog_dates(month_num integer, year_num integer)
 RETURNS TABLE(lang text, updated_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  m_en TEXT;
  m_es TEXT; m_fr TEXT; m_de TEXT; m_it TEXT; m_pt TEXT;
  m_nl TEXT; m_da TEXT; m_sv TEXT; m_fi TEXT;
  months_en TEXT[] := ARRAY['January','February','March','April','May','June','July','August','September','October','November','December'];
  months_es TEXT[] := ARRAY['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  months_fr TEXT[] := ARRAY['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  months_de TEXT[] := ARRAY['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  months_it TEXT[] := ARRAY['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  months_pt TEXT[] := ARRAY['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  months_nl TEXT[] := ARRAY['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  months_da TEXT[] := ARRAY['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
  months_sv TEXT[] := ARRAY['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];
  months_fi TEXT[] := ARRAY['tammikuu','helmikuu','maaliskuu','huhtikuu','toukokuu','kesäkuu','heinäkuu','elokuu','syyskuu','lokakuu','marraskuu','joulukuu'];
BEGIN
  m_en := months_en[month_num];
  m_es := months_es[month_num];
  m_fr := months_fr[month_num];
  m_de := months_de[month_num];
  m_it := months_it[month_num];
  m_pt := months_pt[month_num];
  m_nl := months_nl[month_num];
  m_da := months_da[month_num];
  m_sv := months_sv[month_num];
  m_fi := months_fi[month_num];

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Last updated: [A-Za-z]+ \d{4}\*\*', '**Last updated: ' || m_en || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'en' AND bp.content ~ '\*\*Last updated:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Última actualización: [a-záéíóú]+ de \d{4}\*\*', '**Última actualización: ' || m_es || ' de ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'es' AND bp.content ~ '\*\*Última actualización:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Dernière mise à jour : [a-zàâéèêëïîôùûüÿç]+ \d{4}\*\*', '**Dernière mise à jour : ' || m_fr || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'fr' AND bp.content ~ '\*\*Dernière mise à jour';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Zuletzt aktualisiert: [A-Za-zä]+ \d{4}\*\*', '**Zuletzt aktualisiert: ' || m_de || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'de' AND bp.content ~ '\*\*Zuletzt aktualisiert:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Ultimo aggiornamento: [a-z]+ \d{4}\*\*', '**Ultimo aggiornamento: ' || m_it || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'it' AND bp.content ~ '\*\*Ultimo aggiornamento:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Última atualização: [a-zçã]+ de \d{4}\*\*', '**Última atualização: ' || m_pt || ' de ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'pt' AND bp.content ~ '\*\*Última atualização:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Laatst bijgewerkt: [a-z]+ \d{4}\*\*', '**Laatst bijgewerkt: ' || m_nl || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'nl' AND bp.content ~ '\*\*Laatst bijgewerkt:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Sidst opdateret: [a-z]+ \d{4}\*\*', '**Sidst opdateret: ' || m_da || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'da' AND bp.content ~ '\*\*Sidst opdateret:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Senast uppdaterad: [a-z]+ \d{4}\*\*', '**Senast uppdaterad: ' || m_sv || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'sv' AND bp.content ~ '\*\*Senast uppdaterad:';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*Viimeksi päivitetty: [a-zä]+ \d{4}\*\*', '**Viimeksi päivitetty: ' || m_fi || ' ' || year_num || '**'),
    updated_at = NOW()
  WHERE bp.language = 'fi' AND bp.content ~ '\*\*Viimeksi päivitetty:';

  -- ko: dominant phrase is "마지막 업데이트" (also "최종"/"마지막으로"). Preserve the
  -- post's existing label via capture groups and only swap the date.
  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '(\*\*(?:최종|마지막(?:으로)?) 업데이트: )\d{4}년 \d{1,2}월(\*\*)', '\1' || year_num || '년 ' || month_num || '월' || '\2'),
    updated_at = NOW()
  WHERE bp.language = 'ko' AND bp.content ~ '\*\*(?:최종|마지막(?:으로)?) 업데이트: \d{4}년 \d{1,2}월\*\*';

  -- ja: content uses a FULLWIDTH colon (：), not ASCII (:). Preserve the post's
  -- existing colon/spacing via capture groups and only swap the date.
  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '(\*\*最終更新[：:] ?)\d{4}年\d{1,2}月(\*\*)', '\1' || year_num || '年' || month_num || '月' || '\2'),
    updated_at = NOW()
  WHERE bp.language = 'ja' AND bp.content ~ '\*\*最終更新[：:] ?\d{4}年\d{1,2}月\*\*';

  UPDATE blog_posts bp SET
    content = regexp_replace(bp.content, '\*\*最后更新：\d{4}年\d{1,2}月\*\*', '**最后更新：' || year_num || '年' || month_num || '月**'),
    updated_at = NOW()
  WHERE bp.language = 'zh-cn' AND bp.content ~ '\*\*最后更新';

  RETURN QUERY
  SELECT bp.language::TEXT AS lang, COUNT(*)::BIGINT AS updated_count
  FROM blog_posts bp
  WHERE bp.updated_at > NOW() - INTERVAL '5 minutes'
  GROUP BY bp.language
  ORDER BY bp.language;
END;
$function$;
