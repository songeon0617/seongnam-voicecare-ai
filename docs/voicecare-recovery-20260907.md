# VoiceCare 회귀 복구 검증 보고 — 출시 보류

기존 E2E는 **기대값 변경 없이 61/61로 복구**했다. 무료 검증을 모두 통과했지만, 공식검색은 과거 provider 응답 재생 기준 **17/20 답변 완수**이며 3건이 미완수다. 실제 API 재평가는 실행하지 않았다. 주요 P1이 남아 있으므로 이번 작업을 개발 완료나 배포 후보로 판정하지 않는다.

## 1. 시작 HEAD 및 working tree 보존

- 시작 HEAD: `8f5436dc5582549b0b807e57a964b282169ef50a`.
- 시작 브랜치: `codex/voicecare-official-search`. 기존 P0/P1 관련 tracked 변경 13개 및 untracked 코드·평가 기록이 있었다.
- 별도 로컬 브랜치 `codex/voicecare-regression-recovery`를 만들고, 시작 시점의 로컬 변경 전체를 **`b39df0f`**에 checkpoint했다. checkpoint 직후 working tree는 clean이었다.
- 이번 복구 변경은 해당 feature 브랜치의 미커밋 변경으로 남아 있다. main 덮어쓰기, push, Production 배포는 하지 않았다.
- 아래 결과는 checkpoint 이후 수정 기준이다. 원 평가 디렉터리 `voicecare-evaluation/release-20260907`는 보존하고 새 결과를 `recovery-20260907`에 분리했다.

## 2. 기존 E2E 실패 37건 전수표

[37건 전수표](voicecare-evaluation/recovery-20260907/regression-audit.md), [기계 판독용 JSON](voicecare-evaluation/recovery-20260907/regression-audit.json).

각 행에 질문, 기대 route/service, 작업 시작 시 route/kind/service/source, 실패 코드 경로, 확장 코드가 영향을 준 지점을 기록했다. 누락된 routing 필드를 임의의 route로 추정하지 않았다. checkpoint의 확장 handler를 직접 재생해 분석했다. 수정 후 각 질문의 실제 HTTP 응답과 기대값 비교는 [61건 결과](voicecare-evaluation/recovery-20260907/legacy-e2e-summary.json)에 있다.

## 3. 원인별 개수

배타적 1차 원인 분류다. 각 행의 부수 원인은 전수표에 남겼다.

| 원인 | 건수 |
|---|---:|
| 기존 structured path가 web search로 넘어감 | 21 |
| keyword confidence 변화 | 2 |
| CLARIFY 변화 | 5 |
| region guard 변화 | 4 |
| scope guard 변화 | 1 |
| fallback 변화 | 2 |
| timeout/provider | 0 |
| context/follow-up 변화 | 2 |
| 기타 | 0 |
| 합계 | **37** |

keyword 2건은 keyword 점수 함수 자체의 임계값 변경을 뜻하지 않는다. 확장 코드의 명칭·최신성 판단이 기존 후보를 탈락시킨 변화다. 구어체 상당수는 기존 함수도 AI OFF에서 해석하지 못했지만, 확장 handler가 기존 의도 해석 경로를 호출하지 않은 지점이 확인됐다. 이를 단순히 “AI가 달라졌다”로 묶지 않았다. CLARIFY 5건 중 2건과 region 4건에는 응답 metadata 누락도 포함된다.

## 4. 구조화 경로와 확장검색 경계

`structured-boundary.ts`에서 기존 13개 서비스의 명칭·목적 조합, 후보 간 모호성, 위치 제한 및 후속 질문을 결정한다. 질문 전체 문자열과 테스트 ID를 매칭하지 않는다.

안전/지역 guard → 기존 서비스 DIRECT → 기존 후보 CLARIFY → 기존 범위 밖 공공·생활 질문 → 공식검색 → 충분한 원문 근거 답변 또는 fallback 순서를 적용했다. 구조화 경로가 결과를 만들면 검색 provider에 도달하지 않는다. 기존 61건 모두 검색 provider 미호출을 별도로 검증했다.

