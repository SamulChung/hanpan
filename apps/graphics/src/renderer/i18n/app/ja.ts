import type { zh } from './zh'

export const ja = {
  loading: 'アプリを読み込んでいます…',
  failed: 'アプリを起動できませんでした。',
  retry: '再試行',
  notInstalled: 'このインストールにはこのアプリが含まれていません。',
  saveFailed: '保存できませんでした。ドキュメントは未保存のままです。',
  layeredSaveNotice: 'レイヤーと編集情報を残すため、PSD で保存します。',
  openFailed: 'ファイルを開けませんでした。アプリからもう一度開いてください。',
} satisfies Record<keyof typeof zh, string>
