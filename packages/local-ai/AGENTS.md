# packages/local-ai (`@genoffice/local-ai`)

"내 PC AI". 이 PC에서 도는 AI 서버를 찾고(Ollama, LM Studio, vLLM·TenOS, llama.cpp), 한국어를 잘 쓰는 대화 모델을 고르고, 한 번 묻는다. 한판뿐 아니라 앞으로 만들 다른 프로그램도 이 파일(`src/index.ts`) 하나를 그대로 가져다 쓰도록 만든 부품이다.

## 항상 지켜야 하는 것

- **의존성이 없다.** 플랫폼의 `fetch`만 쓴다. Electron·DOM·node 전용 모듈을 넣지 않는다.
- **루프백 주소만 찾는다**(`isLoopback`). 다른 주소를 넣어도 찾지 않는다. "내 PC"가 약속이다.
- **찾기는 던지지 않는다.** 서버가 없으면 빈 목록이다. 묻기(`complete`)는 실패를 던진다.
- 모델 선호 순서(`KOREAN_MODEL_PREFERENCE`)를 바꾸면 테스트의 기대도 함께 바꾼다. 임베딩·음성·그림 전용 모델은 고르지 않는다.

## 테스트

- `npm run test -w @genoffice/local-ai`. 가짜 `fetch`로 돈다. 실제 서버에 닿지 않는다.
