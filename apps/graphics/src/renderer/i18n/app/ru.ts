import type { zh } from './zh'

export const ru = {
  loading: 'Загрузка приложения…',
  failed: 'Не удалось запустить приложение.',
  retry: 'Повторить',
  notInstalled: 'Эта установка не содержит это приложение.',
  saveFailed: 'Не удалось сохранить. Документ остаётся несохранённым.',
  layeredSaveNotice: 'Сохраняется в PSD, чтобы не потерять слои и данные правки.',
  openFailed: 'Не удалось открыть файл. Откройте его снова в приложении.',
} satisfies Record<keyof typeof zh, string>
