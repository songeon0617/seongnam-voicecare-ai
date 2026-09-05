# 텍스트 MVP 연결 검증 기록

검증일: 2026-09-05

## 1. 이번 작업 변경 파일

기존 작업 트리의 AI 생성 구현을 보존한 상태에서 다음 파일을 추가/수정했다.

| 구분 | 파일 | 변경 |
| --- | --- | --- |
| UI | `src/components/question-panel/question-panel.tsx` | 서버 answer 연결, 로딩/오류/429/취소/15초 제한, 상태 알림 |
| UI | `src/components/question-panel/public-information-answer.tsx` | 답변·구조화 필드·출처·확인 상태 표시 컴포넌트 추가 |
| UI | `src/components/question-panel/question-panel.module.css` | 원문 문단·출처·확인 상태 스타일 |
| UI | `src/app/page.tsx` | 현재 텍스트 MVP 기능에 맞는 설명 |
| 매핑 | `src/lib/public-information/map-documents-to-answer.ts` | 검증 설명의 내부 상태 코드를 자연어로 변경 |
| API | `src/app/api/public-information/search/route.ts` | Node 런타임, 공유 제한기 기반 핸들러 연결 |
| API | `src/lib/search/handle-public-information-search.ts` | 요청 크기/시간/형식 제한, 429 및 no-store 응답 |
| API | `src/lib/search/search-request-limit.ts` | 프로세스 단위 요청 수·동시 실행 수 제한 |
| 타입 | `src/types/public-information-search.ts` | 요청 제한 관련 오류 코드 추가 |
| 테스트 | `src/lib/search/search-request-limit.test.ts` | 제한·복구·오류·본문 수신 제한 테스트 |
| 테스트 | `src/lib/search/create-public-information-response-with-answer.test.ts` | 실제 어댑터 timeout에서 fallback까지의 통합 테스트 추가 |
| 테스트 | `tests/ui/question-panel.spec.ts` | Chromium UI 테스트 9건 |
| 테스트 | `playwright.config.ts` | 키/모델 없이 AI 비활성 상태로 테스트 서버 실행 |
| 실행 도구 | `scripts/smoke-openai.ts` | 명시적 실행 시 실제 OpenAI 1회 검증 |
| 패키지 | `package.json`, `package-lock.json` | Playwright, @next/env 및 테스트/smoke 명령 |
| 설정 | `.gitignore` | 브라우저 테스트 산출물 제외 |
| 문서 | `README.md` | 실행·UI·제한·smoke test·한계 문서화 |
| 문서 | `docs/text-mvp-validation.md` | 이번 검증 기록 |

기존 `.env.example`, 생성 안전 검증 및 OpenAI 어댑터 구현은 그대로 유지했다. AI feature flag 기본값도 비활성 상태를 유지한다.

## 2. OpenAI 검토와 실제 smoke test

