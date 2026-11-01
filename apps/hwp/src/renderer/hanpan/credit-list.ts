/**
 * Hanpan: the "picture credits" list at the end of an HWP document and the credit check that
 * reads it (docs/plans/gongu-images.md 4.4, 4.8), through the editor plugin.
 */
import {
  creditListStep,
  creditListTitle,
  documentCreditIssues,
  type PictureCreditIssue,
} from '@genoffice/hanpan-core/renderer'
import type { AgentPictureEntry, AgentPlace } from '../../../studio-plugin/agent-plugin.mjs'
import type { AgentBridge } from '../ai/agent-bridge'

export interface CreditCheckResult {
  pictures: AgentPictureEntry[]
  issues: PictureCreditIssue[]
}

/** Reads the document's pictures and text and checks their credits. */
export async function checkCredits(
  bridge: Pick<AgentBridge, 'listPictures' | 'readText'>,
  lang: string,
): Promise<CreditCheckResult> {
  const { pictures } = await bridge.listPictures()
  const text = await bridge.readText()
  const issues = documentCreditIssues(
    pictures.map((picture) => picture.next),
    text,
    creditListTitle(lang),
  )
  return { pictures, issues }
}

/**
 * Adds one credit line to the list at the end, starting the list when there is none and
 * leaving it alone when the line is already in it. One undo step when it `changed`
 * anything; `place` is where the line went.
 */
export async function addToCreditList(
  bridge: Pick<AgentBridge, 'readText' | 'insertParagraphs'>,
  line: string,
  lang: string,
): Promise<{ ok: boolean; changed: boolean; place?: AgentPlace }> {
  const title = creditListTitle(lang)
  const step = creditListStep(await bridge.readText(), title, line)
  if (step.kind === 'listed') return { ok: true, changed: false }
  const result =
    step.kind === 'new'
      ? await bridge.insertParagraphs('', null, 'end', [title, line])
      : await bridge.insertParagraphs(title, step.occurrence, 'after', [line])
  return result.ok
    ? { ok: true, changed: true, place: result.place }
    : { ok: false, changed: false }
}
