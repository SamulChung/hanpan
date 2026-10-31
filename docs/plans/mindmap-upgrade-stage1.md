# 마인드맵 보강 1단계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마인드맵 도구 줄을 탭 리본으로 바꾸고, 찾기·바꾸기, 그림 넣기·빼기, 단계별 접기, 정렬, 보이기/감추기를 더한다.

**Architecture:** 편집은 모두 `MapController`의 함수로 들어간다(사람·단축키·메뉴·AI가 같은 길). 찾기는 보기용 자료를 읽는 순수 함수와 화면 막대로 나눈다. 엔진은 그림 빼기 하나만 바뀐다.

**Tech Stack:** TypeScript, React, mind-elixir 5.15.1, Electron IPC, vitest(jsdom), Playwright e2e.

**Spec:** `docs/plans/mindmap-upgrade.md`(1단계, 4-1절)

## Global Constraints

- 바뀐 것이 없는 저장은 원본 바이트 그대로다. 찾기·보이기/감추기·탭 바꾸기는 지도를 "바뀜"으로 만들지 않는다(찾기가 가지를 펼친 경우만 바뀜).
- 지도 색은 문서 내용이다. `map.css`와 `map/`의 그리는 코드에 화면 틀 토큰을 쓰지 않는다. 리본·찾기 막대는 화면 틀이라 `styles.css`에서 토큰으로 칠한다.
- 화면 문구는 `src/renderer/i18n/app/<언어>.ts` 21개 모두. 주석은 영어(`check:english-comments`).
- 새 IPC 창구 이름은 `mindmap:`으로 시작하고 `src/shared/ipc.ts`에 둔다.
- 그림은 png·jpg·gif, `MAX_PICTURE_BYTES`(10MB)까지. 꼴은 첫 바이트로 안다(`sniffPictureExt`).
- 다른 프로그램의 아이콘·그림을 쓰지 않는다. 리본 그림은 `components/icons.tsx`에 새로 그린다.

## Review Focus

1. 접힌 가지 안의 토픽을 찾을 때: 그 가지가 펼쳐지고 토픽이 골라져 보인다. → Task 3 테스트
2. 그린 적 없는 시트에서 모두 바꾸기: 컨트롤러를 만들어 바꾸고 개수에 든다. → Task 3 테스트
3. 요약이 걸린 가지의 정렬: 범위가 흩어지면 먼저 묻고, 거절하면 아무것도 바뀌지 않는다. → Task 2 테스트
4. 다른 프로그램이 넣은 바깥 주소 그림(`https://…`)이 있는 토픽에서 다른 값을 고칠 때: 그림 기록이 그대로 남는다. → Task 1 테스트
5. 제목을 치는 중에 Ctrl+F: 치던 제목이 먼저 지도에 들어가고 찾기 막대가 열린다. → Task 3 테스트

---

### Task 1: 엔진 — 그림 빼기

**Files:**
- Modify: `packages/xmind-engine/src/reconcile-tree.ts`(`writeImage`), `src/reconcile-state.ts`(머리 주석), `src/view.ts`(그림을 보여 주는지 판단을 내보냄)
- Test: `packages/xmind-engine/tests/resource-image.test.ts`
- Docs: `packages/xmind-engine/AGENTS.md`

**Interfaces:**
- Produces: 상태의 `image: null` + 보기용 자료가 그림을 보여 주던 토픽 → 저장에서 `image` 키가 사라진다.

- [ ] 실패하는 테스트: `removing a picture the view showed deletes the image key` — `resources/a.png` 그림 토픽의 상태 그림을 null로 맞추면 `topic.image === undefined`, `changed === true`, 보관 항목 `resources/a.png`는 남는다.
- [ ] 실패하는 테스트: `a web-address picture is removed too` — `image.src = 'https://x/y.png'`인 토픽도 같다.
- [ ] 지키는 테스트: `a topic without a picture and a null state picture is unchanged` — 저장 바이트가 원본과 같다.
- [ ] 구현: `writeImage`에서 `want.image === null`이고 `imageShown(topic.image)`이면 `delete topic.image`. `imageShown`은 `view.ts`의 `imageToView(...) !== null`을 내보내 쓴다.
- [ ] `npm run test -w @genoffice/xmind-engine`, `npm run typecheck -w @genoffice/xmind-engine` 통과.

### Task 2: 컨트롤러 — 그림, 단계별 접기, 정렬

**Files:**
- Modify: `apps/mindmap/src/renderer/map/controller.ts`, `src/renderer/document/session.ts`
- Create: `apps/mindmap/src/renderer/map/sort.ts`
- Test: `apps/mindmap/tests/controller.test.ts`, `tests/sort.test.ts`