- **SDK 버전: 해당 없음.** OpenAI SDK를 설치하지 않고 서버 fetch로 `POST https://api.openai.com/v1/responses`를 호출한다.
- `OPENAI_MODEL`은 서버 환경변수이며 기본 모델을 지정하거나 자동 변경하지 않는다. 키와 모델, 명시적 활성화가 모두 있어야 호출한다.
- 요청은 Responses API의 `text.format` JSON schema/strict 형식을 사용한다. [공식 Structured Outputs 문서](https://developers.openai.com/api/docs/guides/structured-outputs) 및 [Responses API 문서](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create)를 확인했다.
- 8초 제한은 응답 본문 읽기까지 포함한다. 시간 초과 시 abort하며 자동 재시도는 없다. 출력 상한 512토큰, `store: false`, 도구 없음, redirect 거부를 유지했다.
- 완료 상태·assistant 메시지 1개·output_text 1개·JSON 파싱 후 허용 키/값을 재검증한다. 거절·미완료·잘못된 출력·API 오류는 원본 답변으로 복귀한다.
- **실제 smoke test: SKIPPED, 외부 호출 0회.** 프로세스에 키·모델이 없고 `.env.local`도 없었다. 네트워크 차단 때문에 실패했다고 판단한 것은 아니다. 계정/모델 접근 권한과 실제 응답 시간은 미검증이다.
- `npm run smoke:openai`를 실행해 설정 누락 경로를 확인했다. 설정 후 실행하면 등록 자료 질문 1건을 실제 생성 경로로 검증한다. 키·질문·응답·원시 오류를 출력하지 않는다.

## 3. UI 전체 데이터 흐름

텍스트 질문 → 기존 POST API → 요청 제한/입력 검증 → 허용된 공식 문서 검색 → 안전 매핑 → AI 표현 코드 선택 또는 deterministic fallback → `answer` 반환 → `QuestionPanel` → `PublicInformationAnswerView`.

UI는 `answerGeneration` 내부 코드를 표시하지 않는다. AI 성공 여부와 관계없이 본문·출처·확인일·최신성·문서 상태를 서버 데이터에 따라 표시한다. 미확인 날짜는 미확인으로 유지한다. 구조화된 서류·연락처·장소·단계는 값이 있을 때만 표시하며 원문에서 임의 추출하지 않는다.

## 4. Rate limit

서버 프로세스/모듈 인스턴스 전체에 60초 고정 구간당 30건, 동시 3건을 허용한다. 제한 초과 시 검색과 AI 전에 429 및 Retry-After를 반환한다. 사용자/IP 저장소나 외부 서비스/DB는 도입하지 않았으며 클라이언트 IP 헤더로 우회할 수 없다.

본문은 실제 UTF-8 수신량 4 KiB, 수신 시간 5초, 질문은 기존 300자로 제한한다. application/json만 받는다. 모든 JSON 응답은 no-store이다.

## 5. 테스트 결과

`npm test`: **51/51 통과** (서버 42, Chromium UI 9).

AI enabled 정상 생성, disabled, 실패/8초 timeout fallback, 빈 검색 무호출, 생성 답변 UI 표시, source metadata 보존, rate limit 및 재허용, 잘못된/과대/느린 요청, 키보드 Enter 제출, loading/error/empty/429, 이전 요청 취소, 15초 UI 제한, HTML 텍스트 처리와 미확인 상태 보존을 검증했다.

서버 OpenAI 네트워크는 mock이다. 생성·fallback UI 테스트는 실제 안전 조합 함수로 만든 응답을 브라우저에서 mock하며, disabled UI 테스트는 실제 로컬 API를 호출한다. 실제 OpenAI와 브라우저를 잇는 전체 흐름은 운영 키로 별도 검증해야 한다.

## 6. 정적 검사 및 빌드

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과 (Next.js 16.3.4, 정적 메인 페이지 및 동적 POST API)
- `git diff --check`: 통과

작업 셸에 npm 명령이 없어서 번들 Node와 `pnpm dlx npm@12.0.2`로 위 npm 스크립트를 실행했다.

## 7. 현재 데모 가능한 기능

등록된 성남시 공식 문서 4건에 대한 텍스트 검색, 원문 안내, 출처 링크, 확인일·문서 상태·최신성 표시, 빈 결과와 오류 안내. AI를 활성화하고 설정하면 제한형 표현 생성 응답을 동일한 UI에 표시한다. AI 비활성/실패 시에도 공식 원문 안내는 동작한다.

키보드 제출과 링크 이동, 포커스 표시, 짧은 live status 및 aria-busy를 유지했다. 실제 스크린리더 제품을 사용한 수동 검증은 수행하지 않았다.

## 8. 남은 위험 요소

- 실제 모델 접근 권한·출력 성공·8초 이내 완료 여부 미검증. 모델별 추론 토큰 사용량 때문에 512 출력 토큰 한도에서도 fallback할 수 있다.
- 로컬 문서 4건과 키워드 검색의 범위/관련성 한계. 최신성 미확인 자료는 표시되지만 자동 갱신하지 않는다.
- LLM은 안내 표현/문단 형식만 선택한다. 자유 재서술·축약은 지원하지 않는다.
- 모든 사용자가 같은 호출 제한을 공유한다. 재시작/개발 재로딩 시 초기화되고 다중 인스턴스에 걸쳐 공유되지 않는다. 고정 구간 경계의 순간 집중, 남용자의 정상 사용자 방해를 완전히 막지 않는다.
- 이미 시작된 외부 호출은 브라우저 취소로 비용이 취소되지 않는다. `store: false`는 OpenAI 서비스 전체의 무보존 보장이 아니다.

## 9. 다음 단계

서버 환경변수에 접근 가능한 모델과 키를 설정하고 명시적으로 활성화한 뒤 `npm run smoke:openai` 1회를 실행한다. 성공하면 브라우저에서 대표 질문을 확인하고 실제 latency/fallback 빈도를 평가한다. 그 다음 공식 자료의 최신성 확인과 검색 질문셋을 보강하고 공개 배포 시 배포 환경의 입구 제한 및 프로젝트 비용 통제를 검토한다.

STT/TTS, embedding, Vector DB, 인증, 대규모 리팩터링은 이번 작업에 포함하지 않았다.
