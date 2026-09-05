# 대회 데모 최종 검증 기록

검증일: 2026-09-05 (KST). 기존 미커밋 작업을 보존한 상태에서 감사 및 최소 수정했다. 이전 text/voice 검증 문서는 당시 기록이며 최신 결과는 이 문서를 기준으로 한다.

후속 업데이트: 이 감사 이후 실제 OpenAI smoke가 `gpt-5.6-terra`로 성공했다(1회, 2,806ms). 아래 E의 SKIPPED는 당시 기록이다. 현재 배포 준비 상태와 HTTPS 검증 계획은 [Vercel 배포 준비 기록](vercel-deployment-readiness.md)을 기준으로 한다.

## A. 현재 MVP 완성도

**코드 기준 제한된 대회 MVP는 제출 가능한 수준이다. 실제 AI·음성·배포를 포함한 현장 데모 승인은 수동 리허설 전까지 보류한다.**

공식 문서 4건의 텍스트 검색, 서버 원문 매핑, 제한된 AI 표현 선택, 실패 시 deterministic fallback, 출처·확인 상태 표시, 브라우저 STT/TTS 연결을 유지했다. 기능 추가·새 패키지·데이터 추가·대규모 리팩터링·디자인 개편은 하지 않았다.

소스·타입·스타일·설정·실행 스크립트·기존 테스트·문서를 감사했다. 저장소 AGENTS.md에 따라 설치된 Next.js 16.3.4의 Server and Client Components, Route Handlers, Environment Variables 가이드를 읽었다.

| 감사 항목 | 결론 / 검증 범위 |
| --- | --- |
| runtime / hydration | 손상된 API 응답 크래시 수정. 최종 production Chromium 페이지 오류 및 console error 0건 |
| client/server boundary | 브라우저 API는 effect/사용자 이벤트에서만 접근. 서버 제공자·제한기에 server-only 적용. 페이지 SSR과 정적 생성 통과 |
| 환경변수 / 키 | Next 환경변수 로더로 값의 존재 여부만 확인. NEXT_PUBLIC_ 사용 없음. 클라이언트 청크 10개에서 키 변수·제공자 URL·키 패턴 검사 0건 |
| Responses API | 서버 fetch POST, text.format JSON schema strict, 두 enum 필드, store:false, 출력 상한 512, 도구·재시도 없음 |
| response parsing | 응답과 assistant 메시지의 completed 상태, 메시지/텍스트 개수, 거절·JSON 형식·허용 코드 검사. 실패 시 원본 답변 |
| timeout / abort | 본문 수신 5초, AI 본문 포함 8초, 브라우저 15초. AI HTTP 오류의 미소비 본문도 abort로 정리 |
| rate limit | 인스턴스 내 60초 고정 구간 30건 / 동시 3건. 구간 갱신 시 진행 요청 수 유지, release 중복 안전, 오류 시 슬롯 해제 |
| STT | 표준/접두사 탐지, 보안 컨텍스트, ko-KR, 30초 제한, final만 세션 종료 후 1회 제출, 취소 후 오래된 콜백 무시 |
| TTS | 지원 여부·한국어 음성 확인, 원문 보존 분할·순차 읽기, 조각별 45초 제한, 중지/새 질문 취소. 이전 조각 콜백의 중복 실행 수정 |
| 요청 race / unmount | 즉시 ref 잠금으로 중복 제출 차단. 취소 시 이전 응답 무시. unmount 시 요청 ref 무효화·타이머 해제. STT/TTS 세션 dispose 확인 |
| 접근성 / UI | 키보드 조작·상태 알림·명확한 마이크/듣기/중지 유지. 출처 바로가기와 링크 밑줄. 모바일 입력칸 62px 복원 |
| 오류 정보 | 제공자 원시 오류·키를 화면에 표시하지 않음. 일반 오류·재시도 문구 사용. 응답 HTML은 텍스트로 표시 |

Unmount의 React effect 정리는 코드 감사 범위이며 실제 스크린리더와 실기기 음성 종료는 수동 확인 대상이다. 위 검사는 모든 브라우저·모든 운영 조건의 무오류 보장을 의미하지 않는다.

