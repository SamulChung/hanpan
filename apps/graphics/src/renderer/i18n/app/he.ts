import type { zh } from './zh'

export const he = {
  loading: 'טוען את האפליקציה…',
  failed: 'לא ניתן היה להפעיל את האפליקציה.',
  retry: 'ניסיון חוזר',
  notInstalled: 'התקנה זו אינה כוללת את האפליקציה הזו.',
  saveFailed: 'השמירה נכשלה. המסמך נשאר מסומן כלא שמור.',
  layeredSaveNotice: 'נשמר כ-PSD כדי לשמור על השכבות ונתוני העריכה.',
} satisfies Record<keyof typeof zh, string>
