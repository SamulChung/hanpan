/**
 * Hanpan's own templates with pictures, and the pictures they use. Every
 * picture is free to bundle and hand on: a work whose term has run out (만료)
 * or one under CC BY, all from 공유마당 (gongu.copyright.or.kr, the Korea
 * Copyright Commission). The credit is written under the picture whenever a
 * template puts it in a document. The bytes live with the app (the shell
 * resolves the id); this file only knows what each one is.
 */
import type { DocTemplate } from './templates-data'

export interface TemplatePicture {
  id: string
  title: string
  author: string
  /** `만료`: the term has run out; `CC BY`: free with the credit */
  terms: '만료' | 'CC BY'
  /** who published the digital copy, when 공유마당 names one */
  publisher?: string | undefined
  /** the work's page on 공유마당 */
  source: string
  width: number
  height: number
}

const GONGU = 'https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn='

export const TEMPLATE_PICTURES: readonly TemplatePicture[] = [
  {
    id: 'inwang',
    title: '인왕제색도',
    author: '정선',
    terms: '만료',
    source: `${GONGU}13364846`,
    width: 1280,
    height: 743,
  },
  {
    id: 'geumgang',
    title: '금강전도',
    author: '김응환',
    terms: '만료',
    source: `${GONGU}13360977`,
    width: 1280,
    height: 974,
  },
  {
    id: 'chuseong',
    title: '추성부도',
    author: '김홍도',
    terms: '만료',
    source: `${GONGU}13362021`,
    width: 1280,
    height: 332,
  },
  {
    id: 'seodang',
    title: '서당',
    author: '허림',
    terms: '만료',
    source: `${GONGU}13365967`,
    width: 1065,
    height: 1280,
  },
  {
    id: 'ssireum',
    title: '풍속화첩_씨름',
    author: '김홍도',
    terms: 'CC BY',
    publisher: '한국데이터베이스산업진흥원',
    source: `${GONGU}13216448`,
    width: 1063,
    height: 1280,
  },
]

/** The line under a picture: author, title, publisher, where it is from, on what terms. */
export function pictureCredit(p: TemplatePicture): string {
  const terms = p.terms === '만료' ? '저작권 보호기간 만료' : 'CC BY'
  return `출처: ${p.author}, 「${p.title}」${p.publisher ? `, ${p.publisher}` : ''}, 공유마당, ${terms}`
}

/** A template as mind-map outline text: picture lines say nothing to a map, so they go. */
export function templateMapOutline(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !/^!\[[^\]]*\]\(picture:[a-z0-9-]+\)$/.test(line.trim()))
    .join('\n')
}

