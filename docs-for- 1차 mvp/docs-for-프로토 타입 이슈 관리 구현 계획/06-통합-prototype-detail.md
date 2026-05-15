# 단계 6 — prototype-detail-page에 이슈 관리 버튼 통합

## 수정할 파일

```
towercrane-for-uiux-front/src/features/prototype-review/ui/prototype-detail-page.tsx
```

---

## 변경 내용

### 1. import 추가

```tsx
import { ShieldAlert } from 'lucide-react'   // 이슈 아이콘
```

### 2. useNavigate (이미 import됨) 활용

```tsx
// PrototypeDetailPage 함수 내부
const navigate = useNavigate()   // 이미 존재하는 경우 재사용
// (현재 PrototypeDetailDialog에서만 사용 중이므로 PrototypeDetailPage에도 추가 필요)
```

### 3. 우측 버튼 영역에 "이슈 관리" 버튼 추가

현재 버튼 영역 (`prototype-detail-page.tsx` 상단 우측):
```tsx
<div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
  <ActionIconButton icon={Copy} ... />
  {canManagePrototype && (
    <>
      <EditPrototypeDialog ... />
      <DeletePrototypeButton ... />
    </>
  )}
  <ActionIconButton icon={ArrowLeft} ... />   {/* 뒤로가기 */}
</div>
```

변경 후:
```tsx
<div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
  <ActionIconButton icon={Copy} ... />

  {/* 이슈 관리 버튼 — 모든 로그인 사용자에게 노출 */}
  <ActionIconButton
    icon={ShieldAlert}
    title="이슈 관리"
    aria-label="이슈 관리"
    onClick={() =>
      navigate({
        to: '/issues',
        search: { prototypeId: prototype.id },
      })
    }
  />

  {canManagePrototype && (
    <>
      <EditPrototypeDialog ... />
      <DeletePrototypeButton ... />
    </>
  )}
  <ActionIconButton icon={ArrowLeft} ... />
</div>
```

---

## 결과 UX 흐름

1. 프로토타입 상세 페이지 우상단에 `ShieldAlert` 아이콘 버튼 노출
2. 클릭 → `/issues?prototypeId=prototype-943425` 페이지로 이동
3. 칸반 보드에서 해당 프로토타입의 이슈만 표시
4. "새 이슈" 버튼으로 이슈 등록 → 칸반 OPEN 컬럼에 추가
5. 카드 드래그 → 상태 자동 변경 (IN_PROGRESS / TESTING / CLOSED)
6. 카드 클릭 → 상세 다이얼로그 (내용 편집, 담당자 변경, 댓글)
7. 뷰 전환 토글로 테이블 뷰 전환 가능

---

## 헤더 메뉴 고려사항 (선택)

`app-header.tsx`에 "이슈" 메뉴를 추가하는 것은 **선택 사항**.  
현재 `/issues`는 항상 `prototypeId`가 필요하므로, 헤더에 직접 노출하기보다  
프로토타입 상세에서 진입하는 방식이 더 자연스럽다.

만약 헤더 메뉴 DB(`menus` 테이블)에 추가하려면:
- `path: '/issues'` 로 추가하되 prototypeId 없이 접근 시 안내 메시지 표시
