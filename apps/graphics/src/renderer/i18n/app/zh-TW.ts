import type { zh } from './zh'

export const zhTW = {
  loading: '正在載入應用程式…',
  failed: '應用程式無法啟動。',
  retry: '重試',
  notInstalled: '此安裝版本不包含這個應用程式。',
  saveFailed: '無法儲存。文件仍標示為未儲存。',
  layeredSaveNotice: '為保留圖層和編輯資訊，將儲存為 PSD。',
  openFailed: '無法開啟該檔案。請在應用程式中重新開啟。',
} satisfies Record<keyof typeof zh, string>
