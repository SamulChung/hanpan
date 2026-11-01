/**
 * The AI's Gongu picture search (docs/plans/gongu-images.md 4.4): the
 * `source` choice on image_search, the result list the model reads, and the
 * credit book that lets the app, not the model, write the credit of a
 * picture the model then inserts by address.
 */
import { gonguCreditOf, licenseName, parseCreditLine, type ImageCredit } from './gongu-credit'

/** One work as main's search hands it to an editor: the picture address and the credit fields. */
export interface GonguAiWork {
  workId: string
  title: string
  author?: string
  year?: string
  provider?: string
  imageUrl: string
}

export type GonguAiAnswer = { ok: true; works: GonguAiWork[] } | { ok: false; error: string }

/** The `source` property image_search takes in an editor that writes credits. */
export const GONGU_SOURCE_PROPERTY = {
  type: 'string',
  enum: ['web', 'gongu'],
  description:
    "web (default): any picture on the web. gongu: out-of-copyright works from the Korea Copyright Commission's Gongu library (Korean art, old prints, photos); search by title or artist in Korean. Prefer gongu for public, school and official documents. It needs the user's Gongu key; without one the search says so.",
} as const

/** What the model is told when the search could not run. */
function failureText(error: string): string {
  if (error === 'no-key')
    return 'Gongu search needs the user\'s Gongu key (Settings → Integrations → "Gongu pictures"), which is not set. Tell the user, or search the web instead.'
  if (error === 'quota') return "Gongu search: today's quota of the user's key is used up."
  if (error === 'bad-key' || error === 'expired-key')
    return "Gongu search: the Public Data Portal refused the user's key. Tell the user to check it in Settings → Integrations."
  return `Gongu search failed (service error, not an empty result): ${error}`
}

/**
 * The list the model reads: `N. title — author, year [licence]` and the
 * address to give insert_image. The credit is not for the model to write.
 */
export function gonguSearchOutput(answer: GonguAiAnswer): {
  output: string
  isError: boolean
  count: number
} {
  if (!answer.ok) return { output: failureText(answer.error), isError: true, count: 0 }
  const lines = answer.works.map((work, index) => {
    const byline = [work.author, work.year].filter(Boolean).join(', ')
    const license = licenseName(gonguCreditOf(work).license, 'en')
    return `${index + 1}. ${work.title}${byline ? ` — ${byline}` : ''} [${license}]\n   ${work.imageUrl}`
  })
  const note =
    '\n(The app writes the credit of a Gongu picture under it when you insert it with insert_image; do not write one yourself.)'
  return {
    output: lines.length
      ? lines.join('\n') + note
      : '(no Gongu pictures; try one word of the title or the artist in Korean)',
    isError: false,
    count: lines.length,
  }
}

/**
 * The credits of the Gongu pictures found in this conversation, by address.
 * insert_image looks the address up: a hit is a Gongu picture whose credit the
 * app writes. Bounded: the oldest entries go first.
 */
export class GonguCreditBook {
  private readonly byUrl = new Map<string, ImageCredit>()

  constructor(private readonly limit = 400) {}

  remember(answer: GonguAiAnswer): void {
    if (!answer.ok) return
    for (const work of answer.works) {
      this.byUrl.delete(work.imageUrl)
      this.byUrl.set(work.imageUrl, gonguCreditOf(work))
    }
    while (this.byUrl.size > this.limit) this.byUrl.delete(this.byUrl.keys().next().value!)
  }

  creditFor(url: string): ImageCredit | null {
    return this.byUrl.get(url.trim()) ?? null
  }
}

/** Where a credit line goes in the "picture credits" list at the end of a flat-text document. */
export type CreditListStep =
  | { kind: 'new' }
  | { kind: 'listed' }
  /** add right after the title; `occurrence` counts the title text up to the list's title line */
  | { kind: 'add'; occurrence: number }

/**
 * Decides how to add `line` to the list under `title` in `text` (the document as lines, one
 * per paragraph): the list is the last line that is exactly the title and the credit lines
 * right after it. No list yet → a new one at the end; the same line already there → nothing.
 */
export function creditListStep(text: string, title: string, line: string): CreditListStep {
  const lines = text.split(/\r?\n/).map((each) => each.trim())
  let at = -1
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index] === title) {
      at = index
      break
    }
  }
  if (at < 0) return { kind: 'new' }
  for (let index = at + 1; index < lines.length; index++) {
    const entry = lines[index]!
    if (entry === line) return { kind: 'listed' }
    if (!parseCreditLine(entry)) break
  }
  let occurrence = 0
  for (let index = 0; index <= at; index++) occurrence += countOf(lines[index]!, title)
  return { kind: 'add', occurrence }
}

function countOf(haystack: string, needle: string): number {
  let count = 0
  for (let from = haystack.indexOf(needle); from >= 0; from = haystack.indexOf(needle, from + 1))
    count++
  return count
}
