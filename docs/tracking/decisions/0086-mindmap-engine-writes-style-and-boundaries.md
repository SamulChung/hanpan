# 0086 마인드맵 엔진이 토픽 서식과 테두리(경계)를 파일에 쓴다

## 맥락

`.xmind` 토픽의 서식은 `style.properties`의 속성들이고, 테두리는 토픽의 `boundaries` 기록(`{ id, range: "(a,b)", title? }`)이다. 지금까지 엔진은 서식 넷(글자색·채우기·굵기·크기)을 보기용 자료에 실어 그리게만 했고, 테두리는 보이지 않는 요소로 남겨 두기만 했다.

마인드맵 보강 계획(`docs/plans/mindmap-upgrade.md` 3·4단계)은 스타일 탭과 서식 복사, 테두리를 사람과 AI가 쓰게 한다. 저장소 주인이 엔진을 고쳐도 된다고 했다(2026-11-01). 결정 0085(아이콘)와 같은 원칙을 따른다.

## 결정

- **서식은 보기와 다른 속성만 쓴다.** 보기용 자료가 아는 속성은 열둘이다: `fo:color`, `svg:fill`, `fo:font-weight`, `fo:font-size`, `fo:font-style`, `fo:text-decoration`, `fo:font-family`, `border-line-color`, `border-line-width`, `shape-class`, `line-color`, `line-width`.
- **바뀐 값만 이 패키지가 쓰는 한 가지 꼴로 검사한다.** 색은 `#rrggbb`·`#rrggbbaa`(채우기는 `none`도), 크기는 정수 `pt`, 모양은 `roundedRect`·`ellipserect`·`underline` 셋, 글꼴은 글자·숫자·공백·하이픈 64자까지. 파일에 원래 있던 값은 꼴이 달라도 그대로 둔다.
- **값을 지우면 그 속성만 뺀다.** `style.id`와 모르는 속성은 남는다. 서식 기록이 없던 토픽은 값을 처음 줄 때만 `{ id: 새 식별자, properties }`를 만든다. 시트 테마는 건드리지 않는다. 토픽 서식은 테마 위에 덧칠이다.
- **테두리는 식별자로 짝짓는다.** 식별자가 있고 범위가 가지 안인 기록만 보기용 자료에 `{ id, title, start, end }`로 나온다. 중심 토픽 전체(`master`)와 맞지 않는 기록은 예전처럼 보존만 한다.
- **상태의 테두리를 맞춘다.** 같은 식별자의 기록은 범위와 제목만 고친다(빈 제목은 `title` 키를 지움). 새 식별자는 새 기록이 된다. 남은 토픽에서 상태가 빠뜨린 기록은 지운다. 기록의 다른 키는 남는다. 상태에 키가 없는 토픽은 건드리지 않는다. 가지보다 넓은 범위와 같은 식별자 두 번은 거절한다.
- **보이는 테두리는 보존만 하는 요소로 세지 않는다.** 그래서 테두리가 있는 토픽도 지울 수 있고, 지우면 테두리도 함께 간다.

## 택하지 않은 것

- **서식 기록을 통째로 다시 쓰기.** 다른 프로그램이 넣은 속성과 `style.id`가 사라진다.
- **테두리를 순번으로 짝짓기.** 가지를 옮기거나 정렬하면 다른 테두리의 제목이 엉뚱한 것에 붙는다.
- **`master` 테두리도 보이기.** 드물고 그리는 규칙이 달라, 이번에는 남겨 두기만 한다.

## 결과

- 엔진: `reconcile-style.ts`, `reconcile-boundaries.ts`, `view.ts`의 `styleToView`·`boundariesToView`, `reconcile-state.ts`의 검사, `preserved.ts`의 셈.
- 편집기: 스타일 탭(`StyleTab.tsx`), `map/style-edit.ts`, 컨트롤러의 서식·서식 복사·테두리 함수, `decorate.ts`의 그리기.
- AI: `edit_map`의 `set_style`·`add_boundary`·`remove_boundary`, `read_map`의 테두리 목록, `read_topic`의 `style`·`boundaries`.
- 다른 프로그램(XMind, 알마인드)에서 서식과 테두리가 보이는지는 저장소 주인이 확인한다. 확인 전에는 릴리스 본문에 그렇게 쓰지 않는다.
- 테스트: `packages/xmind-engine/tests/style.test.ts`·`boundaries.test.ts`, `apps/mindmap/tests/controller.test.ts`·`decorate.test.ts`·`ai-tools.test.ts`의 서식·테두리 부분.
