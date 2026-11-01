import type { zh } from './zh'

export const zhTW = {
  gonguTitle: 'Gongu 圖片',
  gonguDesc:
    '用於在韓國著作權委員會的 Gongu 免費作品庫中尋找著作權已屆滿圖片的金鑰。金鑰可在韓國公共資料入口網（data.go.kr）免費取得。',
  gonguHowTo:
    '登入公共資料入口網，申請使用「한국저작권위원회_공유(만료)저작물 서비스」（Gongu 著作權屆滿作品服務），即可立即取得金鑰。每天最多可搜尋 1,000 次。',
  gonguPrivacy:
    '檢查金鑰或搜尋時，搜尋字詞和此金鑰會傳送到公共資料入口網。不會傳送文件內容。金鑰只保存在這台電腦上。',
  gonguKey: '服務金鑰',
  gonguKeySaved: '已儲存金鑰。',
  gonguNoKey: '沒有金鑰。',
  gonguSave: '儲存',
  gonguClear: '清除',
  gonguCheck: '檢查',
  gonguChecking: '正在檢查…',
  gonguOk: '金鑰可以使用。',
  gonguErrNoKey: '請輸入金鑰。',
  gonguErrBadKey:
    '公共資料入口網不接受此金鑰。請重新複製金鑰，或確認申請已獲核准。新金鑰可能需要約一小時才會生效。',
  gonguErrExpired: '金鑰已過期。請在公共資料入口網延長使用期限。',
  gonguErrQuota: '今天的搜尋次數已用完。請明天再試。',
  gonguErrRate: '短時間內要求過多。請稍後再試。',
  gonguErrBlocked: '公共資料入口網封鎖了來自此網路位址的要求。',
  gonguErrNetwork: '無法連線到公共資料入口網。請檢查網路連線。',
  gonguErrService: '公共資料入口網目前沒有正常回應。請稍後再試。',
} satisfies Record<keyof typeof zh, string>
