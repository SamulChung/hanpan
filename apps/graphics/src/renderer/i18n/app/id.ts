import type { zh } from './zh'

export const id = {
  loading: 'Memuat aplikasi…',
  failed: 'Aplikasi tidak dapat dimulai.',
  retry: 'Coba lagi',
  notInstalled: 'Instalasi ini tidak menyertakan aplikasi ini.',
  saveFailed: 'Tidak dapat menyimpan. Dokumen tetap ditandai belum disimpan.',
  layeredSaveNotice: 'Disimpan sebagai PSD agar lapisan dan data penyuntingan tetap ada.',
  openFailed: 'File tidak dapat dibuka. Buka lagi dari aplikasi.',
} satisfies Record<keyof typeof zh, string>
