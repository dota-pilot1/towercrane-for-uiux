# 09. 마무리 — 시드 / 회귀 / 배포 체크리스트

> M1~M8 이 끝난 후 마지막 PR. 시드 정리, 회귀 테스트, 운영 데이터 마이그레이션, 배포 메모를 한곳에 모은다.

---

## 1. 시드 데이터 최종 점검

### 1.1 메뉴
- [ ] `database.service.ts` 의 `initialMenus` 에서 **Chatbot 행 제거 확인** (Challenge with GPT 만 남음)
- [ ] `migrateChatbotMenuToChallenge` 1회성 마이그레이션 함수 호출되는지 확인 (운영 데이터 보호)
- [ ] 메뉴 displayOrder 가 화면 순서와 일치 (00-overview 의 메뉴 순서표 참고)

### 1.2 챌린지
- [ ] 시드 카테고리 1개 (스프링 부트) + 시드 섹션 1개 (1회차) 만 자동 생성
- [ ] **이미 데이터가 있을 경우 시드를 건너뛰는** idempotency 보장
- [ ] 시드 카테고리의 `created_by` 가 demo user id 로 채워짐

### 1.3 demo user
- [ ] `terecal@daum.net` / `password123` 로 로그인 가능
- [ ] role 이 `admin` 인지 확인

---

## 2. 라우트 / 메뉴 회귀 테스트

| URL | 기대 동작 |
|---|---|
| `/` | `/prototype/$categoryId` 로 리다이렉트 |
| `/login` | 로그인 폼 |
| `/challenge` | 챌린지 페이지 (3패널) |
| `/challenge?categoryId=...` | 해당 카테고리 + 섹션 사이드바 |
| `/challenge?categoryId=...&sectionId=...&tab=gpt` | GPT 탭 활성 |
| `/chatbot` | (옵션) `/challenge` 로 301 리다이렉트 또는 404 |
| `/admin/menu` | 메뉴 트리에 "Challenge with GPT" 표시 |

---

## 3. 권한 회귀 테스트

| 시나리오 | 기대 |
|---|---|
| 비로그인 → `/challenge` 진입 | `/login` 강제 이동 |
| 일반 유저 → 카테고리 [+ 추가] 버튼 | 안 보임 |
| 일반 유저 → POST `/api/challenge/categories` | 403 |
| 일반 유저 → 본인 풀이 수정 | 200 |
| 일반 유저 → 다른 사람 풀이 수정 | 403 |
| 어드민 → 풀이 별점 부여 | 200 |
| 일반 유저 → 다른 사람 private 노트 GET | 403 (또는 목록 미포함) |
| 일반 유저 → 본인 GPT 스레드 삭제 | 200, cascade messages |

---

## 4. UI 회귀

- [ ] CLAUDE.md 의 raw 팔레트 금지 규칙 위반 없음 (`grep -RE "text-white|bg-slate-|text-slate-" src/pages/challenge src/features/challenge`)
- [ ] 다크/라이트/브랜드 테마 전환 시 챌린지 페이지 모든 컴포넌트가 깨지지 않음
- [ ] 좁은 화면 (lg 미만) 에서 사이드바가 적절히 숨겨지거나 stack 됨
- [ ] DnD가 메뉴 관리에서 했던 것처럼 하위 항목 위로 끌어도 끊기지 않음
- [ ] toast 메시지가 sonner 로 일관되게 표시 (다른 모듈과 동일 톤)

---

## 5. 백엔드 회귀

- [ ] 모든 challenge 엔드포인트가 Bearer token 미지정 시 401
- [ ] Zod 검증 실패 시 400 + 의미 있는 메시지
- [ ] CASCADE 동작 검증
  - 카테고리 삭제 → 섹션/주제/제출/스레드/노트 모두 사라짐
  - 섹션 삭제 → 토픽/제출/스레드/노트(섹션 매단 것)/노트(토픽 매단 것) 모두 사라짐
  - 유저 삭제 → 본인 제출/스레드/노트 사라짐
- [ ] 트랜잭션: 주제 일괄 저장 도중 한 행이 실패하면 전체 롤백
- [ ] OpenAI 503 시뮬레이션 → 사용자 메시지는 남고 assistant 자리에 placeholder

