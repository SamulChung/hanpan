/**
 * Finding text in the map and replacing it in titles.
 *
 * Finding reads the engine's view of each sheet, so it sees topics that are
 * folded away as well as drawn ones. Text is matched as it is written: no
 * pattern syntax, so a dot or a bracket in the query is just that character.
 */
import type { ViewTopic } from '@genoffice/xmind-engine'

export interface FindOptions {
  matchCase: boolean
  /** look in notes and labels too, not only in titles */
  inNotes: boolean
}

export interface FindMatch {
  sheetKey: string
  topicId: string
  where: 'title' | 'note' | 'label'
  /** the topic sits in a folded branch: showing it unfolds that branch */
  folded: boolean
}

/** Every topic that holds the query, sheet by sheet, each sheet from its central topic down. */
export function findMatches(
  sheets: readonly { key: string; root: ViewTopic }[],
  query: string,
  options: FindOptions,
): FindMatch[] {
  if (query === '') return []
  const needle = options.matchCase ? query : query.toLocaleLowerCase()
  const holds = (text: string): boolean =>
    (options.matchCase ? text : text.toLocaleLowerCase()).includes(needle)
  const found: FindMatch[] = []
  for (const sheet of sheets) {
    const visit = (topic: ViewTopic, folded: boolean): void => {
      const where: FindMatch['where'] | null = holds(topic.title)
        ? 'title'
        : !options.inNotes
          ? null
          : topic.note !== null && holds(topic.note)
            ? 'note'
            : topic.labels.some(holds)
              ? 'label'
              : null
      if (where) found.push({ sheetKey: sheet.key, topicId: topic.id, where, folded })
      for (const child of topic.children) visit(child, folded || topic.folded)
    }
    visit(sheet.root, false)
  }
  return found
}

/** The text with every occurrence of the query replaced, matched as written. */
export function replaceText(
  text: string,
  query: string,
  replacement: string,
  matchCase: boolean,
): string {
  if (query === '') return text
  if (matchCase) return text.split(query).join(replacement)
  const lower = text.toLocaleLowerCase()
  const needle = query.toLocaleLowerCase()
  let out = ''
  let from = 0
  for (let at = lower.indexOf(needle); at >= 0; at = lower.indexOf(needle, from)) {
    out += text.slice(from, at) + replacement
    from = at + query.length
  }
  return out + text.slice(from)
}
