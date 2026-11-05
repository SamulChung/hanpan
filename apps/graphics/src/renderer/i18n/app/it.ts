import type { zh } from './zh'

export const it = {
  loading: 'Caricamento dell’app…',
  failed: 'Impossibile avviare l’app.',
  retry: 'Riprova',
  notInstalled: 'Questa installazione non include questa app.',
  saveFailed: 'Salvataggio non riuscito. Il documento resta non salvato.',
  layeredSaveNotice: 'Salvataggio in PSD per conservare livelli e dati di modifica.',
} satisfies Record<keyof typeof zh, string>
