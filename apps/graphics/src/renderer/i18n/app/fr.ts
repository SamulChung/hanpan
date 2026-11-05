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
  quickRemoveBackground: "Supprimer l'arrière-plan",
  quickAutoTone: 'Tons automatiques',
  quickExportAtSize: 'Exporter à une taille',
  quickTraceImage: 'Vectoriser l’image',
  quickCenter: 'Centrer sur le plan de travail',
  quickExportPngSvg: 'Exporter en PNG ou SVG',
  quickDone: 'Terminé.',
  quickRefused: "L'application n'a pas pu le faire maintenant :",
  quickExported: 'Copie enregistrée.',
  exportDialogTitle: 'Exporter',
  exportFormat: 'Format',
  exportWidth: 'Largeur (px)',
  exportHeight: 'Hauteur (px)',
  exportConfirm: 'Exporter',
  exportCancel: 'Annuler',
} satisfies Record<keyof typeof zh, string>
