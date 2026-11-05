import type { zh } from './zh'

export const vi = {
  loading: 'Đang tải ứng dụng…',
  failed: 'Không thể khởi động ứng dụng.',
  retry: 'Thử lại',
  notInstalled: 'Bản cài đặt này không có ứng dụng này.',
  saveFailed: 'Không lưu được. Tài liệu vẫn được đánh dấu là chưa lưu.',
  layeredSaveNotice: 'Lưu dưới dạng PSD để giữ các lớp và dữ liệu chỉnh sửa.',
  openFailed: 'Không mở được tệp. Hãy mở lại từ ứng dụng.',
} satisfies Record<keyof typeof zh, string>
