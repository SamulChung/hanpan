/**
 * Official forms (서식) attached to Korean statutes, bundled as the HWP files
 * the National Law Information Center (law.go.kr) publishes. A form attached to
 * an enforcement rule is part of that rule, and statutes are not protected works
 * (저작권법 제7조), so the files ship unchanged. The bytes live with the shell
 * (`apps/shell/src/main/hanpan/forms/`); this file only knows what each one is.
 * Forms are amended now and then: `amended` is the version bundled.
 */

export interface OfficialForm {
  id: string
  title: string
  description: string
  icon: string
  /** the statute the form is attached to, as law.go.kr names it */
  law: string
  /** the form's place in that statute, e.g. `별지 제3호서식` */
  form: string
  /** when the bundled version was last amended, as the form itself says; absent when it says none */
  amended?: string
  /** the statute's page on law.go.kr, where the current form can be checked */
  source: string
}

const LAW = 'https://www.law.go.kr/법령/'

export const OFFICIAL_FORMS: readonly OfficialForm[] = [
  {
    id: 'form-info-disclosure',
    title: '정보공개 청구서',
    description:
      '공공기관에 정보공개를 청구할 때 내는 법정 서식. 청구 내용, 공개 방법, 수령 방법을 적는다',
    icon: '📂',
    law: '공공기관의 정보공개에 관한 법률 시행규칙',
    form: '별지 제1호의2서식',
    amended: '2024. 9. 13.',
    source: `${LAW}공공기관의정보공개에관한법률시행규칙`,
  },
  {
    id: 'form-admin-appeal',
    title: '행정심판 청구서',
    description:
      '행정청의 처분이나 부작위에 불복해 행정심판을 청구하는 법정 서식. 청구 취지와 이유는 별지로 쓴다',
    icon: '⚖️',
    law: '행정심판법 시행규칙',
    form: '별지 제30호서식',
    amended: '2025. 9. 24.',
    source: `${LAW}행정심판법시행규칙`,
  },
  {
    id: 'form-power-of-attorney',
    title: '위임장 (민원)',
    description: '다른 사람에게 민원 신청과 서류 발급을 맡길 때 쓰는 법정 서식',
    icon: '✍️',
    law: '민원 처리에 관한 법률 시행규칙',
    form: '별지 제3호서식',
    amended: '2023. 3. 30.',
    source: `${LAW}민원처리에관한법률시행규칙`,
  },
  {
    id: 'form-refusal-objection',
    title: '거부처분 이의신청서',
    description:
      '민원이 거부되었을 때 그 행정기관에 이의를 신청하는 법정 서식. 거부처분을 받은 날부터 90일 안에 낸다',
    icon: '🙋',
    law: '민원 처리에 관한 법률 시행규칙',
    form: '별지 제11호서식',
    source: `${LAW}민원처리에관한법률시행규칙`,
  },
]

/** Where a form comes from, as one line: 「법령」 별지 제N호서식 (YYYY. M. D. 개정). */
export function officialFormSource(f: OfficialForm): string {
  return `「${f.law}」 ${f.form}${f.amended ? ` (${f.amended} 개정)` : ''}`
}
