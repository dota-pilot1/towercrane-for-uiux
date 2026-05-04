import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { menusTable, type MenuInsert } from '../database/schema';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

export interface CreateMenuDto {
  parentId?: string | null;
  name: string;
  sectionId?: string | null;
  icon?: string | null;
  displayOrder?: number;
  isVisible?: boolean;
  requiredRole?: string | null;
}

export interface UpdateMenuDto extends Partial<CreateMenuDto> {}

@Injectable()
export class MenusService {
  constructor(private readonly databaseService: DatabaseService) {}

  findAll() {
    return this.databaseService.db
      .select()
      .from(menusTable)
      .orderBy(menusTable.displayOrder)
      .all();
  }

  create(dto: CreateMenuDto) {
    const now = new Date().toISOString();
    const id = randomUUID();
    const newMenu: MenuInsert = {
      id,
      parentId: dto.parentId || null,
      name: dto.name,
      sectionId: dto.sectionId || null,
      icon: dto.icon || null,
      displayOrder: dto.displayOrder ?? 0,
      isVisible: dto.isVisible ?? true,
      requiredRole: dto.requiredRole || null,
      createdAt: now,
      updatedAt: now,
    };

    this.databaseService.db.insert(menusTable).values(newMenu).run();
    
    return this.databaseService.db.select().from(menusTable).where(eq(menusTable.id, id)).get();
  }

  update(id: string, dto: UpdateMenuDto) {
    const now = new Date().toISOString();
    this.databaseService.db
      .update(menusTable)
      .set({
        ...dto,
        updatedAt: now,
      })
      .where(eq(menusTable.id, id))
      .run();

    return this.databaseService.db.select().from(menusTable).where(eq(menusTable.id, id)).get();
  }

  remove(id: string) {
    this.databaseService.db.delete(menusTable).where(eq(menusTable.id, id)).run();
    return { success: true };
  }
}
