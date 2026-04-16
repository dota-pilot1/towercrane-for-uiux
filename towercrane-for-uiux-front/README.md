# towercrane-for-uiux-front

내부 관리자 패턴과 GitHub 프로토타입을 카탈로그처럼 관리하기 위한 Vite + React + TypeScript 기반 프런트입니다.

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
- 관리자형 카탈로그 화면
  - 왼쪽 사이드바 카테고리 목록
  - 카테고리 추가 다이얼로그
  - 선택 카테고리 설명 패널
  - GitHub 프로토타입 검색/추가 폼
  - TanStack Table 기반 프로토타입 리스트
  - backend 탭을 통한 서버 역할 설명
- 전역 상태와 서버 상태 연결
  - Zustand persist로 카테고리/필터/탭 상태 관리
  - react-hook-form + zod로 카테고리/프로토타입 입력 검증
  - React Query provider 준비 완료

## 핵심 UX

- 20개 기본 시나리오는 시드일 뿐이고, 왼쪽 사이드바에 계속 카테고리를 추가할 수 있습니다.
- 본문 오른쪽에서는 선택한 카테고리에 대한 설명, 체크리스트, 태그, GitHub 프로토타입 링크를 함께 관리합니다.
- 프로토타입은 repo root, 특정 폴더, 브랜치 링크 형태로 공유할 수 있게 설계했습니다.

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