`특별교통수단 알려줘`는 DIRECT, `장애인 이동 지원 뭐 있어?`는 기존 후보 CLARIFY로 유지한다. 여권·대형폐기물 등은 독립된 검색 출구를 사용한다. 무료 텍스트 follow-up으로 외부 지역 guard를 우회하거나 다른 서비스의 문맥이 유입되는 문제도 수정했다.

현행 URL은 실제 검색 결과 또는 공식 페이지에 게시된 링크만 따라 복구한다. 성남시청의 기관 링크로 확인한 도서관·일자리센터·청년지원센터·도시개발공사·문화재단 호스트를 개별 등록했다. 임의 서브도메인 wildcard는 허용하지 않는다. 제목·상위 메뉴·질문에서 요청한 구체적 내용, publisher, 최종 HTTPS, DNS/IP와 redirect를 확인한다. 실제 검증한 중간 인증서만 추가했으며 TLS 검증을 끄지 않았다.

여권 준비물에서 서류 생략 안내만 반환하거나, 청년 모임 공간에 공공데이터 정책표를 반환하거나, 공연 예매 질문에 공연장 이름만 반환하는 것을 막았다. 근거는 검증된 원문 section, 최종 URL, publisher, checkedAt에 연결한다. 현행 canonical이 같은 결과는 중복 제거한다.

## 5. Stage 1 실패 14건 전수표

[14건 전수표](voicecare-evaluation/recovery-20260907/stage1-failure-audit.md), [기계 판독용 JSON](voicecare-evaluation/recovery-20260907/stage1-failure-audit.json).

기준은 원 실제 평가의 6/20이다. 각 행에서 공식 자료 존재, 검색 결과 수, URL 확보, fetch, 관련성/grounding, 긴 문서, API 및 예산 차단을 구분했다. 각 질문의 최초 Stage 1 provider 기록을 재생하며, 뒤의 추가 probe 결과로 원 평가를 대체하지 않았다.

## 6. 공식 자료 존재와 긴 문서

기존 실패 14건 중 **11건은 현행 공식 본문으로 답변을 복구**했다. 추가 1건인 음식물쓰레기는 현행 공식 자료가 존재하지만 수집 결함이 남았다. 전입신고는 과거 공식 자료 존재를 확인했으나 현행 본문 확보가 미완료다. 판교역→시청은 일반 교통 안내는 존재하지만 정확한 전체 이동 경로의 공식 근거 존재 여부는 미확인이다. **자료가 없다고 확정한 질문은 0건**이다.

