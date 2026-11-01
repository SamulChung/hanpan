import type { zh } from './zh'

export const ko = {
  gonguTitle: '공유마당 그림',
  gonguDesc:
    '한국저작권위원회 공유마당에서 저작권이 끝난 그림을 찾는 데 쓰는 키입니다. 키는 공공데이터포털(data.go.kr)에서 무료로 받습니다.',
  gonguHowTo:
    '공공데이터포털에 로그인해 "한국저작권위원회_공유(만료)저작물 서비스"를 활용신청하면 바로 키가 나옵니다. 하루 1,000번까지 찾을 수 있습니다.',
  gonguPrivacy:
    '확인하거나 찾을 때 검색어와 이 키가 공공데이터포털로 갑니다. 문서 내용은 가지 않습니다. 키는 이 PC에만 둡니다.',
  gonguKey: '인증키',
  gonguKeySaved: '저장된 키가 있습니다.',
  gonguNoKey: '키가 없습니다.',
  gonguSave: '저장',
  gonguClear: '지우기',
  gonguCheck: '확인',
  gonguChecking: '확인하는 중…',
  gonguOk: '키가 작동합니다.',
  gonguErrNoKey: '키를 넣으세요.',
  gonguErrBadKey:
    '공공데이터포털이 이 키를 받지 않습니다. 키를 다시 복사하거나 활용신청이 승인됐는지 확인하세요. 새 키는 쓸 수 있게 되기까지 한 시간쯤 걸리기도 합니다.',
  gonguErrExpired: '키의 사용 기한이 끝났습니다. 공공데이터포털에서 기간을 늘리세요.',
  gonguErrQuota: '오늘 쓸 수 있는 횟수를 다 썼습니다. 내일 다시 시도하세요.',
  gonguErrRate: '짧은 시간에 요청이 너무 많았습니다. 잠시 뒤 다시 시도하세요.',
  gonguErrBlocked: '공공데이터포털이 이 인터넷 주소에서 온 요청을 막았습니다.',
  gonguErrNetwork: '공공데이터포털에 연결하지 못했습니다. 인터넷 연결을 확인하세요.',
  gonguErrService: '공공데이터포털이 지금 제대로 답하지 않습니다. 잠시 뒤 다시 시도하세요.',
} satisfies Record<keyof typeof zh, string>
