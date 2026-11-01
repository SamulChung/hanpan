import type { zh } from './zh'

export const ja = {
  gonguTitle: 'Gongu の画像',
  gonguDesc:
    '韓国著作権委員会の無料作品ライブラリ Gongu で、著作権の切れた画像を探すためのキーです。キーは韓国の公共データポータル（data.go.kr）で無料で取得できます。',
  gonguHowTo:
    '公共データポータルにログインし、「한국저작권위원회_공유(만료)저작물 서비스」（Gongu 保護期間満了作品サービス）の利用を申請すると、すぐにキーが発行されます。1 日 1,000 回まで検索できます。',
  gonguPrivacy:
    'キーの確認や検索のとき、検索語とこのキーが公共データポータルに送られます。文書の内容は送られません。キーはこの PC にだけ保存されます。',
  gonguKey: 'サービスキー',
  gonguKeySaved: 'キーが保存されています。',
  gonguNoKey: 'キーがありません。',
  gonguSave: '保存',
  gonguClear: '消去',
  gonguCheck: '確認',
  gonguChecking: '確認中…',
  gonguOk: 'キーは使えます。',
  gonguErrNoKey: 'キーを入力してください。',
  gonguErrBadKey:
    '公共データポータルがこのキーを受け付けません。キーをもう一度コピーするか、利用申請が承認されたか確認してください。新しいキーが使えるようになるまで 1 時間ほどかかることがあります。',
  gonguErrExpired: 'キーの有効期限が切れています。公共データポータルで期間を延長してください。',
  gonguErrQuota: '今日の検索回数を使い切りました。明日もう一度お試しください。',
  gonguErrRate: '短時間にリクエストが多すぎます。少し待ってからもう一度お試しください。',
  gonguErrBlocked:
    '公共データポータルがこのインターネットアドレスからのリクエストをブロックしました。',
  gonguErrNetwork:
    '公共データポータルに接続できませんでした。インターネット接続を確認してください。',
  gonguErrService:
    '公共データポータルが今は正常に応答していません。少し待ってからもう一度お試しください。',
} satisfies Record<keyof typeof zh, string>
