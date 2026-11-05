import type { zh } from './zh'

export const ko = {
  loading: '앱을 불러오는 중…',
  failed: '앱을 띄우지 못했습니다.',
  retry: '다시 시도',
  notInstalled: '이 설치본에는 이 앱이 들어 있지 않습니다.',
  saveFailed: '저장하지 못했습니다. 문서는 저장 안 됨으로 남습니다.',
  layeredSaveNotice: '레이어와 편집 정보를 지키려고 PSD로 저장합니다.',
  openFailed: '파일을 열지 못했습니다. 앱에서 다시 열어 주세요.',
} satisfies Record<keyof typeof zh, string>
