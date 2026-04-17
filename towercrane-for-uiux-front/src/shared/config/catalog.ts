export type PrototypeStatus = 'draft' | 'building' | 'ready'
export type PrototypeVisibility = 'public' | 'private'

export type PrototypeItem = {
  id: string
  title: string
  repoUrl: string
  demoUrl?: string
  figmaUrl?: string
  summary: string
  status: PrototypeStatus
  visibility: PrototypeVisibility
  updatedAt: string
}

export type ScenarioIconKey =
  | 'fsd'
  | 'layout'
  | 'state'
  | 'server'
  | 'table'
  | 'form'
  | 'search'
  | 'component'
  | 'design'
  | 'motion'
  | 'lifecycle'
  | 'workspace'
  | 'chart'
  | 'alert'
  | 'rbac'
  | 'realtime'
  | 'loading'
  | 'error'
  | 'dnd'
  | 'performance'
  | 'custom'

export type ScenarioCategory = {
  id: string
  userId: string
  title: string
  summary: string
  group: string
  iconKey: ScenarioIconKey
  checklist: string[]
  tags: string[]
  prototypes: PrototypeItem[]
}

const repoTree = 'https://github.com/dota-pilot1/towercrane-for-uiux/tree/main'

export const seedScenarioCategories: ScenarioCategory[] = [
  {
    id: 'fsd-architecture',
    title: 'FSD 아키텍처',
    summary: 'layer, slice, segment 규칙과 역할 기반 파일 검색을 위한 구조 설계',
    group: 'foundation',
    iconKey: 'fsd',
    tags: ['layering', 'folder-rules', 'naming'],
    checklist: ['app/pages/widgets/features/entities/shared 경계 유지', '역할 기반 파일명 규칙 적용', 'Next.js 이관 고려'],
    prototypes: [
      {
        id: 'proto-fsd-front',
        title: 'Front Workbench Root',
        repoUrl: `${repoTree}/towercrane-for-uiux-front`,
        summary: '현재 관리자형 프런트 스타터의 구조 베이스',
        status: 'ready',
        visibility: 'public',
        updatedAt: '2026-04-16',
      },
    ],
  },
  {
    id: 'layout-system',
    title: '레이아웃 시스템',
    summary: 'grid, split, responsive, panel layout을 표준화하는 영역',
    group: 'foundation',
    iconKey: 'layout',
    tags: ['grid', 'responsive', 'shell'],
    checklist: ['desktop split layout', 'tablet fallback', 'mobile stacking'],
    prototypes: [
      {
        id: 'proto-layout-shell',
        title: 'Admin Shell Layout',
        repoUrl: `${repoTree}/towercrane-for-uiux-front/src/widgets/admin-shell`,
        summary: '좌측 내비게이션과 우측 작업영역으로 나뉜 관리자 레이아웃',
        status: 'ready',
        visibility: 'public',
        updatedAt: '2026-04-16',
      },
    ],
  },
  {
    id: 'zustand-pattern',
    title: '상태 관리',
    summary: 'Zustand slice와 persisted store 기반 UI 상태 패턴',
    group: 'foundation',
    iconKey: 'state',
    tags: ['zustand', 'slice', 'persist'],
    checklist: ['UI 상태와 서버 상태 분리', 'persist 범위 통제', 'feature별 slice 전략'],
    prototypes: [],
  },
  {
    id: 'tanstack-query',
    title: '서버 상태',
    summary: 'TanStack Query 캐시, refetch, optimistic update 패턴',
    group: 'data',
    iconKey: 'server',
    tags: ['react-query', 'cache', 'api'],
    checklist: ['query key 규칙', 'prefetch 패턴', 'retry 정책'],
    prototypes: [],
  },
  {
    id: 'tanstack-table',
    title: '테이블 UI',
    summary: 'TanStack Table 기반 엔터프라이즈 목록과 액션 패널',
    group: 'data',
    iconKey: 'table',
    tags: ['table', 'bulk-action', 'sorting'],
    checklist: ['column meta 관리', 'empty state', 'row action 규칙'],
    prototypes: [
      {
        id: 'proto-prototype-table',
        title: 'Prototype Registry Table',
        repoUrl: `${repoTree}/towercrane-for-uiux-front/src/widgets/order-table`,
        summary: '카테고리별 GitHub 프로토타입 리스트를 렌더링하는 보드',
        status: 'building',
        visibility: 'public',
        updatedAt: '2026-04-16',
      },
    ],
  },
  {
    id: 'form-system',
    title: '폼 시스템',
    summary: 'react-hook-form + zod를 기반으로 하는 폼 구축 패턴',
    group: 'interaction',
    iconKey: 'form',
    tags: ['rhf', 'zod', 'validation'],
    checklist: ['schema first', 'field wrapper', 'error message 정책'],
    prototypes: [],
  },
  {
    id: 'search-pattern',
    title: '검색 패턴',
    summary: 'filter panel, advanced search, query builder 표준화',
    group: 'interaction',
    iconKey: 'search',
    tags: ['filter', 'search', 'query-builder'],
    checklist: ['간단 검색과 고급 검색 분리', '저장 프리셋 구조', '서버 필터 매핑'],
    prototypes: [
      {
        id: 'proto-catalog-filter',
        title: 'Catalog Filter Panel',
        repoUrl: `${repoTree}/towercrane-for-uiux-front/src/features/workbench-filter`,
        summary: '카테고리별 프로토타입을 검색하고 공유하기 위한 폼 패턴',
        status: 'ready',
        visibility: 'public',
        updatedAt: '2026-04-16',
      },
    ],
  },
  {
    id: 'shared-components',
    title: '공통 컴포넌트',
    summary: 'Button, Input, Modal, Card 등 base UI 조합',
    group: 'design',
    iconKey: 'component',
    tags: ['button', 'input', 'modal'],
    checklist: ['variant 관리', '접근성 속성', 'slot 조합'],
    prototypes: [],
  },
  {
    id: 'design-system',
    title: '디자인 시스템',
    summary: '토큰, spacing, color, typography, elevation 규칙 정의',
    group: 'design',
    iconKey: 'design',
    tags: ['token', 'typography', 'color'],
    checklist: ['semantic color naming', 'spacing scale', 'type ramp'],
    prototypes: [],
  },
  {
    id: 'interaction-motion',
    title: '인터랙션',
    summary: 'hover, active, transition, motion 패턴의 일관성 유지',
    group: 'design',
    iconKey: 'motion',
    tags: ['hover', 'transition', 'motion'],
    checklist: ['interactive surface state', 'motion duration scale', 'reduced motion 대응'],
    prototypes: [],
  },
  {
    id: 'status-lifecycle',
    title: '상태 흐름 UI',
    summary: 'status, badge, step, lifecycle 표현을 표준화',
    group: 'workflow',
    iconKey: 'lifecycle',
    tags: ['status', 'badge', 'step'],
    checklist: ['status tone mapping', 'stepper 규칙', 'audit trace 노출'],
    prototypes: [],
  },
  {
    id: 'tabs-multi-panel',
    title: '탭 & 멀티 패널',
    summary: 'split view, workspace, multi panel 액션 공간 구성',
    group: 'workflow',
    iconKey: 'workspace',
    tags: ['tabs', 'workspace', 'panel'],
    checklist: ['tab state persist', 'split resize 전략', 'panel pinning'],
    prototypes: [],
  },
  {
    id: 'data-visualization',
    title: '데이터 시각화',
    summary: 'chart, summary card, KPI rail 등의 구성 패턴',
    group: 'workflow',
    iconKey: 'chart',
    tags: ['chart', 'summary', 'kpi'],
    checklist: ['chart empty state', 'number formatting', 'legend 규칙'],
    prototypes: [],
  },
  {
    id: 'notification-system',
    title: '알림 시스템',
    summary: 'toast, alert, activity feed, inbox 경험 설계',
    group: 'workflow',
    iconKey: 'alert',
    tags: ['toast', 'alert', 'activity-feed'],
    checklist: ['toast priority', 'feed grouping', 'read/unread 상태'],
    prototypes: [],
  },
  {
    id: 'rbac-ui',
    title: '권한 & 접근 제어 UI',
    summary: 'RBAC 기반 렌더링과 가시성 제어',
    group: 'workflow',
    iconKey: 'rbac',
    tags: ['rbac', 'permission', 'guard'],
    checklist: ['disabled vs hidden 규칙', '권한 없는 상태 UX', 'role mapping'],
    prototypes: [],
  },
  {
    id: 'realtime-ui',
    title: '실시간 처리',
    summary: 'SSE / WebSocket 이벤트를 UI에 반영하는 패턴',
    group: 'delivery',
    iconKey: 'realtime',
    tags: ['sse', 'websocket', 'live'],
    checklist: ['live badge', 'stream fallback', 'reconnect 정책'],
    prototypes: [],
  },
  {
    id: 'loading-ux',
    title: '로딩 UX',
    summary: 'skeleton, suspense, fallback을 포함한 로딩 경험 설계',
    group: 'delivery',
    iconKey: 'loading',
    tags: ['skeleton', 'fallback', 'suspense'],
    checklist: ['inline skeleton', 'page fallback', 'loading escalation'],
    prototypes: [],
  },
  {
    id: 'error-ux',
    title: '에러 처리 UX',
    summary: 'retry, boundary, toast, error message 정책 정리',
    group: 'delivery',
    iconKey: 'error',
    tags: ['error', 'retry', 'boundary'],
    checklist: ['api error format', 'boundary copy', 'retry affordance'],
    prototypes: [],
  },
  {
    id: 'dnd-kit',
    title: '드래그 앤 드롭',
    summary: 'dnd-kit 기반 정렬, 이동, 워크스페이스 재배치',
    group: 'delivery',
    iconKey: 'dnd',
    tags: ['drag-drop', 'sortable', 'kanban'],
    checklist: ['keyboard access', 'drop preview', 'collision rule'],
    prototypes: [],
  },
  {
    id: 'performance',
    title: '성능 최적화',
    summary: 'memo, virtualization, cache, render budget 정리',
    group: 'delivery',
    iconKey: 'performance',
    tags: ['virtualization', 'memo', 'cache'],
    checklist: ['render hot path 확인', 'virtual list 도입 기준', 'cache invalidation 전략'],
    prototypes: [],
  },
]
