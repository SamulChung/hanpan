/**
 * Sorting the branches of one topic by title, and where a summary or a
 * boundary over those branches ends up afterwards.
 *
 * A range names its branches by position. After a sort it follows the rule
 * the engine uses for every move (`reconcile-ranges.ts`): it follows its first
 * covered branch, the anchor, and keeps the unbroken run of covered branches
 * around it. Covered branches the sort put elsewhere fall out of the range.
 */

/** A range of branch positions, both ends included. */
export interface BranchRange {
  start: number
  end: number
}

/**
 * The new order of the titles as positions into the given list. Titles are
 * compared the way the reader's language sorts them, numbers by their value;
 * equal titles keep their order.
 */
export function sortedOrder(
  titles: readonly string[],
  lang: string,
  descending: boolean,
): number[] {
  const collator = new Intl.Collator(lang, { numeric: true, sensitivity: 'base' })
  const order = titles.map((_, at) => at)
  return order.sort((a, b) => {
    const compared = collator.compare(titles[a]!, titles[b]!)
    return (descending ? -compared : compared) || a - b
  })
}

/**
 * Where a range over `before` lies in `after` (the same ids, another order),
 * by the engine's rule: the run of covered ids around the first covered one.
 */
export function followRange(
  before: readonly string[],
  after: readonly string[],
  range: BranchRange,
): BranchRange {
  const covered = new Set(before.slice(range.start, range.end + 1))
  const anchor = after.indexOf(before[range.start]!)
  let start = anchor
  let end = anchor
  while (start > 0 && covered.has(after[start - 1]!)) start--
  while (end < after.length - 1 && covered.has(after[end + 1]!)) end++
  return { start, end }
}

/** Whether a range covers fewer branches after the change than before it. */
export function rangeNarrows(
  before: readonly string[],
  after: readonly string[],
  range: BranchRange,
): boolean {
  const followed = followRange(before, after, range)
  return followed.end - followed.start < range.end - range.start
}
