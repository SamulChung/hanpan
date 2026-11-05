import type { zh } from './zh'

export const fr = {
  loading: 'Chargement de l’application…',
  failed: 'L’application n’a pas pu démarrer.',
  retry: 'Réessayer',
  notInstalled: 'Cette installation ne contient pas cette application.',
  saveFailed: 'Enregistrement impossible. Le document reste marqué comme non enregistré.',
  layeredSaveNotice:
    'Enregistrement au format PSD pour conserver les calques et les données de modification.',
  openFailed: "Impossible d'ouvrir le fichier. Ouvrez-le à nouveau depuis l'application.",
} satisfies Record<keyof typeof zh, string>
