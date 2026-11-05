# apps/graphics (`@genoffice/graphics`)

AI 포토(탭 종류 `photo`, PhotoCraft 웹판)와 AI 일러스트(탭 종류 `illust`, VectorCraft 웹판)를 맡는 편집기다(결정 0093). 껍데기 앱의 탭(`WebContentsView`) 안에서 호스트 페이지가 웹판을 같은 출처 iframe으로 띄우고, 웹판의 페이지 API(`window.photocraft` / `window.vectorcraft`)로 문서를 다룬다.

## 맡은 범위

- 뒷단(`src/main/graphics-main.ts`): 보기 만들기, 연 파일 넘기기, 저장 두 단계(`begin-save`가 대상을 정하고 `commit-save`가 그 대상에만 쓴다), 내보내기·그림 고르기 대화상자, 닫기 확인, Ctrl+S·Ctrl+Shift+S·Ctrl+O·Ctrl+N·Ctrl+P 가로채기.
- 형식 표(`src/shared/kinds.ts`): 여는 확장자, 쓰는 확장자, 새 문서 형식, 레이어 없는 형식, 내보내기 형식, 앱 화면 언어. 껍데기 앱의 열기 경로도 이 표를 읽는다.
- 저장 대상 판단(`src/shared/save-target.ts`).
- 웹판 파일은 `tools/fetch-graphics-web.mjs`가 `public/web/<앱>/`에 받고(git 무시), 빌드가 렌더러 출력에 복사한다.

## 맡지 않는 것

- 웹판 자체의 수정은 `tenaico/hanpan-graphics`(계획 A)의 범위다. 이 저장소는 고정된 릴리스를 받을 뿐이다.
- `ai:*` 채널은 워드 편집기의 뒷단이 등록한다. 여기서 다시 등록하지 않는다.

## 항상 지켜야 하는 것

- 디스크에 쓰는 길은 `commit-save`와 `export-file`뿐이고, 둘 다 이 뒷단이 고른 경로에만 쓴다. 화면이 보낸 경로를 믿지 않는다.
- 보기는 `backgroundThrottling: false`다. 웹판은 애니메이션 프레임에서 페이지 API에 답하므로, 숨긴 탭에서 AI 실행이나 닫을 때의 저장이 멈추지 않게 한다.
- 운영체제 파일 연결을 하지 않는다. 그래픽 확장자를 `LAUNCHABLE_EXTS`·`fileAssociations`에 넣지 않는다.

## 테스트

- `npx vitest run`(이 폴더). 뒷단은 Electron을 가짜로 바꿔 시험한다(`tests/graphics-main.test.ts`).
