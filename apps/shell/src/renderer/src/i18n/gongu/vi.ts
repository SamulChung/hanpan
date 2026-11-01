import type { zh } from './zh'

export const vi = {
  gonguTitle: 'Hình ảnh Gongu',
  gonguDesc:
    'Khóa dùng để tìm hình ảnh đã hết hạn bản quyền trong Gongu, thư viện tác phẩm tự do của Ủy ban Bản quyền Hàn Quốc. Bạn nhận khóa miễn phí từ Cổng dữ liệu công Hàn Quốc (data.go.kr).',
  gonguHowTo:
    'Đăng nhập Cổng dữ liệu công và đăng ký sử dụng "한국저작권위원회_공유(만료)저작물 서비스" (dịch vụ tác phẩm hết hạn bản quyền của Gongu); khóa được cấp ngay. Khóa cho phép tìm tối đa 1.000 lần mỗi ngày.',
  gonguPrivacy:
    'Khi kiểm tra khóa hoặc tìm kiếm, từ khóa tìm kiếm và khóa này được gửi đến Cổng dữ liệu công. Nội dung tài liệu không được gửi. Khóa chỉ lưu trên máy tính này.',
  gonguKey: 'Khóa dịch vụ',
  gonguKeySaved: 'Đã lưu một khóa.',
  gonguNoKey: 'Chưa có khóa.',
  gonguSave: 'Lưu',
  gonguClear: 'Xóa',
  gonguCheck: 'Kiểm tra',
  gonguChecking: 'Đang kiểm tra…',
  gonguOk: 'Khóa hoạt động.',
  gonguErrNoKey: 'Hãy nhập khóa.',
  gonguErrBadKey:
    'Cổng dữ liệu công không chấp nhận khóa này. Hãy sao chép lại khóa hoặc kiểm tra xem đơn đăng ký đã được duyệt chưa. Khóa mới có thể mất khoảng một giờ mới dùng được.',
  gonguErrExpired: 'Khóa đã hết hạn. Hãy gia hạn trên Cổng dữ liệu công.',
  gonguErrQuota: 'Đã dùng hết lượt tìm của hôm nay. Hãy thử lại vào ngày mai.',
  gonguErrRate: 'Quá nhiều yêu cầu trong thời gian ngắn. Hãy thử lại sau giây lát.',
  gonguErrBlocked: 'Cổng dữ liệu công đã chặn các yêu cầu từ địa chỉ internet này.',
  gonguErrNetwork: 'Không kết nối được với Cổng dữ liệu công. Hãy kiểm tra kết nối internet.',
  gonguErrService: 'Cổng dữ liệu công hiện không phản hồi đúng. Hãy thử lại sau giây lát.',
} satisfies Record<keyof typeof zh, string>
