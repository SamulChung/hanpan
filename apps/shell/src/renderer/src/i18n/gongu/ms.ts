import type { zh } from './zh'

export const ms = {
  gonguTitle: 'Gambar Gongu',
  gonguDesc:
    'Kunci untuk mencari gambar yang hak ciptanya telah tamat dalam Gongu, perpustakaan karya bebas Suruhanjaya Hak Cipta Korea. Anda boleh mendapatkannya secara percuma daripada Portal Data Awam Korea (data.go.kr).',
  gonguHowTo:
    'Log masuk ke Portal Data Awam dan mohon penggunaan "한국저작권위원회_공유(만료)저작물 서비스" (perkhidmatan karya tamat tempoh Gongu); kunci dikeluarkan serta-merta. Kunci ini membenarkan sehingga 1,000 carian sehari.',
  gonguPrivacy:
    'Semasa menyemak kunci atau mencari, kata carian dan kunci ini dihantar ke Portal Data Awam. Kandungan dokumen tidak dihantar. Kunci kekal dalam PC ini.',
  gonguKey: 'Kunci perkhidmatan',
  gonguKeySaved: 'Kunci telah disimpan.',
  gonguNoKey: 'Tiada kunci.',
  gonguSave: 'Simpan',
  gonguClear: 'Kosongkan',
  gonguCheck: 'Semak',
  gonguChecking: 'Menyemak…',
  gonguOk: 'Kunci berfungsi.',
  gonguErrNoKey: 'Masukkan kunci.',
  gonguErrBadKey:
    'Portal Data Awam tidak menerima kunci ini. Salin semula atau pastikan permohonan anda telah diluluskan. Kunci baharu mungkin mengambil masa kira-kira sejam sebelum berfungsi.',
  gonguErrExpired: 'Kunci telah tamat tempoh. Lanjutkannya di Portal Data Awam.',
  gonguErrQuota: 'Had carian hari ini telah habis. Cuba lagi esok.',
  gonguErrRate: 'Terlalu banyak permintaan dalam masa singkat. Cuba lagi sebentar nanti.',
  gonguErrBlocked: 'Portal Data Awam menyekat permintaan daripada alamat internet ini.',
  gonguErrNetwork: 'Tidak dapat menghubungi Portal Data Awam. Semak sambungan internet anda.',
  gonguErrService:
    'Portal Data Awam tidak memberi jawapan yang betul sekarang. Cuba lagi sebentar nanti.',
} satisfies Record<keyof typeof zh, string>
