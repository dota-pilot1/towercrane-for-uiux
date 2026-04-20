type SeedPrototype = {
  id: string;
  title: string;
  repoUrl: string;
  demoUrl?: string;
  figmaUrl?: string;
  summary: string;
  status: 'draft' | 'building' | 'ready';
  visibility: 'public' | 'private';
  checklist?: string[];
  updatedAt: string;
};

type SeedCategory = {
  id: string;
  title: string;
  summary: string;
  group: string;
  iconKey: string;
  tags: string[];
  checklist: string[];
  prototypes: SeedPrototype[];
};

export const catalogSeed: SeedCategory[] = [
  {
    id: 'fsd-architecture',
    title: 'FSD 아키텍처',
    summary:
      'layer, slice, segment 규칙과 역할 기반 파일 검색을 위한 구조 설계',
    group: 'foundation',
    iconKey: 'fsd',
    tags: ['layering', 'folder-rules', 'naming'],
    checklist: [
      'app/pages/widgets/features/entities/shared 경계 유지',
      '역할 기반 파일명 규칙 적용',
      'Next.js 이관 고려',
    ],
    prototypes: [
      {
        id: 'proto-fsd-front',
        title: 'Front Workbench Root',
        repoUrl:
          'https://github.com/dota-pilot1/towercrane-for-uiux/tree/main/towercrane-for-uiux-front',
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
        repoUrl:
          'https://github.com/dota-pilot1/towercrane-for-uiux/tree/main/towercrane-for-uiux-front/src/widgets/admin-shell',
        summary: '좌측 내비게이션과 우측 작업영역으로 나뉜 관리자 레이아웃',
        status: 'ready',
        visibility: 'public',
        updatedAt: '2026-04-16',
      },
    ],
  },
  {
    id: 'search-pattern',
    title: '검색 패턴',
    summary: 'filter panel, advanced search, query builder 표준화',
    group: 'interaction',
    iconKey: 'search',
    tags: ['filter', 'search', 'query-builder'],
    checklist: [
      '간단 검색과 고급 검색 분리',
      '저장 프리셋 구조',
      '서버 필터 매핑',
    ],
    prototypes: [
      {
        id: 'proto-catalog-filter',
        title: 'Catalog Filter Panel',
        repoUrl:
          'https://github.com/dota-pilot1/towercrane-for-uiux/tree/main/towercrane-for-uiux-front/src/features/workbench-filter',
        summary: '카테고리별 프로토타입을 검색하고 공유하기 위한 폼 패턴',
        status: 'ready',
        visibility: 'public',
        updatedAt: '2026-04-16',
      },
    ],
  },
  {
    id: 'tanstack-table',
    title: '테이블 UI',
    summary: 'TanStack Table 기반 엔터프라이즈 목록과 액션 패널',
    group: 'data',
    iconKey: 'table',
    tags: ['table', 'bulk-action', 'sorting'],
    checklist: ['column meta 관리', 'empty state', 'row action 규칙'],
    prototypes: [],
  },
];
