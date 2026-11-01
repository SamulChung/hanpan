import type { zh } from './zh'

export const id = {
  gonguTitle: 'Gambar Gongu',
  gonguDesc:
    'Kunci untuk mencari gambar yang hak ciptanya telah berakhir di Gongu, perpustakaan karya bebas milik Komisi Hak Cipta Korea. Kunci didapat gratis dari Portal Data Publik Korea (data.go.kr).',
  gonguHowTo:
    'Masuk ke Portal Data Publik lalu ajukan penggunaan "한국저작권위원회_공유(만료)저작물 서비스" (layanan karya kedaluwarsa Gongu); kunci langsung diterbitkan. Kunci ini mengizinkan hingga 1.000 pencarian per hari.',
  gonguPrivacy:
    'Saat memeriksa kunci atau mencari, kata pencarian dan kunci ini dikirim ke Portal Data Publik. Isi dokumen tidak dikirim. Kunci tetap berada di PC ini.',
  gonguKey: 'Kunci layanan',
  gonguKeySaved: 'Kunci sudah disimpan.',
  gonguNoKey: 'Tidak ada kunci.',
  gonguSave: 'Simpan',
  gonguClear: 'Hapus',
  gonguCheck: 'Periksa',
  gonguChecking: 'Memeriksa…',
  gonguOk: 'Kunci berfungsi.',
  gonguErrNoKey: 'Masukkan kunci.',
  gonguErrBadKey:
    'Portal Data Publik tidak menerima kunci ini. Salin ulang kuncinya, atau pastikan pengajuan Anda sudah disetujui. Kunci baru bisa memerlukan sekitar satu jam sebelum berfungsi.',
  gonguErrExpired: 'Masa berlaku kunci sudah habis. Perpanjang di Portal Data Publik.',
  gonguErrQuota: 'Jatah pencarian hari ini sudah habis. Coba lagi besok.',
  gonguErrRate: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi sebentar lagi.',
  gonguErrBlocked: 'Portal Data Publik memblokir permintaan dari alamat internet ini.',
  gonguErrNetwork: 'Tidak dapat terhubung ke Portal Data Publik. Periksa koneksi internet Anda.',
  gonguErrService:
    'Portal Data Publik sedang tidak merespons dengan benar. Coba lagi sebentar lagi.',
} satisfies Record<keyof typeof zh, string>
