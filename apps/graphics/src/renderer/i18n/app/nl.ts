import type { zh } from './zh'

export const nl = {
  loading: 'App wordt geladen…',
  failed: 'De app kon niet starten.',
  retry: 'Opnieuw proberen',
  notInstalled: 'Deze installatie bevat deze app niet.',
  saveFailed: 'Opslaan mislukt. Het document blijft gemarkeerd als niet opgeslagen.',
  layeredSaveNotice: 'Opslaan als PSD om de lagen en bewerkingsgegevens te behouden.',
  openFailed: 'Het bestand kon niet worden geopend. Open het opnieuw vanuit de app.',
} satisfies Record<keyof typeof zh, string>
