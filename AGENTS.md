# AGENTS.md

## 배포 지침

배포 관련 작업을 할 때는 먼저 `/Users/terecal/beauty-book-hair/배포 가이드` 디렉터리의 문서를 참고한다.

특히 아래 문서를 우선 확인한다.
- `/Users/terecal/beauty-book-hair/배포 가이드/아키텍처.md`
- `/Users/terecal/beauty-book-hair/배포 가이드/서버 정보.md`
- `/Users/terecal/beauty-book-hair/배포 가이드/백엔드 배포.md`
- `/Users/terecal/beauty-book-hair/배포 가이드/프론트엔드 배포.md`
- `/Users/terecal/beauty-book-hair/배포 가이드/CORS 설정 가이드.md`
- `/Users/terecal/beauty-book-hair/배포 가이드/배포 완료 가이드.md`

배포 중 오류가 나면 `/Users/terecal/beauty-book-hair/배포 가이드/배포 과정 오류 히스토리`와 `/Users/terecal/beauty-book-hair/배포 가이드/배포 과정 문제점 정리.md`를 먼저 확인한다.

## 테마 / 스타일 규칙 (중요)

### 금지
**raw Tailwind 팔레트 색상 사용 금지.** 아래 패턴은 PR 리뷰에서 바로 리젝트.
- `text-white`, `text-slate-*`, `text-emerald-*`, `text-amber-*`, `text-sky-*`
- `bg-white/*`, `bg-slate-*/*`, `bg-emerald-500/*`
- `border-white/*`, `border-slate-*`, `border-emerald-*`

이유: 이 팔레트는 dark 테마 기준으로 고정되어 있어 light 테마(또는 brand 테마 전환)에서 헤더·본문이 따로 놀고 글씨가 안 보인다.

### 대신 쓸 것

**1순위 — Tailwind semantic token** (`src/index.css` `@theme` 블록에 등록됨)
- 텍스트: `text-text-primary` / `text-text-secondary` / `text-text-muted`
- 브랜드: `text-brand-primary` / `bg-brand-glass` / `border-brand-border`
- 서피스: `bg-surface-muted` / `bg-surface-raised` / `bg-surface-strong`
- 보더: `border-surface-border` / `border-surface-border-soft`

**2순위 — ui-\* 유틸 클래스** (`@layer utilities`에 정의)
- `ui-text-primary` / `ui-text-secondary` / `ui-text-muted`
- `ui-panel` / `ui-panel-soft` — 박스 + 보더 + 배경 한 번에
- `ui-icon-button` / `ui-icon-button-brand` / `ui-icon-button-danger` — 아이콘 버튼 프리셋
- `ui-input` — 입력 필드 프리셋

**3순위 — CSS 변수 직접 참조** (유틸이 없을 때만)
- `bg-[var(--surface-muted)]`, `border-[var(--surface-border-soft)]` 등

### 반복 패턴은 컴포넌트로 승격
같은 "아이콘 박스 + 제목 + 설명" 이나 "액티브/비액티브 리스트 항목" 같은 조합이 3번 이상 반복되면 `shared/ui/` 에 뽑는다. 색상 결정을 한 곳에 모으면 테마 드리프트가 사라진다.

### 체크리스트 (코드 쓰기 전)
1. `shared/ui/`에 이미 있는 컴포넌트인가? → 재사용
2. Tailwind semantic token으로 표현 가능한가? → `text-brand-primary` 등
3. `ui-*` 유틸 클래스로 커버되는가? → `ui-panel-soft` 등
4. 세 가지 전부 안 되면 CSS 변수 직접 (`var(--surface-muted)`)
5. raw 팔레트는 어떤 경우에도 금지

### 예시 매핑
| 잘못된 사용 | 올바른 사용 |
|---|---|
| `text-white` | `text-text-primary` 또는 `ui-text-primary` |
| `text-slate-400` | `text-text-secondary` 또는 `ui-text-secondary` |
| `text-slate-500` | `text-text-muted` 또는 `ui-text-muted` |
| `bg-white/10` | `bg-surface-muted` |
| `bg-slate-950/40` | `bg-surface-muted` |
| `border-white/10` | `border-surface-border-soft` |
| `text-emerald-400` | `text-brand-primary` |
| `bg-emerald-500/10` | `bg-brand-glass` |
| `border-emerald-400` | `border-brand-border` |
