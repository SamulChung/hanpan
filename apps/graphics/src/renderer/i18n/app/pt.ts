import type { zh } from './zh'

export const pt = {
  loading: 'Carregando o app…',
  failed: 'Não foi possível iniciar o app.',
  retry: 'Tentar novamente',
  notInstalled: 'Esta instalação não inclui este app.',
  saveFailed: 'Não foi possível salvar. O documento continua marcado como não salvo.',
  layeredSaveNotice: 'Salvando como PSD para manter as camadas e os dados de edição.',
} satisfies Record<keyof typeof zh, string>
