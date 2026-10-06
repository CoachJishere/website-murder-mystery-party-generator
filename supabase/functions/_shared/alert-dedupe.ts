/**
 * Alert de-duplication for notify-generation-issue (2026-10-06).
 *
 * Jonathan's rule (restated 2026-10-06; first recorded 2026-10-03): email him only when something NEW needs his attention. The old
 * gate was a 6-hour timer per package, so a package deliberately held for a human (El Ultimo Trago) re-sent the identical alert about
 * four times a day until it was released.
 *
 * New gate: the function stores the set of issue items it last emailed about (`mystery_packages.last_notified_items`). An email goes
 * out only when the current set contains an item that set did not. Fixes that shrink the set are not news and send nothing, but the
 * stored set is shrunk to match, so an issue that was fixed and then comes back is new again.
 *
 * Legacy rows (`last_notified_at` set, no stored items) are treated as already told, so deploying this does not cause one extra email
 * per held package; the current set is stored silently on the first evaluation.
 */
export interface AlertItemInputs {
  structuralDefects: string[];
  emptyCharacters: string[];
  missingCharacters: string[];
  skipped: string[];
  capped: string[];
  status: string | null | undefined;
}

export function alertItems(i: AlertItemInputs): string[] {
  const items = [
    ...i.structuralDefects.map((d) => `defect:${d}`),
    ...i.emptyCharacters.map((n) => `empty:${n}`),
    ...i.missingCharacters.map((n) => `missing:${n}`),
    ...i.skipped.map((n) => `skipped:${n}`),
    ...i.capped.map((n) => `capped:${n}`),
  ];
  // A package held with no itemised defect (the status alone is the problem) is still one distinct state.
  if (items.length === 0) items.push(`status:${i.status ?? "unknown"}`);
  return [...new Set(items)].sort();
}

export interface DedupeDecision {
  /** true: nothing new since the last email, do not send. */
  suppress: boolean;
  /** the set to store in last_notified_items, or null to leave the column alone. */
  persist: string[] | null;
  /** items in the current set that the last email did not cover (what an email would be about). */
  newItems: string[];
}

export function dedupeDecision(current: string[], lastItems: string[] | null, lastNotifiedAt: string | null): DedupeDecision {
  if (lastItems === null) {
    // Legacy row: told before items were stored. Treat as told and record the state quietly.
    if (lastNotifiedAt) return { suppress: true, persist: current, newItems: [] };
    return { suppress: false, persist: null, newItems: current }; // never emailed
  }
  const last = new Set(lastItems);
  const newItems = current.filter((c) => !last.has(c));
  if (newItems.length > 0) return { suppress: false, persist: null, newItems };
  // Nothing new. If the set shrank, remember the smaller set so a returning issue counts as new.
  return { suppress: true, persist: current.length < last.size ? current : null, newItems: [] };
}
