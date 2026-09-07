# 공식검색 확장본 최종 검증 — 2026-09-07

## 판정 및 검증 범위

**CONDITIONAL — 검증된 서비스의 대회 시연·제출은 조건부 가능. 전 분야 질문의 완전한 답변을 보장하는 상태는 아니다.** 기존 `bc86f88d869723e3f173b37850570b711ce31314` 기본 버전의 검수 완료와 이번 확장본 검수는 별개다. 아래 결과는 이번 작업에서 실행한 검사다. 최신 확장본을 Production에 배포했고 Redis 실연결·실제 공식검색·기본 회귀를 검증했다. 초기 Redis 설정 blocker는 해결됐다.

증거 폴더: [final-expanded-20260907](voicecare-evaluation/final-expanded-20260907/). 실행 로그·JSON·원문·화면을 함께 보관한다. 테스트 실패를 삭제하거나 기존 61개 기대값을 변경하여 통과시키지 않았다.

## Git 및 변경 전/후

| 항목 | 검증 시작 상태 |
| --- | --- |
| 현재 체크아웃 | `codex/voicecare-regression-recovery` |
| 검증 시작 HEAD | `b39df0f1dc242a8734534168af012fd8e7ea2561` |
| 로컬 main | `ec472bbe20cc89af536bc63957662f47cb79cc88` |
| fetch 후 origin/main | `bc86f88d869723e3f173b37850570b711ce31314` |
| 기존 Production | Vercel UI에서 위 bc86f88 확인 |
| working tree | dirty: 이전 확장본 복구 작업 포함. 관련 변경을 보존하고 함께 검증 |

bc86 이후 ec472에서 모바일·접근성 UI, 8f5436d에서 공식검색·검증·운영 방어, b39 및 미커밋 작업에서 원문 수집·검색 복구가 추가됐다. 이번 작업에서는 실제 공식 원문/실제 모델 응답에서 드러난 오류, 데이터 누락, 복수 서비스 라우팅, WebKit 제출 문제를 수정했다.

검증한 런타임 파일 목록과 SHA256은 [semantic-review.json](voicecare-evaluation/final-expanded-20260907/semantic-review.json)에 있다. 최초 검색/UI 수정 런타임 지문은 `f79f476061068c61e7f4f9dc228dd479efbc31c75588462f61d2a385e1d5d32f`, 비밀 없는 Redis 진단 추가 후 최종 런타임 지문은 `69f2f14f289d75efec6f69f1b4edcb1bb036b83fe347d5e34f1892180d9379fb`이다. 검색 의미 검증은 최초 수정 런타임에서 수행했고 후속 진단은 검색 의미를 변경하지 않았다. 최종 문서 커밋과 실제 런타임 검증 커밋을 구분한다.

## 공식 데이터 전수 검증

**등록 문서 13개, 고유 공식 출처 URL 25개(대표 13 + 보조 12), source ID 1개 `seongnam-city`.** 동적 검색의 허용 호스트 11개는 등록 문서 수와 별개다.

| 분야 | 문서 수 |
| --- | ---: |
| mobility_support | 3 |
| senior_welfare | 3 |
| welfare_facility | 1 |
| disability_welfare | 3 |
| welfare_support | 2 |
| administrative_service | 1 |

[13개 서비스별 전수 검수표](voicecare-evaluation/final-expanded-20260907/source-review.md)에 서비스명·분야·대상·신청방법·필요서류·장소·운영시간·연락처·URL·source ID·최신성·상태를 모두 기록했다. [수정 전 및 직접 수집 원문](voicecare-evaluation/final-expanded-20260907/source-audit.json), [수정 후 전체 목록](voicecare-evaluation/final-expanded-20260907/verified-inventory.json)을 대조했다.

25개 모두 TLS 검증을 유지한 실제 HTTPS GET에서 **HTTP 200, 리다이렉트 0, broken 0**. 이번 등록 출처 URL 수정은 **0건**이다. 과거 감사의 URL 수정 수를 이번 실적으로 합산하지 않았다. 게시·수정일 없는 12개는 `unknown` 유지, 날짜가 원문에 있는 복지관 1개만 `current`. 대조일은 최신 정책의 시행일이 아니다. 원문 미명시 항목을 추론하지 않았다.

