# 마인드맵 2단계: 아이콘 — 구현 계획

상태: **구현됨**(2026-11-01). 결정 0085.

설계: `docs/plans/mindmap-upgrade.md`의 "2단계: 아이콘"과 4-1절. 1단계 계획은 `mindmap-upgrade-stage1.md`.

**목표:** 토픽에 우선순위·진행률·깃발·별·스마일·화살표 아이콘을 붙이고 떼며, 그것이 `.xmind` 파일에 저장되게 한다.

## 식별자 (확인한 출처)

xmind-sdk-js(MIT)의 `src/common/constants/marker.ts`에 있는 이름만 쓴다. 전체 식별자는 `<묶음>-<이름>`이다.

| 묶음     | 패널에 두는 것                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| 우선순위 | `priority-1` … `priority-9`                                                                                          |
| 진행률   | `task-start`, `task-quarter`, `task-half`, `task-3quar`, `task-done`                                                 |
| 깃발     | `flag-red`, `flag-orange`, `flag-dark-blue`, `flag-purple`, `flag-green`, `flag-blue`, `flag-gray`                   |
| 별       | `star-` + 깃발과 같은 일곱 색                                                                                        |
| 스마일   | `smiley-laugh`, `smiley-smile`, `smiley-cry`, `smiley-surprise`, `smiley-boring`, `smiley-angry`, `smiley-embarrass` |
| 화살표   | `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`, `arrow-left-right`, `arrow-up-down`, `arrow-refresh`          |

진행률의 8분의 1 단계(`task-oct` 등)와 그 SDK가 숨긴 색은 패널에 두지 않지만, 파일에 있으면 지금처럼 그리고 같은 묶음으로 친다.

## 작업

1. **엔진** (`packages/xmind-engine`)
   - `StateTopic.markers: string[] | null`. 키가 없으면 null(쓰지 않음), 목록이 아니면 거절.
   - `reconcile-tree.ts`의 `writeMarkers`: 보기의 목록(`markerIdsOf`)과 같으면 아무것도 하지 않는다. 다르면 새로 생긴 식별자만 꼴(`^[a-z0-9]+(?:-[a-z0-9]+)*$`, 64자까지)을 검사하고, 새로 붙여 50개를 넘으면 거절한다. 남은 것은 파일의 기록을 그대로 쓰고(같은 식별자가 여럿이면 차례대로), 새 것은 `{ markerId }`로 더한다. 보기에 없던 항목(식별자가 글자가 아닌 기록 등)은 뒤에 남긴다. 남은 것이 없으면 키를 지운다.
   - 테스트: 열고 저장만 하면 바이트가 같다, 아이콘 하나를 붙이면 `content.json`만 달라진다, 파일의 모르는 키가 남는다, 꼴에 맞지 않는 파일의 아이콘은 다른 토픽을 고쳐도 글자 그대로다, 새 식별자의 꼴·50개 상한 거절, 키가 없는 상태는 아무것도 바꾸지 않는다.
2. **편집기**
   - `map/marker-families.ts`: 묶음 판정(`markerFamily`), 패널 목록(`MARKER_GROUPS`), 같은 묶음을 바꾸는 `withMarker`, 묶음을 떼는 `withoutFamily`.
   - `markers.ts`: 스마일 일곱과 화살표 일곱을 새로 그린다. 그림마다 `data-marker-index`(몇 번째인지)만 붙인다. 식별자는 화면에 싣지 않는다.
   - 컨트롤러: `markersOf(id)`, `toggleMarker(ids, markerId)`(골라 둔 모든 토픽에 한 단계), `setMarkers(id, list)`.
   - `IconPanel.tsx`: 오른쪽 패널(메모·테마·AI와 하나만), `mindmapapp.showIcons`에 열림을 기억한다. 삽입 탭의 "아이콘" 단추가 연다.
   - 지도 위 아이콘을 누르면 그 묶음의 다른 것과 "떼기"가 있는 작은 메뉴(`MarkerMenu`).
   - 붙여 넣은 토픽의 아이콘은 꼴에 맞는 것만 남긴다(`cleanPastedNode`).
3. **AI**: `edit_map`에 `set_marker {id, kind, level}`, `clear_marker {id, kind}`. `read_topic`에 `markers`, `read_map`의 토픽 줄 끝에 `[!priority-1]`(엔진의 개요 형식은 그대로, 이 도구가 붙이고 `write_map`이 다시 뗀다).
4. **문구·문서**: 21개 언어, 한판 도움말, 사용 설명서, 두 `AGENTS.md`, 결정 0085(엔진이 아이콘을 쓴다).
5. **검사**: 두 패키지의 테스트·형 검사, eslint, prettier, 저장소 검사, e2e에 아이콘 패널 화면.

## 살펴볼 것

- 아이콘이 있는 파일을 열고 다른 것만 고쳐 저장해도 아이콘 기록이 그대로인지.
- 같은 묶음의 아이콘이 둘 붙은 파일(다른 프로그램이 쓴 것)에서 하나를 바꾸면 둘 다 그 묶음의 새 것 하나로 바뀌는지.
- 여러 토픽을 고르고 누르면 한 단계로 되돌아가는지.
- AI가 모르는 묶음·단계를 주면 그 편집만 이유와 함께 실패하는지.
