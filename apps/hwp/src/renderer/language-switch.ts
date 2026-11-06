import type { studioLocale } from './studio-settings'

type StudioLocale = ReturnType<typeof studioLocale>

export interface LanguageSwitchState {
  /** the studio language the editor was opened with */
  from: StudioLocale
  /** the studio language of the new UI language */
  to: StudioLocale
  /** a document is in the editor */
  ready: boolean
  /** the document has edits that are not saved */
  dirty: boolean
  /** the document is a restored recovery copy not saved since */
  restored: boolean
  /** the document was opened with a password (a reload would ask for it again) */
  passwordProtected: boolean
  /** an untitled copy of a template, which has no file to read back */
  untitledCopy: boolean
}

/**
 * What a UI language change does to an open Hangul tab. The studio picks its language once,
 * when its page loads, so the editor has to be opened again to change it: at once when the
 * document can be read back unchanged from its file (or is the blank new document), and
 * otherwise when the tab is opened again, so nothing the user has not saved is lost.
 */
export function languageSwitchPlan(s: LanguageSwitchState): 'none' | 'reload' | 'later' {
  if (s.from === s.to) return 'none'
  if (!s.ready || s.dirty || s.restored || s.passwordProtected || s.untitledCopy) return 'later'
  return 'reload'
}