실질 데이터 수정 6개(전체 13개 대조 시각 갱신은 별도):

1. 어르신 버스요금 지원: 분기 57,500원·연 230,000원, 공항/시외 제외, 환급 시기와 신청·구비 항목을 원문대로 보완.
2. 장애인 보조기구·보장구: 두 세부사업의 소득/등록/보험 조건을 대상 메타데이터에서 분리.
3. 발달장애인 지원: 발달재활 대상 아동과 장애 부모의 비장애 자녀 언어발달 지원 등 서로 다른 대상을 구분.
4. 장애인 의료비 등 지원: 저소득 지역가입자 중 한부모·만성질환 가구 등을 포함하고 세부사업 조건을 구분.
5. 방문건강관리: 원문에 있는 보건소 대표 담당 번호 수정 031-729-3778, 중원 031-750-1413, 분당 031-729-3669 추가.
6. 긴급복지: 갑작스러운 위기·소득/재산 기준·단기 지원 조건 명확화. 확인되지 않은 현재 기준금액 생성 금지.

원문 자체의 충돌은 임의로 해소하지 않았다: 보장구 담당 번호 본문/하단 2885/2884, 무인발급기 서현청소년수련관 운영시간 표 간 불일치 등은 담당 확인이 필요하며 특정 값을 확정하지 않는다.

## 검색·라우팅 및 실제 모델 검증

새로운 수동 기대값 77개는 13개 서비스의 직접명/문장 변형, 짧은 말, 오타, 반말·존댓말, 장애·노인·교통·건강·민원, 지역 누락/타지역, 복수 서비스, 무의미 입력, 범위 밖, 후속 문맥을 포함한다.

| 77개 고정 평가 | 수정 전 | 수정 후 |
| --- | ---: | ---: |
| 전체 기대값 일치 | 66/77 | 77/77 |
| wrong_service | 1 | 0 |
| wrong_clarification | 1 | 0 |
| 등록되지 않은 현재 세부정보를 정적 답변으로 처리 | 2 | 0 |
| 응답 스키마 | 77/77 | 77/77 |

wrong_service는 잘못된 서비스 선택/실제 복수인데 하나로 축소, wrong_clarification은 불필요하거나 잘못된 구분축이다. 같은 서비스에서 미등록 최신 세부정보를 답한 오류는 별도 지표로 분리했다. 수정 전 지표 계산만 저장된 원 응답에 이 정의를 적용했으며 응답을 재생성하지 않았다. 나머지 수정 전 실패는 모호/비정형 질문 처리였다.

복수 명시 서비스 전체를 보존하고 실제 차량/요금 축에서만 되묻는다. 내용이 없는 ‘도움’ 등은 service_required, 지역 확인이 필요한 질문은 region_required, 명확한 등록 서비스는 DIRECT. 현재 일정·분실·재발급 등 등록 근거를 벗어난 세부 질문은 정적 shortcut으로 답하지 않는다.

기존 동결 61개 실제 HTTP 회귀 **61/61**. 별도 240개 offline 진단은 스키마 240/240·wrong_service 검출 0이지만, 웹검색을 끈 상태의 기대 outcome은 **30/240**, 210개 불일치다. 이 진단을 240개 검색 품질 통과로 주장하지 않는다.

실제 OpenAI는 로컬 총 **20회**: 최초 20문항 중 정적 2개를 제외한 18회 + 수정 후 새 응답 2회. 공유하지 않는 로컬 ledger를 초기화하지 않았다. 최초 샘플에서 버스 질문→채용박람회 교통편, 신규 도서관 가입→2020년 임시 가입, 공연→진로특강의 **잘못된 근거 3개**를 발견하여 주제/행사/임시정책 필터와 공식 상세페이지 탐색을 수정했다.

