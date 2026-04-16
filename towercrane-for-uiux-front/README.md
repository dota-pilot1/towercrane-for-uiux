# towercrane-for-uiux-front

내부 서버 프론트를 빠르게 구축하기 위한 Vite + React + TypeScript 기반 관리자형 스타터입니다.

## Stack

- Core: Vite, React 19, TypeScript
- Styling: Tailwind CSS v4, Radix UI
- State: Zustand
- Form: react-hook-form, zod
- Data: @tanstack/react-query, @tanstack/react-table
- Optional ready: @tanstack/react-virtual, dnd-kit

## 목표

- 자체적으로 FSD를 교과서적으로 구현
- Base44에 가까울 정도의 퀄리티 디자인 추구
- 기반 시스템과 하드코어한 인터랙션 구현을 슬라이드처럼 넘겨가며 복붙 가능한 형태로 문서화
- 엔터프라이즈급 관리자 페이지에서 자주 쓰는 요소를 체계적으로 관리
- 레거시 to 모던 프로젝트 전환에 필요한 컨벤션 공유
- 이후 Next.js로 옮기더라도 파일 이름 기반 검색이 잘 되도록 네이밍 최적화

## 타겟 범위

- 레이아웃 배치
- 검색폼
- 복잡한 검색폼
- 메뉴 with DB
- 사이드바
- 탭 분할
- 쿠폰 발급 시스템, 결제 관리 시스템 등 복잡한 상태 관리
- 주요 위젯 만들기
- 디자인 패밀리룩 맞추기
- 초기 개발 환경 정렬

## 현재 구현

- FSD 레이어 예시
  - `app`
  - `pages`
  - `widgets`
  - `features`
  - `entities`
  - `shared`
- 관리자형 샘플 화면
  - 사이드바 메뉴
  - KPI 카드
  - 복잡한 검색 폼
  - 탭 분할 영역
  - TanStack Table 데이터 리스트
- 전역 상태와 서버 상태 연결
  - Zustand로 메뉴/필터/탭 상태 관리
  - React Query로 비동기 목록 로딩
  - react-hook-form + zod로 검색 폼 검증

## 구현 계획 요약

1. 디자인 시스템 토대
   공통 토큰, 버튼/입력/패널 패턴, 타이포 계층, 상태 색상 규칙을 먼저 고정합니다.
2. 관리자 레이아웃 표준화
   사이드바, 상단 액션 바, 콘텐츠 슬롯, 탭 워크스페이스 구조를 표준 레이아웃으로 정리합니다.
3. 검색폼 패턴 라이브러리화
   단순 검색폼과 복합 검색폼을 분리하고, 스키마 검증과 서버 필터 매핑 규칙을 공통화합니다.
4. 메뉴/DB/권한 연동
   메뉴 정의, 접근 권한, 백엔드 응답 포맷을 맞춰 엔티티 중심으로 관리합니다.
5. 복잡한 상태 시나리오 대응
   쿠폰 발급, 결제 관리, 승인 플로우처럼 상태 전이가 많은 업무를 Zustand slice 또는 feature 단위로 분리합니다.
6. 문서 중심 운영
   각 화면 패턴을 슬라이드화하기 쉬운 단위로 문서화해서 신규 프로젝트에 그대로 가져다 쓸 수 있게 만듭니다.
7. Next.js 이관 대비
   파일명과 폴더명만으로도 역할을 찾을 수 있게 유지하고, 서버 컴포넌트/라우팅으로 옮기기 쉬운 형태를 유지합니다.

## 실행

```bash
pnpm install
pnpm dev
```

## 검증

```bash
pnpm lint
pnpm build
```