## B. 발견한 blocker

| 문제 | 영향 | 현재 상태 |
| --- | --- | --- |
| 성공 JSON을 타입 단언만으로 신뢰 | answer.sources 등이 없으면 React 렌더링 크래시, 텍스트 복구 불가 | 재현 테스트 실패 확인 후 수정 |
| 같은 이벤트 턴의 중복 제출 | API 2회 전송, AI 비용·제한 슬롯 낭비 가능 | 재현 테스트 실패 확인 후 수정 |
| 이전 TTS 조각의 중복 end/error | 다음 조각을 건너뛰거나 읽기가 중단됨 | 재현 테스트 실패 확인 후 수정 |
| 모바일 세로 flex 입력칸 | 기존 62px 높이가 줄어 터치·입력 가독성 저하 | production 화면에서 발견 후 수정 |
| 여러 문서의 대상 목록 합산 | 복지관의 일반 대상이 돌봄서비스 자격처럼 보일 수 있음 | 원문별 제목 강제·합산 목록 제거 |
| 실제 OpenAI 설정 없음 | 계정·모델 권한·응답 시간·실제 생성 확인 불가 | 미해결: 사용자 설정 필요 |
| 실제 음성·Vercel HTTPS 미검증 | 현장 권한/음성 서비스/한국어 발음/배포 실패 가능성 미확인 | 미해결: 행사 기기 리허설 필요 |

## C. 실제 수정한 문제

1. 네트워크 JSON을 unknown으로 받아 표시할 필수/선택 필드·배열·날짜·상태·HTTPS 링크를 검사한다. 손상된 응답은 일반 오류 안내 후 텍스트 재시도로 복구한다. 이것은 응답 구조 검증이며 공식 정보의 최신성을 새로 보증하는 기능은 아니다.
2. 진행 중 요청 ref로 같은 순간의 중복 제출을 막는다. 화면 해제 시 ref와 타이머를 정리해 늦은 finally/timeout이 상태를 갱신하지 않도록 했다.
3. TTS 세션뿐 아니라 현재 발화 조각의 동일성도 확인하고 완료한 조각의 핸들러를 해제한다. 이전 end/error가 다음 조각이나 그 시간 제한을 변경하지 못한다.
4. OpenAI 어댑터 finally에서 abort하여 HTTP 오류의 읽지 않은 본문을 정리한다. 기존 8초 제한·무재시도·fallback을 유지한다.
5. 다중 문서는 deterministic/AI 모두 원문 앞에 서버 문서명을 표시한다. LLM이 paragraphs를 선택해도 문서 경계를 없앨 수 없다. 서로 다른 서비스의 대상을 합친 eligibility 목록을 생성하지 않으며 각 원문 조건은 그대로 보존한다.
6. 출처 바로가기·링크 밑줄·출처 정보 글자 크기를 보정하고 모바일 입력칸 높이와 좁은 화면의 넘침을 수정했다. 마이크와 듣기 버튼의 기존 디자인은 유지했다.
7. smoke 질문을 대표 돌봄 질문으로 맞추고 실제 실행 시 소요 시간(ms)을 기록하도록 했다. 설정값을 임의로 넣지 않았다.

**데이터 안전성 결론:** LLM 응답은 introduction/layout의 허용 코드 두 개만 통과한다. 자유 문장, 전화번호, 서류, 대상, 장소, 신청 방법/단계, 지원 범위, 출처 URL, 확인일, 최신성 등을 출력에 추가하면 전체 거부한다. 답변 본문은 서버 문서의 전체 문자열과 순서를 보존하며 그 외 필드는 서버 매핑을 그대로 유지한다. 모델 출력을 answer에 병합하지 않는다. 모든 허용 코드 조합, 추가 필드 변조, 프롬프트 주입, 제공자의 입력 객체 변경, 상태 승격 시도를 테스트했다.