| 실제 응답 20문항 검토 | 최초 실제 호출 | 수정 후 동일 provider 응답 재생 + 현재 HTTPS |
| --- | ---: | ---: |
| 스키마 유효 | 20/20 | 20/20 |
| 답변/부분답변 형태 | 16/20 | 15/20 |
| 질문 핵심 완수(수동 원문 대조) | 12/20 | 14/20 |
| 잘못된 근거 | 3 | 0 |

**수정 후 20개는 새 OpenAI 호출이 아니다.** 별도 신규 2개는 버스 질문 안전 fallback 1개, 올바른 회원가입 원문 부분답변 1개이며 두 응답 모두 스키마 유효다. 따라서 완전한 실시간 전 분야 성공률로 일반화할 수 없다. 자세한 질문·근거·판정은 semantic-review.json에 보존했다.

## 안전성과 서버/API

원문에서 검증한 텍스트만 답변으로 구성한다. 모델이 만든 연락처·서류·장소·대상 조건을 그대로 노출하지 않는다. unknown을 최신으로 바꾸지 않는다. 주제와 무관한 공식 페이지도 답변 근거에서 제외한다. 원문 없는 경우 official_links/search_unavailable 등 명시적 fallback을 사용한다.

서버 unit/integration **283/283**: 입력 오류, AI timeout/API failure/잘못된 JSON/검색 없음/내부 오류, 공식 출처 보존, 스키마, 안전 경계, SSRF/TLS/redirect, 예산과 동시성, 후속 clarification 등을 실제 실행했다. 최초 282개 통과 후 Redis 진단의 비밀 비노출·로그 제한 검증 1개를 추가하고 전체 재실행했다. 실패 상황은 의존성 주입으로 재현하며 Production에 장애 유발용 debug endpoint를 만들지 않았다.

별도 로컬 실제 HTTP **11/11**: 빈 질문 400, 601자 413, malformed JSON 400, 필수 필드 없음 400, 잘못된 타입 400, body 4KB 초과 413, 잘못된 context 400, 정상/복수/모호/범위 밖 200. 정상 응답의 공식 URL 보존과 모든 응답의 no-store 확인.

## 품질 게이트 및 UI

| 실행 | 결과 |
| --- | --- |
| lint | exit 0 |
| typecheck | exit 0 |
| build | exit 0 |
| 전체 서버 unit/integration | 283 pass, 0 fail |
| 기존 Playwright UI | 53 pass, 0 fail |
| 로컬 Chromium/Firefox/WebKit | 15 pass, 0 fail |
| 기존 실제 HTTP 61문항 | 61 pass, 0 fail |
| 새 라우팅 77문항 | 77 pass, 0 fail |
| 별도 로컬 API HTTP | 11 pass, 0 fail |

[실행 순서·exit code](voicecare-evaluation/final-expanded-20260907/verification.json), 개별 로그·JSON은 동일 폴더에 있다. WebKit에서 초기 hydration/자동입력 후 질문이 빈 값으로 제출되는 문제를 재현(초기 13/15)하고 FormData의 실제 입력값으로 수정한 뒤 세 브라우저 15/15로 재실행했다.

텍스트 질문, 로딩, 오류, 빈 결과, clarification 선택, 다시 질문, 출처 새 창의 실제 페이지, 키보드/focus, label·ARIA, 320/390/1440 viewport 및 200% 글씨를 확인했다. 화면 캡처를 육안 대조했다. STT/TTS는 브라우저 API mock 기반 정상/권한거부/미지원/오류 상태 검증이다. **실제 마이크 인식률·스피커 청취·NVDA/VoiceOver 실사용은 미검증**이며 자동검사로 대체했다고 쓰지 않는다.

## 보안·운영

초기 모든 로컬 ref의 13개 커밋·923개 Git object, 후속 커밋 후 15개 커밋·1,141개 object 및 비무시 작업 파일 693개, 빌드된 클라이언트 static 13개에서 고신뢰 비밀 패턴 및 로컬 실제 credential 일치 검사: **탐지 0**. .env.local ignored, 추적 env 파일은 .env.example만 있다. 범위와 결과는 security.json에 있으며 모든 형태의 비밀 유출 부재를 수학적으로 보장하는 검사는 아니다.

