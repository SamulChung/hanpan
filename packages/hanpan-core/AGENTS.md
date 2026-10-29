# packages/hanpan-core (`@genoffice/hanpan-core`)

한판의 핵심 부품이다. 마인드맵과 그것으로 만든 문서(한글·워드·PPT)를 잇는 중간 모델과, 그 모델로 문서를 쓰고 다시 읽고 맞추는 일, 글집에서 가져온 한국 문서 규칙을 맡는다. 편집기 화면도 Electron도 모른다. 셸 메인 프로세스, 편집기 렌더러, 테스트가 함께 쓴다.

## 맡은 범위

- 판 개요(`outline.ts`): 지도와 무관한 나무 `PanOutline`. 토픽 id가 연결 키다.
- 블록(`blocks.ts`, `markdown-blocks.ts`): 개요나 마크다운을 쪽에 놓을 블록으로. 보고서(□ ○ ― ·), 장 보고서(Ⅰ. □ ○), 공문 번호(1. 가. 1) 가) …, 편람 순서, `numbering.ts`).
- 쓰기: 한글은 rhwp 엔진으로(`hwp-writer.ts`, 엔진은 호출자가 넘긴다, `hwp-engine.ts`), 워드는 `docx` 라이브러리로(`docx-writer.ts`), 슬라이드는 셸의 덱 빌더가 받는 모양으로(`slides.ts`). 모양은 `doc-theme.ts`.
- 슬라이드 스타일 10가지(`slide-styles.ts`): 표지·목차·본문·마무리를 스타일마다 그린다. 본문 모양은 가지의 내용(하위 가지 유무, 항목 수, 단위 붙은 숫자)을 따라 고르고, 빈 가지·한 줄·많은 항목은 공용 배치(장 구분, 큰 문장, 번호 목록)로 간다. 항목을 버리지 않는다. 모양 확인은 `HANPAN_STYLE_PREVIEW_DIR=<폴더>`로 `apps/shell/tests/hanpan-slide-styles.test.ts`를 돌려 덱을 받고 앱의 `--headless-export <덱> --to pdf`로 그려 본다.
- 연결과 맞추기: 연결 기록(`links.ts`), 세 갈래 비교(`sync.ts`: base·지도·문서), 한글 문서를 다시 개요로 읽고 제자리에서 고치기(`hwp-sync.ts`), 지도 탭과 셸 사이의 약속(`sync-protocol.ts`, `send.ts`).
- 글집 규칙(`gongmun.ts`, `hwp-tools.ts`): 공문 날짜·시각·끝., 공문 점검, 세대별 톤, 3색 검토, 역관목조분 프롬프트. 양식 19종(`templates-data.ts`, `tools/hanpan-import-templates.py`가 만든다).
- AI 살 붙이기(`flesh-out.ts`): 프롬프트와 답 읽기만. 호출은 화면 쪽이 공용 AI 창구로 한다.

## 항상 지켜야 하는 것

- **연결 표시는 책갈피다.** 한글은 `hp-<키>`, 워드는 `hp_<키>`(밑줄, 40자). 한글 책갈피는 .hwp·.hwpx 저장을 거쳐 남는다(테스트가 본다). 이름을 바꾸면 이미 만든 문서의 연결이 끊긴다.
- **문단 범위를 지울 때는 그 안의 책갈피를 먼저 지운다.** 엔진은 지운 범위의 책갈피를 남은 문단으로 옮긴다(`removeParagraphs`).
- **문서에서 쓴 본문은 지도가 덮어쓰지 않는다.** 맞추기는 뼈대(제목·자리·추가·삭제)만 오간다.
- **항목은 깊이에 맞는 기호로 쓴다.** 읽을 때 기호로 깊이를 정하므로, 새 항목·옮긴 항목은 그 자리의 기호로 쓰고 `renumber`가 공문 번호를 맞춘다.
- `src/renderer.ts`는 렌더러용 입구다. 문서 쓰기(`docx` 라이브러리)와 엔진 형은 넣지 않는다.

## 테스트

- `npm run test -w @genoffice/hanpan-core`. 한글 테스트는 앱과 같은 rhwp 엔진(`@rhwp/core`)을 node에서 바로 돌린다.
