import type { zh } from './zh'

export const ar = {
  loading: 'جارٍ تحميل التطبيق…',
  failed: 'تعذّر تشغيل التطبيق.',
  retry: 'إعادة المحاولة',
  notInstalled: 'لا يتضمن هذا التثبيت هذا التطبيق.',
  saveFailed: 'تعذّر الحفظ. يبقى المستند غير محفوظ.',
  layeredSaveNotice: 'يُحفظ بصيغة PSD للإبقاء على الطبقات وبيانات التحرير.',
  openFailed: 'تعذّر فتح الملف. افتحه مرة أخرى من التطبيق.',
} satisfies Record<keyof typeof zh, string>
