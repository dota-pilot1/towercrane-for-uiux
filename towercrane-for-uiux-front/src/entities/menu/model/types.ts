export type MenuRecord = {
  id: string;
  parentId: string | null;
  name: string;
  sectionId: string | null;
  icon: string | null;
  displayOrder: number;
  isVisible: boolean;
  requiredRole: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = MenuRecord & {
  children: MenuItem[];
};