---

## 6. 데이터/스키마 마이그레이션 노트 (운영 환경)

기존 운영 DB 가 있다면:

```sql
-- 1) menus 테이블의 chatbot 행을 challenge 로 갈아끼움
UPDATE menus
SET name = 'Challenge with GPT', section_id = 'challenge', icon = 'Trophy', updated_at = datetime('now')
WHERE section_id = 'chatbot';

-- 2) challenge_* 테이블은 NestJS 부팅 시 CREATE TABLE IF NOT EXISTS 로 자동 생성됨
```

> 백업: 마이그레이션 전 `cp data/towercrane-catalog.sqlite data/backup-$(date +%F).sqlite`

---

## 7. 환경변수

추가될 변수 (`.env` / `.env.example` 갱신):

```env
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2048
CHALLENGE_GPT_DAILY_LIMIT=50
```

`README.md` 또는 `docs/setup.md` 에 새 변수 안내 한 줄 추가.

---

## 8. 성능 / 관측

- [ ] React Query 의 staleTime 설정 (categories: 5분, sections: 1분, topics: 1분, submissions: 30초)
- [ ] 동일 섹션 진입 시 prefetch (`queryClient.prefetchQuery`) 검토
- [ ] GPT 호출 시간 / 토큰 사용량을 서버 로그로 남김 (`Logger.log({ threadId, model, tokens })`)
- [ ] 슬로우 쿼리 식별: `EXPLAIN QUERY PLAN` 으로 인덱스 활용 검증

---

## 9. 문서화

- [ ] `README.md` 의 메뉴 소개에 "Challenge with GPT" 추가
- [ ] `CLAUDE.md` 또는 `docs/` 에 챌린지 관련 컨벤션 1줄 메모 (블록 타입 화이트리스트 변경 시 양쪽 동기화 필수)
- [ ] API 문서 모듈(Postman) 에도 challenge 엔드포인트들을 카테고리로 추가하면 사용성 좋음

---

## 10. 출시 전 마지막 점검

- [ ] DB 리셋 후 재기동 → 빈 DB 상태에서 모든 흐름 1회 시연 (카테고리 추가 → 섹션 → 주제 → 풀이 → GPT → 노트 → 공유)
- [ ] 두 계정 (admin / user) 으로 권한 관점 시연
- [ ] 모바일 사파리에서 깨지지 않음 (사이드바 자동 접힘 확인)
- [ ] CI 에서 lint / typecheck / unit test 통과
- [ ] 배포 직전: OPENAI_API_KEY 가 운영 환경에만 있고, 클라이언트 번들에는 포함되지 않았는지 확인

---

## 11. 출시 후 모니터링 (1주)

- [ ] OpenAI 비용 지표 (일별 토큰 / 비용 알림)
- [ ] 챌린지 일일 활성 사용자 수
- [ ] GPT 메시지 평균 응답 시간 / 실패율
- [ ] 노트 공개 비율 (private vs shared) — 공유 동기 확인용

---

## 12. 다음 사이클 백로그 (이번엔 안 한 것 모음)

- [ ] 풀이 코드 자동 리뷰 (lint/test 결과 cmt)
- [ ] 코드 실행 샌드박스 (StackBlitz/Replit embed)
- [ ] GPT 스트리밍(SSE) 응답
- [ ] 다중 모델 백엔드 (Claude/Gemini)
- [ ] 노트 백링크 / 멘션
- [ ] 스터디 그룹 + 그룹 단위 공유
- [ ] 챌린지 진행률 대시보드 (홈)
- [ ] 게스트 읽기 모드 (선택 카테고리만 비로그인 노출)
- [ ] 마이그레이션 자동화 (drizzle-kit generate + push)

---

## 13. 작업 종료 정의 (Definition of Done)

이 프로젝트의 "끝났다" 기준:
1. 9개 문서 모두 점검 체크리스트가 ✅
2. demo 계정으로 admin/user 양쪽 시연 영상 1회 캡처
3. 운영 DB 마이그레이션 SQL 검증 (스테이징에서)
4. README + .env.example 갱신 PR 머지
5. 1주 모니터링 결과 1줄 회고 작성
