/**
 * Cross-link target guard.
 *
 * Cross-links are injected into post content at publish time (apply-crosslinks)
 * and re-applied in bulk (backfill-crosslinks). Neither historically checked
 * whether the LINK TARGET is published — so publishing a post that links to a
 * still-draft target created a live 404. By mid-2026 that churn was the source
 * of the dead-internal-link backlog the importance-ordered publish queue
 * (ADR-0021) was built to drain. This guard closes the loop: an internal blog
 * link is only inserted once its target page is actually live.
 *
 * A missing internal link is recoverable (a later backfill-crosslinks run
 * inserts it once the target publishes); a 404 in the acquisition engine is
 * not. So when in doubt we DEFER the link rather than emit a dead one.
 *
 * Landing-page links (e.g. /custom-murder-mystery-party/, ADR-0023) are not
 * /blog/ targets, so parseTarget returns null and they are always allowed —
 * those routes are permanently live.
 *
 * See ADR-0025.
 */

/**
 * Extract the (lang, slug) a cross-link replacement points at.
 * Handles EN `](/blog/<slug>)` and localized `](/<lang>/blog/<slug>)`
 * (including hyphenated codes like `zh-cn`). Returns null for any link that
 * is not an internal /blog/ link (landing pages, external, anchors).
 */
export function parseTarget(replacement) {
  if (!replacement) return null;
  const m = replacement.match(/\]\((?:\/([a-z]{2}(?:-[a-z]{2})?))?\/blog\/([a-z0-9-]+)\)/);
  if (!m) return null;
  return { lang: m[1] || 'en', slug: m[2] };
}

/**
 * Build a Set of "lang:slug" for every published post. Paginated because the
 * PostgREST default row cap (1000) is below the total published row count
 * across 13 languages — an unpaginated fetch would silently truncate and make
 * the guard reject valid live targets.
 */
export async function fetchPublishedTargets(supabase) {
  const set = new Set();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, language')
      .eq('status', 'published')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`fetchPublishedTargets: ${error.message}`);
    for (const r of data) set.add(`${r.language}:${r.slug}`);
    if (!data || data.length < pageSize) break;
  }
  return set;
}

/**
 * True if this replacement is safe to insert: either it is not a /blog/ link
 * (landing page / external — always allowed) or its target page is published
 * in the linked language.
 */
export function targetIsPublished(replacement, publishedSet) {
  const t = parseTarget(replacement);
  if (!t) return true; // not an internal /blog/ link — never blocked
  return publishedSet.has(`${t.lang}:${t.slug}`);
}