실제 npm audit: **취약점 0**(총 dependency 438). 보안 헤더 nosniff, DENY, strict-origin-when-cross-origin, Permissions-Policy(microphone=self, camera/geolocation 차단) 확인. CSP는 현재 미설정이다.

입력 길이/바이트/읽기 시간, 인스턴스 요청 제한, provider 시간 제한, 요청당 모델·검색·원문 fetch 횟수 제한, DNS/IP·host allowlist·redirect 재검증, TLS 검증, 원문/검색 캐시가 있다. 공유 Redis 원자 예약으로 UTC 하루 최대 20회, 동시 검색 1개, 최소 간격 2초, 설정 최대 $3의 예약 예산을 적용한다. **예약 예산은 OpenAI 실제 청구액의 강제 상한이 아니다.** OpenAI 계정 청구/프로젝트 예산은 별도 관리해야 한다. Redis 누락/형식 오류/장애 시 비용 발생 검색은 fail closed한다. 제한 시 정적 13개 서비스와 안전 안내는 유지된다.

사용자가 Vercel Production에 UPSTASH_REDIS_REST_URL/TOKEN을 직접 등록했고 변수 이름/환경만 UI에서 확인했다. 비밀값은 읽거나 기록하지 않았다. 기존 AI_ENABLED/OPENAI_API_KEY/OPENAI_MODEL에 WEB_SEARCH_ENABLED=true, SEARCH_DAILY_USD=3을 Production용으로 추가했다. 초기 invalid_endpoint는 사용자가 REST URL/토큰을 수정하고 재배포하여 해결했으며 실제 연결과 동시 요청 차단을 확인했다.

## 남은 문제 및 제출 조건

1. 20문항 중 6개 핵심 답변 미완료: 음식물쓰레기 SPA 원문 추출, 구 전입 페이지 404의 현재 원문, 일반 버스 이용, 판교역→시청 전체 경로, 민원 시작 상세 절차, 금연상담 자체 무료 여부. 확인되지 않은 사실로 메우지 않고 안전하게 한계를 표시한다. 등록 25개 출처의 broken 0과 동적 검색 중 발견한 구 전입 404를 혼동하지 않는다.
2. 검색 결과 비결정성 때문에 수정 후 전체 20문항 새 모델 응답 재검증은 미수행. 동일 응답 회귀 + 새 2문항으로 수정 효과를 검증했다.
3. 물리 STT/TTS·실제 보조공학 청취 검증은 제출 기기에서 필요하다.
4. 하루 공유 20회/동시 1개는 비용 보호용 소규모 시연 설정이다. 많은 동시 관람객에게 무제한 공식검색을 제공하는 운영 수준은 아니다.

**‘모든 공식검색 질문 완전 지원’이라고 제출하는 데에는 1–2가 blocker다.** 검증된 13개 등록 서비스 및 성공한 확장 사례와 한계를 명확히 설명하는 프로토타입 제출은 조건부 가능하다. 알려진 실패를 성공으로 표시하거나 기존 기본 버전 검수로 대체하지 않는다.

## Production 및 최종 Git 기록

첫 런타임 커밋 `290dcc0c9ba5158f11cddcf1f33bee883ed27862`를 main에 fast-forward·push하여 실제 Vercel Production에 배포했다(Ready, `8FsY8hwWVhd1YZ6CXAoB8UM1mVov`). 이후 비밀 없는 Redis 진단을 추가한 `21730a576d8ea2bd69197cb6e06aaf02bfef2317`도 전체 게이트 통과 후 main에 push·배포했다(Ready, `BDdP8vktfD1VyiFbqxqVhpXt4Q3y`). 강제 push나 사용량 카운터 초기화는 하지 않았다.