/** Lesson and notice templates for schools, in the 교육 kind. */
export const PICTURE_TEMPLATES: readonly DocTemplate[] = [
  {
    id: 'old-painting-lesson',
    title: '옛 그림 감상 수업 지도안',
    category: '교육',
    description:
      '정선·김홍도 등 저작권이 끝난 옛 그림으로 짜는 감상 수업. 그림마다 출처가 붙어 있다',
    icon: '🖼️',
    tags: ['수업', '지도안', '미술', '옛 그림', '공유마당'],
    markdown: [
      '# 옛 그림 감상 수업 지도안',
      '',
      '**대상:** ○학년 ○반',
      '**차시:** ○/○차시 (40분)',
      '**지도 교사:** ○○○',
      '',
      '## Ⅰ. 수업 개요',
      '',
      '- 학습 목표: 옛 그림에 담긴 사람들의 삶과 자연을 살펴보고, 느낀 점을 말과 글로 나눈다.',
      '- 준비물: 그림 자료(아래), 감상 활동지',
      '',
      '## Ⅱ. 감상할 그림',
      '',
      '### 1. 산과 비 갠 뒤의 풍경',
      '',
      '![인왕제색도](picture:inwang)',
      '',
      '- 비가 그친 뒤 산의 모습이 어떻게 그려졌는지 찾아본다.',
      '',
      '### 2. 서당의 하루',
      '',
      '![서당](picture:seodang)',
      '',
      '- 그림 속 사람들은 무엇을 하고 있는지, 표정은 어떤지 이야기한다.',
      '',
      '### 3. 씨름 구경',
      '',
      '![씨름](picture:ssireum)',
      '',
      '- 누가 이길 것 같은지, 그렇게 생각한 까닭을 그림에서 찾는다.',
      '',
      '## Ⅲ. 수업 흐름',
      '',
      '| 단계 | 활동 | 시간 |',
      '| --- | --- | --- |',
      '| 도입 | 그림 한 장 보고 떠오르는 낱말 말하기 | 5분 |',
      '| 전개 | 모둠별로 그림 하나씩 맡아 살펴보기 | 25분 |',
      '| 정리 | 모둠 발표, 가장 마음에 든 장면 고르기 | 10분 |',
      '',
      '## Ⅳ. 평가',
      '',
      '- 그림에서 찾은 근거를 들어 자기 생각을 말하는가',
      '',
      '> ※ 그림은 저작권 보호기간이 끝났거나 CC BY로 공개된 공유마당 저작물이다. 그림 아래의 출처 줄은 지우지 않는다.',
      '',
    ].join('\n'),
  },
  {
    id: 'old-painting-notice',
    title: '옛 그림 전시 안내문',
    category: '교육',
    description:
      '학교·도서관의 작은 전시나 행사 안내. 김응환·김홍도의 옛 그림이 출처와 함께 들어 있다',
    icon: '🏞️',
    tags: ['안내문', '전시', '가정통신문', '옛 그림', '공유마당'],
    markdown: [
      '# 「우리 옛 그림 산책」 전시 안내',
      '',
      '**기간:** 2026년 ○월 ○일 ~ ○월 ○일',
      '**장소:** ○○학교 도서관',
      '**문의:** ○○○ (☎ 000-0000)',
      '',
      '## 1. 전시 소개',
      '',
      '조선 시대 화가들이 그린 산과 계절을 함께 감상합니다. 금강산을 한눈에 담은 그림과, 가을 소리를 그린 그림을 만날 수 있습니다.',
      '',
      '![금강전도](picture:geumgang)',
      '',
      '![추성부도](picture:chuseong)',
      '',
      '## 2. 함께 하는 활동',
      '',
      '- 그림 속 숨은 사람 찾기',
      '- 마음에 드는 그림을 골라 엽서 꾸미기',
      '',
      '## 3. 관람 안내',
      '',
      '- 관람료는 없습니다.',
      '- 단체 관람은 ○월 ○일까지 신청해 주세요.',
      '',
      '> ※ 그림은 저작권 보호기간이 끝난 공유마당 저작물입니다.',
      '',
    ].join('\n'),
  },
  {
    id: 'expired-story-lesson',
    title: '「운수 좋은 날」 함께 읽기',
    category: '교육',
    description:
      '현진건의 단편(1924, 저작권 만료)으로 짜는 읽기 수업. 마인드맵으로 열어 인물과 사건을 가지로 정리할 수 있다',
    icon: '📖',
    tags: ['수업', '국어', '소설', '만료 저작물', '마인드맵'],
    markdown: [
      '# 「운수 좋은 날」 함께 읽기',
      '',
      '**작품:** 현진건, 「운수 좋은 날」(1924)',
      '**대상:** ○학년 (2차시)',
      '',
      '## Ⅰ. 작품과 작가',
      '',
      '- 작가: 현진건(1900~1943). 사실적인 묘사로 일제 강점기 사람들의 삶을 그렸다.',
      '- 갈래: 단편 소설, 1924년 「개벽」에 발표',
      '- 배경: 겨울비 내리는 날, 서울',
      '',
      '## Ⅱ. 인물',
      '',
      '- 김 첨지: 인력거꾼. 거칠게 말하지만 앓는 아내를 걱정한다.',
      '- 아내: 오래 앓아누워 설렁탕을 먹고 싶어 한다.',
      '- 치삼이: 김 첨지와 술을 마시는 친구',
      '',
      '## Ⅲ. 사건의 흐름',
      '',
      '- 아침: 아내가 나가지 말라고 붙잡는다.',
      '- 낮: 손님이 이어지며 오랜만에 돈을 많이 번다.',
      '- 저녁: 불안한 마음에 집에 바로 가지 못하고 술집에 들른다.',
      '- 밤: 설렁탕을 사 들고 집에 돌아온다.',
      '',
      '## Ⅳ. 생각해 볼 것',
      '',
      '- 제목의 "운수 좋은"은 정말 좋은 운을 뜻할까?',
      '- 김 첨지가 집에 바로 가지 못한 까닭은 무엇일까?',
      '- 비가 내리는 날씨는 이야기의 분위기와 어떻게 이어질까?',
      '',
      '## Ⅴ. 활동',
      '',
      '- 모둠별로 인물 하나를 맡아 그 인물의 하루를 마인드맵 가지로 정리한다.',
      '- 마지막 장면 뒤의 이야기를 짧게 이어 써 본다.',
      '',
      '> ※ 현진건의 작품은 저작권 보호기간이 끝나 누구나 읽고 나눌 수 있다. 다만 요즘 표기로 고친 판이나 해설에는 새 저작권이 있을 수 있으니, 원문을 옮길 때는 어느 판인지 확인한다.',
      '',
    ].join('\n'),
  },
]
