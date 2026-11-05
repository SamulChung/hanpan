import type { zh } from './zh'

export const cs = {
  loading: 'Načítání aplikace…',
  failed: 'Aplikaci se nepodařilo spustit.',
  retry: 'Zkusit znovu',
  notInstalled: 'Tato instalace tuto aplikaci neobsahuje.',
  saveFailed: 'Uložení se nezdařilo. Dokument zůstává neuložený.',
  layeredSaveNotice: 'Ukládá se jako PSD, aby zůstaly vrstvy a data úprav.',
} satisfies Record<keyof typeof zh, string>
