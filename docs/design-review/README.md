# Seongnam VoiceCare AI 디자인 정리 기록

기준 SHA: `fe971fd66749e68a3d2e34a0bac6b2002786428f`  
작업 브랜치: `codex/visual-design-refinement`

## 변경 전 확인한 문제

1. 영문 브랜드와 상단 배지가 질문 시작 행동보다 먼저 두드러졌다.
2. 큰 소개 제목, 긴 설명, 반복된 사용 단계 때문에 질문 입력이 아래로 밀렸다.
3. 질문·음성·예시·답변이 비슷한 카드와 아이콘으로 반복되어 읽는 순서가 약했다.
4. 개인정보와 음성 처리 안내가 긴 문단으로 한꺼번에 노출되어 핵심 주의와 상세 설명이 구분되지 않았다.

## 적용한 방향

홍보형 랜딩 페이지보다 차분한 생활정보 창구에 가깝게 정리했다. 한국어 질문 제목과 입력을 먼저 보이게 하고, 프로젝트 영문명과 Astra 팀 정보는 보조 정보로 낮췄다. 비공식 프로토타입 고지는 읽을 수 있는 크기와 대비로 유지했다. 답변은 핵심 안내, 답변 듣기, 확인 상태와 공식 출처, 자세한 내용 순으로 재배치했다.

개인정보를 입력하지 말라는 주의는 입력창 가까이에 계속 노출한다. OpenAI 검색 처리 가능성, 자동 가림 한계, DB 저장 범위와 음성 처리 설명은 키보드로 접근 가능한 펼침 영역에 보존했다.

## 스크린샷

동일한 Playwright Chromium 환경에서 데스크톱 1440×1000, 모바일 390×844로 캡처했다. 질문 결과는 로컬의 검증된 구조화 응답과 확인 질문을 사용했으며 유료 공식 검색을 호출하지 않았다.

| 상태 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 데스크톱 첫 화면 | [before/desktop-initial.png](before/desktop-initial.png) | [after/desktop-initial.png](after/desktop-initial.png) |
| 데스크톱 답변 | [before/desktop-answer.png](before/desktop-answer.png) | [after/desktop-answer.png](after/desktop-answer.png) |
| 데스크톱 확인 질문 | [before/desktop-clarification.png](before/desktop-clarification.png) | [after/desktop-clarification.png](after/desktop-clarification.png) |
| 모바일 첫 화면 | [before/mobile-initial.png](before/mobile-initial.png) | [after/mobile-initial.png](after/mobile-initial.png) |
| 모바일 답변 | [before/mobile-answer.png](before/mobile-answer.png) | [after/mobile-answer.png](after/mobile-answer.png) |
| 모바일 확인 질문 | [before/mobile-clarification.png](before/mobile-clarification.png) | [after/mobile-clarification.png](after/mobile-clarification.png) |

변경 후에는 다음 상태도 390×844에서 별도로 렌더링해 문구, 대비, 줄바꿈과 복구 흐름을 직접 확인했다.

- [검색 중](after/mobile-loading.png)
- [오류](after/mobile-error.png) · [오류 후 복구](after/mobile-recovered.png)
- [음성 입력 중](after/mobile-voice-listening.png) · [음성 입력 실패](after/mobile-voice-error.png)
- [TTS 재생 중](after/mobile-tts-playing.png)
- [검색 제한](after/mobile-limit.png)
- [미지원 질문](after/mobile-unsupported.png)

## 검증 범위

- lint, typecheck, production build 통과
- 서버 테스트 294/294 통과
- UI 테스트 59/59 통과
- 360px, 390px, 430px 답변·출처·상세·TTS와 200% 글자 확대에서 가로 넘침 없음
- 첫 화면, 검색 중, 정상 답변, 확인 질문, 음성 입력 중·실패, TTS 재생, 검색 제한, 미지원, 오류·복구 상태를 실제 Chromium 렌더링으로 확인
- 긴 공식 출처 이름, `unknown` 최신성 문구, 키보드 focus, `aria-live`, `aria-pressed`, 비활성화 상태 보존 확인

음성 자동 검사는 브라우저 API mock이다. 실제 마이크 인식률, 스피커 청취, NVDA/VoiceOver는 확인하지 않았다. Production 배포와 main 병합은 수행하지 않았다.
