import type { zh } from './zh'

export const hi = {
  loading: 'ऐप लोड हो रहा है…',
  failed: 'ऐप शुरू नहीं हो सका।',
  retry: 'फिर से कोशिश करें',
  notInstalled: 'इस इंस्टॉलेशन में यह ऐप शामिल नहीं है।',
  saveFailed: 'सहेजा नहीं जा सका। दस्तावेज़ बिना सहेजा ही रहेगा।',
  layeredSaveNotice: 'लेयर और संपादन जानकारी रखने के लिए PSD के रूप में सहेजा जा रहा है।',
} satisfies Record<keyof typeof zh, string>
