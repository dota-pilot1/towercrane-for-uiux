# 06. 풀이 제출 (Submission) + 자동 채점 + 어드민 평점

> 사용자가 챌린지를 풀고 GitHub URL/설명/체크리스트 결과를 제출하면, 서버가 자동으로 점수를 매기고 어드민이 추가로 1~5점 평가를 남길 수 있다.
> 마포 방식과 동일.

---

## 1. 데이터 흐름

```
사용자 → SubmissionForm
       └─ POST /api/challenge/sections/:id/submissions
            ↳ ChallengeService.calculateScore(topics, checklistResult)
            ↳ INSERT challenge_submissions (score 자동)
       ← submission JSON

어드민 → SubmissionList 의 각 카드 → 별점 클릭
       └─ PUT /api/challenge/submissions/:id/rating { rating: 1..5 }
       ← updated submission

본인 → 본인 카드의 [수정] 버튼 → SubmissionEditForm
       └─ PATCH /api/challenge/submissions/:id
            ↳ score 재계산
```

---

## 2. UI 컴포넌트

```
features/challenge/submission/
├── ui/
│   ├── submission-tab.tsx              ← 탭 진입점, 폼 + 리스트 조합
│   ├── submission-form.tsx             ← GitHub URL + 본문 + 체크리스트
│   ├── submission-list.tsx             ← 모든 제출 (createdAt desc)
│   ├── submission-card.tsx             ← 제출 1개 (펼침/접힘)
│   ├── submission-edit-form.tsx        ← 본인 수정 모드
│   ├── submission-rating.tsx           ← admin 별점 UI
│   └── score-badge.tsx                 ← 점수 + 만점 대비
└── lib/
    ├── build-checklist-init.ts         ← topics 의 CHECKLIST 항목들로 초기 [{index, checked:false}] 생성
    └── compute-max-score.ts            ← topics 로부터 만점 계산 (UI 표시용)
```

---

## 3. SubmissionForm 동작

### 3.1 초기화

```ts
const { data: topics = [] } = useChallengeTopics(sectionId)
const checklistItems = useMemo(() => buildChecklistInit(topics), [topics])
const maxScore = useMemo(() => computeMaxScore(topics), [topics])

const [githubUrl, setGithubUrl] = useState('')
const [content, setContent] = useState('')
const [checks, setChecks] = useState<{ index: number; checked: boolean }[]>(checklistItems)
```

`checklistItems` 배열 인덱스는 **모든 CHECKLIST 블록을 펼친 평탄 인덱스**여야 자동 채점이 일관된다 (서버도 동일 가정).

### 3.2 제출 페이로드

```json
{
  "githubUrl": "https://github.com/user/repo/pull/12",
  "content": "1회차 풀이 — 핵심은 ...",
  "checklistResult": "[{\"index\":0,\"checked\":true},{\"index\":1,\"checked\":false}]"
}
```

### 3.3 표시

- 제출 후 toast: `"풀이가 제출되었습니다. 점수: X/Y"`
- 카드에 점수 배지: `score / maxScore`

---

## 4. SubmissionCard 동작

```tsx
function SubmissionCard({ s, isMine, isAdmin, onEdit, onDelete, onRate }) {
  return (
    <article className="ui-panel-soft p-4">
      <header className="flex items-center justify-between gap-2">
        <UserAvatar name={s.userName} />
        <div className="flex-1 min-w-0">
          <p className="font-bold ui-text-primary">{s.userName}</p>
          <p className="text-xs ui-text-muted">{formatRelative(s.createdAt)}</p>
        </div>
        <ScoreBadge score={s.score} max={maxScore} />
        {isAdmin && <SubmissionRating value={s.rating ?? 0} onChange={onRate} />}
      </header>
      {s.githubUrl && <a href={s.githubUrl} className="text-brand-primary text-xs underline">PR/Repo 보기</a>}
      <p className="mt-2 text-sm whitespace-pre-wrap ui-text-primary">{s.content}</p>
      {(isMine || isAdmin) && (
        <footer className="mt-3 flex justify-end gap-1">
          {isMine && <button onClick={onEdit} className="ui-icon-button">수정</button>}
          <button onClick={onDelete} className="ui-icon-button-danger">삭제</button>
        </footer>
      )}
    </article>
  )
}
```

`UserAvatar` 는 기존 `shared/ui/` 에 있다면 재사용, 없으면 초성 1자 + brand glass 박스로 간단 구현.

---

## 5. 권한

| 액션 | 본인 | 어드민 | 다른 사람 |
|---|---|---|---|
| 보기 | ✅ | ✅ | ✅ |
| 수정 | ✅ | ❌ (요구되면 추후) | ❌ |
| 삭제 | ✅ | ✅ | ❌ |
| 평점 (rating) | ❌ | ✅ | ❌ |

> "본인 외 어드민의 수정"은 의도적으로 막는다 (채점 객관성). 어드민은 별점만.

---

## 6. 자동 채점 디테일

서버에서 마포 로직을 그대로 옮겼지만 다음 케이스 주의:
- `topics` 가 비어 있는 경우 `score = 0`
- `checklistResult` JSON 파싱 실패 → `score = 0` (예외 던지지 않고 보수적으로)
- CHECKLIST 가 여러 개일 경우 인덱스 충돌 방지 → **서버는 "모든 CHECKLIST 항목을 평탄화한 인덱스"** 를 가정. UI 도 같은 가정.

테스트 케이스 (`challenge.service.spec.ts`):
- topics 0개 → 0점
- CHECKLIST 1블록 + 2항목, 둘 다 체크 → 합계
- CHECKLIST 2블록 (3 + 2 항목), 일부 체크 → 정확한 평탄 인덱스 매핑
- 잘못된 JSON → 0점 (throw 안 함)

---

## 7. 빈 상태 / 로딩 / 에러

- topics 가 0개일 때 SubmissionForm 비활성화 + "주제 블록이 아직 없습니다" 안내.
- 제출 mutation 진행 중 버튼 disabled + spinner.
- 401 → useSessionStore.clearSession() (전역 인터셉터에서 이미 처리됨, 추가 작업 불필요)

---

## 8. 점검 체크리스트

- [ ] 일반 사용자가 풀이 제출 → 자동 채점 점수 확인
- [ ] 본인 풀이 수정 → 점수 재계산
- [ ] 본인 풀이 삭제 → 리스트에서 사라짐
- [ ] 어드민이 별점 부여 → 카드에 별 표시
- [ ] 다른 사용자의 풀이는 수정/삭제 버튼 안 보임
- [ ] CHECKLIST 가 여러 개일 때 평탄 인덱스 일치 (단위 테스트 통과)
- [ ] 풀이 제출 후 GPT 탭/노트 탭에서 "방금 푼 풀이"를 참조 가능 (다음 문서들에서 활용)

---

## 9. 다음 단계

→ `07-gpt-integration.md` — Challenge with GPT (학습 대화 로그)