**Interfaces:**
- Consumes: Task 1
- Produces:
  - `MapController.setPicture(topicId: string, picture: PictureBytes | null): boolean` — null이면 뺀다. 넣을 때 `session.addPicture` 뒤 `#patchMeta({ image })`, 보기용 자료에 들어가지 않으면 `session.removePicture`하고 false.
  - `MapController.hasPicture(topicId: string): boolean`
  - `MapController.foldToLevel(level: number): void` — 깊이 `level`(중심=0, 큰 가지=1) 토픽까지 보이게. 그보다 깊은 하위가 있는 토픽은 접고 위는 편다. `setAllFolded`처럼 기록 단계가 아니다.
  - `sortedOrder(titles: readonly string[], lang: string, descending: boolean): number[]` (`sort.ts`) — `Intl.Collator(lang, { numeric: true, sensitivity: 'base' })`, 같으면 원래 순서.
  - `MapController.sortChildren(topicId: string, descending: boolean): 'sorted' | 'unchanged' | 'no-children'` — `edit()` 한 번.
  - `MapController.sortNarrowsRanges(topicId: string, descending: boolean): boolean` — 요약·테두리가 감싸던 형제들이 정렬 뒤 이어지지 않으면 true. 범위는 `session.rangesUnder(key, topicId): Array<{ start: number; end: number }>`(원본 나무의 `summaries`·`boundaries`의 `"(s,e)"`, `master`와 읽지 못하는 값은 뺀다).
  - `MapController.sortDirection(topicId: string): boolean` — 지금 오름차순이면 다음은 내림차순(true).

- [ ] 실패하는 테스트(`sort.test.ts`): `['나','가','10','2']` → 오름차순 `['2','10','가','나']`의 순번, 같은 제목은 원래 순서.
- [ ] 실패하는 테스트(`controller.test.ts`):
  - `setPicture inserts a png and Ctrl+Z takes it off` — 저장한 파일의 토픽에 `xap:resources/…png`, 되돌리면 없음.
  - `setPicture(null) removes the picture and the save drops the image key`
  - `foldToLevel(1) folds every main topic that has children and shows the main topics`
  - `sortChildren orders the branches by title as one undo step`
  - `sortNarrowsRanges is true when a summary's branches end up apart` / `false when they stay together`
- [ ] 구현 후 `npm run test -w @genoffice/mindmap -- controller sort` 통과.

### Task 3: 찾기와 바꾸기

**Files:**
- Create: `apps/mindmap/src/renderer/map/find.ts`, `src/renderer/components/FindBar.tsx`
- Modify: `src/renderer/map/controller.ts`(`revealTopic`), `src/renderer/App.tsx`(Ctrl+F·Ctrl+H, 막대 자리), `src/renderer/styles.css`
- Test: `apps/mindmap/tests/find.test.ts`, `tests/app.test.ts`

**Interfaces:**
- Produces:
  - `interface FindOptions { matchCase: boolean; inNotes: boolean }` (`inNotes`면 메모·꼬리표까지)
  - `interface FindMatch { sheetKey: string; topicId: string; where: 'title' | 'note' | 'label'; folded: boolean }`
  - `findMatches(sheets: readonly { key: string; root: ViewTopic }[], query: string, options: FindOptions): FindMatch[]` — 시트 순서, 그 안은 앞순회 순서. 빈 질의는 빈 목록. `folded`는 접힌 조상 아래면 true.
  - `replaceText(text: string, query: string, replacement: string, matchCase: boolean): string` — 글자 그대로(정규식 없음), 모두.
  - `MapController.revealTopic(topicId: string): boolean` — 접힌 조상을 펴고(펼친 게 있으면 `#sync({step:false})`), 고르고, 화면 가운데로.
  - `MapController.replaceInTitles(query: string, replacement: string, matchCase: boolean): number` — 이 시트의 제목만, `edit()` 한 번, 바꾼 수.
  - `FindBar` props: `{ open: boolean; withReplace: boolean; matches: FindMatch[]; index: number; onQuery(q, o); onStep(dir: 1 | -1); onReplace(r); onReplaceAll(r); onClose() }`. 요소: `data-hanpan="mm-find"`, 입력 `data-find="query"`·`data-find="replace"`, 단추 `data-action="find-next|find-prev|replace-one|replace-all|find-close"`, 개수 `data-find="count"`(`3/12`), 접힌 가지 표시 `data-find="folded"`.
- 행동: Ctrl+F 막대 열기(바꾸기 칸 없음), Ctrl+H 바꾸기 칸까지. 열 때 `flushAll()`. Enter=다음, Shift+Enter=이전, Esc=닫기. 다른 시트의 결과로 가면 그 시트로 넘어간다. 바꾸기 하나: 지금 결과가 제목일 때만. 모두 바꾸기: 시트마다 컨트롤러(`controllerFor`와 같은 방식으로 없으면 만든다)의 `replaceInTitles`, 알림 `findReplaced`(`{sheets}개 시트에서 {count}개를 바꿨습니다`).

- [ ] 실패하는 테스트(`find.test.ts`): 제목만/메모 포함, 대소문자, 시트 순서, 접힌 표시, `replaceText`의 꺾쇠·특수문자(`a.b` → 글자 그대로).
- [ ] 실패하는 테스트(`app.test.ts`): `Ctrl+F finds a topic in a folded branch, unfolds it and selects it`; `replace all changes titles on two sheets and says how many`; `Ctrl+F while typing a title keeps the typed title`.
- [ ] 구현 후 테스트 통과.