다만 저장된 공식 자료 자체의 오류·누락·시간 경과는 이 경계로 해결되지 않는다. 문서 3건의 최신성 unknown은 그대로 표시하며 이번 감사에서 확인일을 갱신하지 않았다. 키워드 검색은 대표 돌봄 질문에 복지관 문서도 함께 반환하므로 검색 관련성의 한계는 남는다.

## D. 변경 파일 목록

이번 감사에서 실제 편집한 17개 파일이다. 작업 시작 전부터 존재한 다른 변경은 이 목록에 포함하지 않았다.

| 파일 | 변경 |
| --- | --- |
| `src/components/question-panel/question-panel.tsx` | 응답 검증·중복 요청 차단·unmount 정리 |
| `src/components/question-panel/use-answer-speech.ts` | 현재 발화 식별·오래된 콜백 차단 |
| `src/components/question-panel/public-information-answer.tsx` | 출처 바로가기 |
| `src/components/question-panel/question-panel.module.css` | 링크·출처 가독성·모바일 높이/넘침 |
| `src/lib/search/read-search-answer.ts` | 신규: 클라이언트 렌더링 경계 검증 |
| `src/lib/search/read-search-answer.test.ts` | 신규: 정상·손상·위험 URL·선택 필드 검증 3건 |
| `src/lib/public-information/map-documents-to-answer.ts` | 다중 문서 제목 및 합산 대상 목록 방지 |
| `src/lib/ai/generate-public-information-answer.ts` | 다중 문서 경계를 서버에서 강제 |
| `src/lib/ai/generate-public-information-answer.test.ts` | 모든 허용 조합에서 문서 경계·원문 보존 기대값 보강 |
| `src/lib/ai/openai-answer-generator.ts` | HTTP 오류 포함 요청 종료 시 abort |
| `src/lib/ai/openai-answer-generator.test.ts` | 기존 HTTP 오류 3건에 abort 검증 추가 |
| `src/lib/search/search-public-information.test.ts` | 다중 문서 대상 혼합 방지 1건 |
| `tests/ui/question-panel.spec.ts` | 손상 응답·중복 제출·네트워크/본문 지연 복구·대표 질문/모바일 5건 |
| `tests/ui/voice-panel.spec.ts` | 이전 발화 콜백 회귀 1건 |
| `scripts/smoke-openai.ts` | 대표 질문·실행 소요 시간 기록 |
| `README.md` | 실제 환경변수 설정·1회 smoke·배포·복구 절차 |
| `docs/demo-readiness-validation.md` | 신규: 최종 보고서 및 리허설 표 |

## E. OpenAI smoke test 결과

**SKIPPED. 외부 OpenAI 호출 0회. 이번 작업에서 npm run smoke:openai를 실행하지 않았다.**

- 개발·운영 환경변수 로드 모두 `PUBLIC_INFORMATION_AI_ENABLED=true` 아님, 키 없음, 모델 없음으로 확인됐다. 작업 트리에는 `.env.example`만 존재했다.
- 키나 환경변수 값을 출력하지 않고 boolean 존재 여부만 확인했다. 설정 파일을 임의 값으로 생성하지 않았다.
- 실제 응답 시간: **N/A**. 모델 접근 권한·한국어 질문에 대한 실제 JSON 생성·512토큰/8초 내 완료 여부는 미검증이다.
- README의 절차대로 실제 서버 키와 접근 가능한 모델 ID를 설정한 뒤 `npm run smoke:openai`를 1회 실행하면 된다. 스크립트가 ms와 PASS/FAIL을 출력하며 재시도하지 않는다.
- 요청 형식은 [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)와 [Responses create 공식 참조](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create)에 대조했다. 형식 검토와 mock 성공은 계정/모델의 실제 성공 증거와 구분한다.

## F. 음성 기능 실환경 검증 가능 여부

자동 Chromium 환경에서는 보안 컨텍스트 true, 인식 생성자 존재, SpeechSynthesis 존재, 한국어 음성 1개가 탐지됐다. 이는 지원 탐지 결과이며 실제 마이크 인식·음성 재생 성공을 의미하지 않는다.

