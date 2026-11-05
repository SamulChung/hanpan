import type { zh } from './zh'

export const de = {
  loading: 'App wird geladen…',
  failed: 'Die App konnte nicht gestartet werden.',
  retry: 'Erneut versuchen',
  notInstalled: 'Diese Installation enthält diese App nicht.',
  saveFailed: 'Speichern fehlgeschlagen. Das Dokument bleibt als nicht gespeichert markiert.',
  layeredSaveNotice:
    'Wird als PSD gespeichert, damit Ebenen und Bearbeitungsdaten erhalten bleiben.',
} satisfies Record<keyof typeof zh, string>
