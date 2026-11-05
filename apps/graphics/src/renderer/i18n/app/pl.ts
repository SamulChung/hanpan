import type { zh } from './zh'

export const pl = {
  loading: 'Ładowanie aplikacji…',
  failed: 'Nie udało się uruchomić aplikacji.',
  retry: 'Spróbuj ponownie',
  notInstalled: 'Ta instalacja nie zawiera tej aplikacji.',
  saveFailed: 'Nie udało się zapisać. Dokument pozostaje niezapisany.',
  layeredSaveNotice: 'Zapis jako PSD, aby zachować warstwy i dane edycji.',
  openFailed: 'Nie udało się otworzyć pliku. Otwórz go ponownie w aplikacji.',
} satisfies Record<keyof typeof zh, string>