GitHub Actions Offline regression도 두 런타임 커밋 모두 success 확인(run 34110131583, 34110530394). 코드·문서 diff whitespace 검사는 통과했다. 저장한 공식 원본 HTML의 기존 공백은 원문 hash 보존을 위해 바꾸지 않았다.

실제 [Production](https://seongnam-voicecare-ai.vercel.app/) 결과:

- API 11/11 통과, 공식 출처 보존·no-store·보안 헤더 및 HSTS 확인.
- Chromium/Firefox/WebKit 15/15 통과, 모바일/200% 글씨·키보드·출처 실제 새 창 포함.
- 기존 61개 실제 HTTP 전부 통과, wrong_service 0, wrong_clarification 0, 비등록 사실 추가 0. 요청 제한을 우회하지 않고 3개 시간 구간으로 나누었다. 앞 40개는 첫 배포, 뒤 21개는 검색 의미 변경 없는 진단 배포에서 실행했다.
- Redis 초기 동시 요청 2개와 진단 배포 후 2개 모두 안전 fallback. 비공개 Vercel 로그에서 `voicecare_search_budget invalid_endpoint`를 직접 확인했다(2026-09-07T10:16:30Z). Redis URL 형식 검사에서 차단되어 **이 4개 요청의 OpenAI 호출은 0회**다. 변수 존재만으로 실연결 성공을 주장하지 않는다.

사용자가 비밀값을 직접 수정하고 `21730a5`를 재배포한 `jSMTq8x3pYx3XAwPyRfeNN5tYACk`의 Production Ready를 확인했다. **Redis 설정 blocker 해결.** 2026-09-07T10:22:35Z 두 실제 동시 요청 결과:

- 여권 준비물: HTTP 200, partial_answer, searched=true, 15,872ms. 현재 공식 `https://www.seongnam.go.kr/cn0204080301` 원문 대조 성공. 신분증·사진·신청서·수수료 항목 등 완결된 원문을 보존하고 freshness unknown을 명시했다.
- 신규 도서관 회원증: HTTP 200, search_unavailable/rate_limited, searched=false, 1,071ms. 같은 시간의 추가 유료 호출 차단.
- 실제 Production 모델 호출 **1회**, 로컬 20회와 합계 **21회**. 초기 실패 4회는 모델 호출 0회. 계정의 다른 사용자 사용량·실제 청구액은 이 감사 호출 수와 별개다.
- 실제 Vercel 인스턴스 배치를 강제하지 않았으므로 이를 다중 인스턴스 부하 시험이라고 주장하지 않는다. 두 mock 인스턴스의 원자 예약 통합 테스트와 실제 Production 동시 요청 결과를 함께 근거로 삼는다.

Redis 수정 적용 후 실제 Production API 11/11 및 세 브라우저 15/15를 재실행했다. [실제 동시 요청 원 응답](voicecare-evaluation/final-expanded-20260907/production-budget.json), [배포 기록](voicecare-evaluation/final-expanded-20260907/production-deployment.json)을 보존했다. 실행 스크립트도 HTTP 200만으로 성공시키지 않고 ‘공식 근거 응답 1 + rate_limited 1’을 성공 조건으로 강화했다. 이 판정은 저장된 마지막 실제 응답으로 확인했으며 모델을 추가 호출하지 않았다.

최종 소스 코드는 `21730a576d8ea2bd69197cb6e06aaf02bfef2317`에서 검증됐다. 이후 커밋은 검증 보고서·증거·감사 스크립트 판정만 포함하고 앱 런타임은 동일하다. 최종 HEAD 자체를 문서 안에 자기참조로 넣을 수 없으므로 마지막 Git 상태와 최종 배포 SHA는 전달 답변에도 명시한다.

운영자가 URL을 다시 찾을 때에는 [Upstash REST API 공식 문서](https://upstash.com/docs/redis/features/restapi)의 database Connection에서 HTTPS URL과 일반 Token을 사용한다. TCP 주소 또는 Readonly Token을 REST 환경변수와 혼용하지 않는다.
