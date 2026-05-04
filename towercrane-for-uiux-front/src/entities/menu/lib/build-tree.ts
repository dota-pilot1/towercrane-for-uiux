import type { MenuItem, MenuRecord } from '../model/types';

export function buildTree(flat: MenuRecord[], userRole: string | null): MenuItem[] {
  // 1. 가시성 및 권한 필터링
  const visible = flat.filter(
    (m) => m.isVisible && (!m.requiredRole || m.requiredRole === userRole)
  );

  // 2. ID 맵 생성
  const map = new Map<string, MenuItem>();
  visible.forEach((m) => map.set(m.id, { ...m, children: [] }));

  // 3. 계층 구조 조립
  const roots: MenuItem[] = [];
  map.forEach((item) => {
    if (item.parentId === null) {
      roots.push(item);
    } else {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children.push(item);
      }
    }
  });

  // 4. 순서 정렬
  const sort = (items: MenuItem[]) => items.sort((a, b) => a.displayOrder - b.displayOrder);
  map.forEach((item) => sort(item.children));
  
  return sort(roots);
}