### Task 4: 그림 파일 고르기 창구

**Files:**
- Modify: `apps/mindmap/src/shared/ipc.ts`(`pickPicture: 'mindmap:pick-picture'`, `PickPictureResult`), `src/main/mindmap-main.ts`(등록), preload(`apps/shell/src/preload` 쪽의 mindmap 노출부 — `fetchImage`가 노출된 같은 파일)
- Test: `apps/mindmap/tests/main.test.ts`

**Interfaces:**
- Produces: `window.mindmapApi.pickPicture(): Promise<PickPictureResult>`, `type PickPictureResult = { status: 'ok'; base64: string } | { status: 'canceled' } | { status: 'too-large' } | { status: 'unreadable' }`. 대화 상자 필터 png·jpg·jpeg·gif, 한 파일. `MAX_PICTURE_BYTES`를 넘으면 읽기 전에 `too-large`.
- [ ] 실패하는 테스트: 취소, 큰 파일, 정상 파일의 base64.
- [ ] 화면은 `pictureFromBase64`로 꼴을 다시 확인하고 `setPicture`. 알림 키 `pictureTooLarge`, `pictureUnsupported`.

### Task 5: 리본

**Files:**
- Modify: `apps/mindmap/src/renderer/components/Toolbar.tsx`(리본으로), `components/icons.tsx`(새 그림: 찾기, 그림, 정렬, 단계 접기, 보이기, 100%), `App.tsx`, `styles.css`, `map/controller.ts`(보이기/감추기 표시), `map.css`
- Test: `apps/mindmap/tests/app.test.ts`, `tests/toolbar-make-from.test.ts`, `tests/look.test.ts`(map.css 토큰 검사 그대로 통과)

**Interfaces:**
- Produces:
  - `type RibbonTab = 'home' | 'insert' | 'format' | 'view'`, 탭 단추 `data-ribbon-tab={tab}`, 고른 탭은 `mindmapapp.ribbonTab`에 기억.
  - 모든 탭 내용을 그리고 고르지 않은 탭은 `hidden`(단위 테스트가 지금 단추를 그대로 찾는다).
  - 탭별 단추와 `data-action`:
    - 홈: `add-child`, `add-sibling` | `relationship`, `summary` | `find` | `delete-topic`
    - 삽입: `picture`(그림 있으면 `picture-remove`로 바뀜), `link`, `note`, `label`
    - 서식: 배치 고르기(`mm-layout`), `sort` | `theme`
    - 보기: `present` | `fold-level-1`, `fold-level-2`, `fold-level-3`, `fold-all`, `unfold-all` | 보이기 메뉴 `show-parts` | `zoom-out`, `zoom-in`, `zoom-100`, `zoom-fit`
    - 늘 보이는 오른쪽 끝: `export`, `make-from-document`, `send-to`, `ai`
  - 버튼 모양은 큰 단추(그림 위, 이름 아래). 높이 고정, 좁으면 가로 스크롤.
  - `type HiddenPart = 'notes' | 'labels' | 'links' | 'markers' | 'pictures'`, `MapController.setHiddenParts(parts: readonly HiddenPart[]): void` — 지도 그릇에 `data-mm-hide="notes labels …"`. `map.css`가 그 표시로 해당 꾸밈을 `display: none`. 기억은 `mindmapapp.hiddenParts`(쉼표). 내보내기 복사본에 이 속성이 실리는지 `export/snapshot.ts`의 남길 속성 목록을 확인한다.
- [ ] 실패하는 테스트: 탭을 누르면 그 탭 내용만 보임; 다시 열면 마지막 탭; `delete-topic`이 고른 토픽을 지움; 보이기 메뉴에서 꼬리표를 끄면 꼬리표 요소가 보이지 않고 저장 바이트가 같음.
- [ ] 발표 모드에서 리본이 숨는 것은 그대로(`.app.mm-presenting .ribbon`).

### Task 6: 문구, 도움말, 문서, e2e

**Files:**
- Modify: `src/renderer/i18n/app/*.ts`(21개), `tools/hanpan-help-topic.py`(마인드맵 단락, 21개 언어)와 다시 만든 도움말, `docs/manual/한판-사용설명서.md`, `apps/mindmap/AGENTS.md`, `packages/xmind-engine/AGENTS.md`, `apps/mindmap/tests/real-run/*.ts`(탭을 먼저 누름)
- Create: `e2e/hanpan-mindmap-ribbon.spec.ts`
- [ ] e2e: 새 지도 → 탭 넷을 차례로 눌러 화면 찍기 → Ctrl+F로 토픽 찾기 → 보기 탭 2단계까지 → 화면 `hanpan-mindmap-ribbon-*`.
- [ ] 검사: `npm run test -w @genoffice/mindmap`, `-w @genoffice/xmind-engine`, 두 typecheck, eslint, prettier, `check:theme-colors`, `check:english-comments`, `check:no-genspark`, `node tools/check-help-langs.mjs`, 셸 빌드 후 e2e(새 spec, `mindmap-tab`, `hanpan-send`).
