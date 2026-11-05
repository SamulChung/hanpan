import type { zh } from './zh'

export const es = {
  loading: 'Cargando la aplicación…',
  failed: 'No se pudo iniciar la aplicación.',
  retry: 'Reintentar',
  notInstalled: 'Esta instalación no incluye esta aplicación.',
  saveFailed: 'No se pudo guardar. El documento sigue marcado como no guardado.',
  layeredSaveNotice: 'Se guarda como PSD para conservar las capas y los datos de edición.',
  openFailed: 'No se pudo abrir el archivo. Ábralo de nuevo desde la aplicación.',
} satisfies Record<keyof typeof zh, string>