- [음식물 배출 안내](https://recycle.seongnam.go.kr/platforminfo/trash): 원문 HTTP 200이지만 초기 HTML은 2,056자로 비어 있는 React root다. 페이지가 직접 참조한 약 2.48MB 공개 JavaScript 번들에 안내 문장이 존재함도 확인했다. 실행 화면의 문서 구조를 보존해 추출하는 처리는 미구현이다. 번들의 다른 화면 문자열을 근거에 섞어 성공으로 계산하지 않았다.
- [과거 성남시 전입 안내](https://www.seongnam.go.kr/city/1000094/10063/contents.do): 검색 캐시는 존재하나 실제 HTTPS GET은 404. 공식 포털 메뉴와 공식 통합검색까지 확인했지만 적합한 현행 canonical을 확보하지 못했다. 현재 다른 주거지원 페이지를 대체 근거로 쓰지 않았다.
- [시청 오시는 길](https://www.seongnam.go.kr/cn040503): 일반 안내를 판교역 출발의 전체 경로 답변으로 계산하지 않았다.

6,000자 초과로 관측된 083의 조직도 24,545자와 130의 관광 홈 8,210자는 해당 질문에 답하는 적격 문서가 아니었다. 따라서 길이 제한이 직접 원인이라고 단정하지 않는다. 실제 130 행사 본문은 1,287자였다. 제목별 완결 section·표·조건을 보존하고 각 6,000자 이하로 처리한다. 여권의 공통 서류·예외 구간은 한도 안에서 함께 연결했다. 쪼갤 수 없는 긴 구간은 계속 제외하며 모든 긴 문서 문제를 해결했다고 주장하지 않는다. 문서 전체를 모델로 보내지 않는다.

## 7. 수정 파일

런타임:

- `src/lib/search/structured-boundary.ts` (신규), `expanded-public-information.ts`, `create-public-information-response-with-answer.ts`: 구조화 경계·guard·문맥 복구.
- `extract-official-document.ts`, `official-navigation.ts`, `official-source-policy.ts`, `openai-official-search.ts`, `read-search-answer.ts`: 기관 확인·현행 링크 복구·완결 근거 검증.
- `fetch-official-source.ts`, `official-source-ca.ts`, `official-institution-ca.ts` (신규): HTTPS 원문 수집과 검증된 기관 인증서.
- `request-search-budget.ts` (신규), `shared-search-budget.ts`, `src/types/official-search.ts`: 요청 한도·실제 호출 경로의 공유 예산·진단.

테스트/검증:

- `structured-boundary.test.ts`, `official-search-recovery.test.ts`, `search-budget-integration.test.ts` (신규).
- `tests/ui/question-panel.spec.ts`: 응답이 준비되기 전에 접힌 상세 영역을 조회하던 경합을 기다림 한 줄로 수정. 검증 기대 내용은 유지.
- `scripts/check-voicecare-legacy-release.mjs`: 결과 디렉터리 override만 추가. **원 61개 평가기 `scripts/evaluate-public-information-e2e.ts`는 변경하지 않았다.**
- 신규 scripts: `audit-voicecare-regressions.ts`, `capture-voicecare-sources.ts`, `inspect-voicecare-html.mjs`, `inspect-voicecare-sources.mjs`, `replay-voicecare-recovery.ts`, `verify-voicecare-recovery.mjs`, `report-voicecare-recovery.mjs`.
- 신규 전수표·원문 fixture·검증 로그: `docs/voicecare-evaluation/recovery-20260907/`. UI 검증으로 `docs/voicecare-visual/recovery-text200-320.png` 갱신.

새 서비스 카테고리, UI 재설계, AI 기능, RAG/Vector DB 및 새 dependency는 추가하지 않았다.

## 8–12. 무료 검증 결과

[실행 순서/종료 코드](voicecare-evaluation/recovery-20260907/verification.json). 모든 단계는 fail-fast 순서 실행이며 실제 OpenAI 키를 비우고 유료 호출을 차단했다.

| 순서 | 검증 | 결과 |
|---|---|---|
| 1 / 항목 8 | Server 전체 | **266/266 PASS** |
| 2 / 항목 9 | UI 전체 | **53/53 PASS** |
| 3 / 항목 10 | lint | PASS |
| 4 / 항목 10 | typecheck | PASS |
| 5 / 항목 10 | build | PASS |
| 6 / 항목 11 | 기존 61 E2E | **61/61 PASS**, HTTP 오류 0 |
| 7 / 항목 12 | official-search fixture 및 예산 통합 | **27/27 PASS** |
| 8 / 항목 12 | 과거 Stage 1 전체 20건 offline replay | fixture 누락 0, schema 20/20; **답변 완수 17/20** |

기존 E2E는 production build 후 `next start`에 실제 HTTP 요청했다. AI/search를 OFF로 두고 기존 질문·context·route/service 기대값을 그대로 사용했다. 기존 rate limiter를 우회 수정하지 않고 세 개의 새 서버 배치로 검증했다. 따라서 배포 코드와 동일한 빌드·HTTP 경로의 무료 검증이며 실제 AI/provider의 실시간 품질 검증은 아니다.

fixture는 저장된 provider 응답과 실제 공식 HTML을 현재 추출기로 다시 처리한다. 미완수 3건의 안전 종료 테스트가 PASS인 것을 답변 완수로 더하지 않았다. 이후 최종 코드로 **provider/Redis만 mock, 원문은 실제 HTTPS** 재생도 실행했고 역시 17/20이었다. [오프라인 원시 결과](voicecare-evaluation/recovery-20260907/stage1-offline.json), [현재 HTTPS 재생 결과](voicecare-evaluation/recovery-20260907/stage1-live-https.json), [집계](voicecare-evaluation/recovery-20260907/summary.json).

| 항목 | Offline / 현재 HTTPS 재생 각각 |
|---|---:|
| structured answer success | 2 |
| grounded web answer success | 15 |
| valid clarification | 0 |
| correct unsupported | 0 |
| safe fallback / 근거 부족 링크 안내 | 3 |
| provider failure | 0 (저장된 provider 재생) |
| official evidence exists but no answer | 2 (fallback의 부분집합) |
| 정확한 전체 경로 근거 존재 미확인 | 1 (fallback의 부분집합) |
| wrong answer | 0 (이번 20건 원문·필수 사실 검토 범위) |
| wrong source | 0 (이번 20건 검토 범위) |
| 실제 답변 완수 | **17/20** |

이 표는 **새 실제 API Stage 1 성적표가 아니다**. 기존 실제 API 성적 6/20을 17/20으로 덮어쓰지 않았다.

## 13. 남은 P0/P1과 비용 한도

확인된 P0는 0. 남은 P1은 최소 다음 3개다.

| P1 | 상태 / 다음 검증에 필요한 것 |
|---|---|
| 전입신고의 현행 canonical 본문 미확보 | 공식 현행 본문을 확보하고 현재 수집 경로로 답변 근거를 재현해야 함 |
| 음식물쓰레기 JavaScript 본문 수집 불가 | 해당 화면의 문단·표·조건을 보존하는 제한된 수집 및 실제 원문 검증 필요 |
| 공유 예산의 실제 Redis 연결 검증 미완료 | 로컬 Redis URL/token 미설정. 실제 저장소 연결·동시 인스턴스 동작 확인 필요 |

판교역→시청은 별도의 미해결 coverage 항목이다. 공식 자료 부재로 단정하지 않는다.

코드에서는 기본 provider의 reserve → 검색/원문 → release가 같은 경로로 연결된다. mock 통합으로 공유 저장소 불능 시 API 미호출, 두 인스턴스의 원자적 승인, timeout과 안전 종료를 확인했다. 실제 서비스 자격 증명이 없어 실저장소 검증까지 완료한 것은 아니다.

- 요청 하나의 한도: **25초, AI 1회, 검색 1회, 원문 HTTPS 최대 16회**. 실제 원문 redirect도 같은 한도를 소비한다. 문서별 socket timeout은 5초, 예산 저장소 IO/release는 2초로 제한한다.
- 공유 한도: 기존 최대 20회/일, 설정 금액과 $3 중 낮은 값, 요청당 $0.15 예약, 동시 활성 1개를 유지했다. 과거 평가 ledger를 초기화하거나 허용 유료 예산을 확대하지 않았다.
- 정상 질문을 대부분 차단하지 않도록 원문 16회 안에서 필요한 기관·메뉴 탐색을 허용했으나, 실사용 가능 판정은 남은 실패와 실저장소 검증 때문에 보류한다.

## 14–15. 실제 API 재평가 및 비용

**재평가 미실행. 이번 작업의 유료 API 호출 0회, 추가 유료 API 비용 $0.** 원문 HTTPS 확인과 저장된 응답 재생은 유료 API 평가가 아니다.

기존 ledger는 20회의 유료 시도를 기록하고 있어 임의 초기화·추가 호출을 하지 않았다. 무료 검증은 통과했지만 P1이 남고 기존 허용 호출 예산도 소진되어 재평가를 실행하지 않았다. 향후 실행 전에는 실제 남은 승인 범위와 예상 호출 수·비용을 다시 제시해야 한다.

## 16. Production 및 최종 판정

**push 없음, Production 배포 없음. 출시 보류 유지.**

| 판정 | 결과 |
|---|---|
| 기존 E2E 61/61 복구 | **YES** |
| 기존 13개 회귀 없음 | **YES** — 기존 61건 및 추가 경계 테스트 범위 |
| 공식검색 대표 질문 실사용 가능 | **NO** — 미완수 3건 및 실제 API 재평가 미실행 |
| P0 남음 | **NO** — 확인된 P0 기준 |
| P1 남음 | **YES** |
| Production 배포 가능 | **NO** |
| 개발 종료 가능 | **NO** |

이번 결과는 기존 경로 복구와 공식검색 11건의 추가 완수를 검증한 상태다. safe fallback 3건을 성공으로 계산하거나, 남은 P1을 해결한 것으로 처리하지 않는다.
