/**
 * Commands the AI may not run (design 6-4). Saving, opening and exporting go
 * through Hanpan's own save flow and `export_file`; the undo history is the
 * panel's (one [Undo] per request); links, updates, preferences, plug-ins,
 * scripts and the app's windows are outside the document. Prefix match.
 */
export const BLOCKED_PREFIXES: readonly string[] = [
  'file.',
  'app.',
  'help.',
  'prefs.',
  'edit.preferences',
  'edit.undo',
  'edit.redo',
  'edit.clearHistory',
  'history.newDocument',
  'image.duplicate',
  'document.open',
  'document.close',
  'document.activate',
  'document.save',
  'document.export',
  'document.serialize',
  'docInfo.save',
  'plugin.',
  'plugins.',
  'addon.',
  'script.',
  'scripts.',
  'action.',
  'actions.',
  'automate.',
  'presets.',
  'imageTrace.presets.save',
  'imageTrace.presets.delete',
  'links.',
  'library.',
  'print.',
  'webExport.',
  'shortcuts.',
  'shortcutSet.',
  'window.',
  'ui.',
]

export function isBlockedCommand(id: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => id === prefix || id.startsWith(prefix))
}

const READ_ONLY_SUFFIXES = [
  '.info',
  '.list',
  '.inspect',
  '.find',
  '.node',
  '.fontList',
  '.formats',
  '.json',
]

/** Commands that only read: they start no undo tracking. */
export function isReadOnlyCommand(id: string): boolean {
  return READ_ONLY_SUFFIXES.some((suffix) => id.endsWith(suffix))
}
