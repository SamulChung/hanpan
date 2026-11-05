import type { zh } from './zh'

export const th = {
  loading: 'กำลังโหลดแอป…',
  failed: 'ไม่สามารถเริ่มแอปได้',
  retry: 'ลองอีกครั้ง',
  notInstalled: 'การติดตั้งนี้ไม่มีแอปนี้',
  saveFailed: 'บันทึกไม่ได้ เอกสารยังคงเป็นยังไม่ได้บันทึก',
  layeredSaveNotice: 'บันทึกเป็น PSD เพื่อเก็บเลเยอร์และข้อมูลการแก้ไขไว้',
} satisfies Record<keyof typeof zh, string>