STT/TTS 오류·취소·시간 제한·중복 방지·원문 전체 낭독 순서는 mock 브라우저 API로 검증했다. 실제 한국어 음성을 입력하지 않았고 스피커 출력도 청취하지 않았다. 실제 브라우저 권한 UI, 한국어 인식률, 숫자/전화번호 발음, 스크린리더 겹침은 사람이 확인해야 한다.

## G. 최종 테스트 개수와 결과

**npm test: 82/82 PASS = 서버 46 + Chromium UI 36.**

- 시작 시 기존 72/72를 먼저 확인했다.
- 기존 테스트 72개를 유지하고 필요한 기대값/검증을 보강했다. 신규 10개를 추가했다.
- 크래시·중복 요청·TTS 중복 콜백 테스트 3개는 수정 전 실패, 수정 후 통과를 확인했다.
- 최종 서버 테스트 실패/skip 0, UI 실패/skip 0. 전체 UI 약 20.2초.
- 자동 테스트는 실제 OpenAI를 호출하지 않는다. 실제 로컬 검색 API를 사용하는 UI 테스트와 네트워크/mock 음성 테스트가 함께 포함된다.

## H. lint/typecheck/build 결과

| 명령 | 최종 결과 |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, Next.js 16.3.4 / 정적 메인 페이지 / 동적 POST API |
| `git diff --check` | PASS |

작업 셸에서 npm 실행 파일이 직접 제공되지 않아 번들 Node와 `pnpm dlx npm@12.0.2`로 동일한 npm 스크립트를 실행했다. 패키지 의존성은 변경하지 않았다.

추가로 최종 build를 `next start`로 직접 실행해 확인했다. 대표 돌봄 질문의 로컬 버튼 클릭→본문 표시 약 **101ms**(1회, AI 비활성), 브라우저 오류 0건. 데스크톱 1440px와 모바일 390/320px 화면을 캡처해 검토했고 모바일 입력칸은 모두 높이 62px, 화면 안에 표시됐다. 출처 바로가기·출처 URL·다중 문서 경계도 확인했다. 이전 production 점검에서 빈 검색을 확인했다. 이 수치는 OpenAI 지연이나 Vercel 성능 수치가 아니다.

## I. 대회 데모에서 가능한 시나리오

| 시나리오 | 현재 검증 | 현장 사용 조건 / 복구 |
| --- | --- | --- |
| A. 대표 돌봄 질문 텍스트 입력 | 실제 로컬 production API·본문·출처 PASS | AI 설정이 없어도 가능 |
| B. 마이크→한국어 질문→STT→자동 검색 | mock 표준/접두사 API PASS | 행사 기기에서 권한·인식 서비스 검증 후 사용. 실패하면 입력란 사용 |
| C. 답변→출처→듣기→중지 | 출처 production PASS, TTS mock PASS | 한국어 음성 설치 및 실제 재생 리허설 필요 |
| D. 마이크 권한 거부→텍스트 복구 | mock 권한 오류→실제 로컬 API PASS | 실제 사이트 권한 거부로 한 번 더 확인 |
| E. OpenAI 오류→deterministic fallback | 서버 어댑터/Route Handler 및 UI mock PASS | 실제 OpenAI 실패는 미검증. AI 비활성은 skipped이며 provider_error fallback과 다름 |

SpeechRecognition/SpeechSynthesis 미지원, STT 무음·권한·마이크·서비스 오류·30초 제한, TTS 오류·45초 제한, AI 오류·8초 제한, 검색 없음, 429, 네트워크 오류, 브라우저 15초 제한 모두 화면을 유지하고 텍스트 질문을 다시 할 수 있는 경로를 검증했다. 네트워크 복구나 rate-limit 대기 시간 종료가 필요한 경우 즉시 성공을 보장하지 않는다.

실패 경로를 안전하게 재현하려면 `npm run test:ui -- --grep "AI 실패"` 또는 기존 오류 회귀 테스트를 사용한다. 실제 운영 키를 잘못된 값으로 바꾸거나 새로운 실패 유도 API를 추가하지 않는다.

## J. 아직 사람이 직접 확인해야 하는 항목

행사 기기와 실제 HTTPS 주소를 사용해 아래 순서로 기록한다.

| 항목 | 통과 기준 | 실측 결과 |
| --- | --- | --- |
| OpenAI 1회 smoke | PASS, ms 기록, 실제 사용 모델 접근 가능 | 미실행 |
| Vercel HTTPS | 메인 페이지·POST API·출처 링크 열림. Preview/Production 서버 환경변수 적용 | 미실행 |
| A 텍스트 | 대표 질문의 돌봄 문서·신청 안내·출처·확인일 표시 | 행사 기기 미실행 |
| B 마이크 허용 | 마이크 클릭→권한 허용→대표 질문 발화→인식문 확인→자동 검색 1회 | 미실행 |
| 한국어 STT | 대표 질문을 동일 조건에서 3회 말하고 원문/인식문/검색 적중 기록. 오인식은 텍스트 수정 가능 | 미실행 |
| C 한국어 TTS | 답변 듣기→각 문서 순서·전화번호 발음 청취→중지→다시 듣기 | 미실행 |
| 새 질문 | 읽는 중 텍스트 수정·마이크·예시 선택 시 이전 읽기 중지 | 실기기 미실행 |
| D 권한 거부 | 사이트 마이크 권한을 거부 후 마이크 클릭→안내→같은 질문 텍스트 제출 성공 | 미실행 |
| 네트워크 복구 | 연결 실패 안내→연결 복구→같은 텍스트 다시 제출 성공 | 현장 네트워크 미실행 |
| 접근성 | 키보드 Tab/Enter/Space, 확대 화면, 실제 스크린리더 상태·음성 겹침 확인 | 스크린리더 미실행 |
| 자료 최신성 | 기존 공식 링크 4건의 대상·방법·연락처 변경 여부 확인. 확인한 항목만 날짜/상태 갱신 | 이번 감사에서 원문 재검증 안 함 |

행사 직전에는 localhost 텍스트 데모도 준비한다. 인터넷이 없어도 로컬 서버의 등록 자료 검색은 가능하지만 원문 외부 링크·OpenAI·브라우저 인식 서비스는 연결에 의존한다. 한국어 TTS의 오프라인 동작은 선택된 음성에 따라 별도로 확인해야 한다.

## K. 지금 당장 제출해도 되는 상태인지 평가

**소스 코드·문서·제한된 텍스트 MVP 제출: 가능. 실제 AI·음성까지 안정적으로 작동한다고 설명하는 현장 데모: 리허설 전에는 승인 보류.**

감사에서 재현한 코드 blocker는 수정됐으며 최종 검사도 통과했다. 제출에는 기존 미추적 파일까지 포함해야 한다. 커밋·push·배포는 이번 작업에서 실행하지 않았다. 실환경 검증 공백을 숨기거나 mock 테스트를 실제 OpenAI/마이크 성공으로 표현하지 않아야 한다.

인스턴스별 제한은 Vercel 전역 제한이 아니다. 4개 문서와 키워드 검색의 범위, 일부 최신성 미확인, 자유 재서술 대신 제한된 표현 선택이라는 제품 범위를 유지해 설명한다.

## L. 다음 작업 우선순위 TOP 5

1. 실제 키·모델 설정 후 OpenAI smoke 1회 실행, PASS와 응답 시간 기록.
2. 실제 Vercel HTTPS 환경에서 A 텍스트 시나리오와 서버 환경변수 적용 확인.
3. 행사 기기에서 B/C/D, 한국어 인식·전화번호 발음·듣기 중지·권한 거부 복구 리허설.
4. 기존 4개 공식 출처의 내용/최신성 재확인과 발표용 대표 질문·텍스트 대체 흐름 확정.
5. 제출 파일을 고정하고 전체 A~E 리허설 결과를 기록한 뒤 변경을 멈추기. 행사 네트워크 실패 시 localhost 텍스트 데모 준비.
