import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  designTemplatesTable,
  designReferencesTable,
  type DesignReferenceInsert,
  type DesignReferenceRow,
  type DesignTemplateInsert,
  type DesignTemplateRow,
} from '../database/schema';
import {
  createDesignReferenceSchema,
  createDesignTemplateSchema,
  listDesignTemplatesQuerySchema,
  updateDesignReferenceSchema,
  updateDesignTemplateSchema,
} from './design-templates.schemas';

export type DesignTemplateUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

const SAMPLE_TEMPLATES = [
  {
    title: '커머스 메인 페이지',
    summary: '첫 화면에서 브랜드, 핵심 혜택, 대표 카테고리, 추천 상품, 프로모션을 빠르게 보여주는 기본 메인 템플릿입니다.',
    category: '메인 페이지',
    tags: ['home', 'hero', 'commerce'],
    coverImageUrl: null,
    previewImageUrls: [],
    files: [
      {
        id: 'sample-file-commerce-home-html',
        name: 'commerce-home-page.html',
        url: 'https://smart-fnb-design.com/customer/',
        fileType: 'text/html',
        fileSize: 0,
        purpose: 'source',
      },
    ],
    conventionFiles: [
      {
        id: 'sample-file-commerce-home-convention',
        name: 'commerce-home-convention.md',
        url: 'https://smart-fnb-design.com/customer/',
        fileType: 'text/markdown',
        fileSize: 0,
        purpose: 'convention',
      },
    ],
    designRules:
      '첫 화면은 헤더, 히어로, 핵심 CTA, 대표 카테고리 순서로 구성한다.\n히어로에는 브랜드가 무엇을 파는지와 즉시 이동할 행동을 함께 둔다.\n추천 상품은 4~8개만 노출하고 가격, 할인, 배송 정보를 같은 위치에 맞춘다.\n프로모션, 베스트, 신상품은 섹션 제목과 보조 설명을 짧게 유지한다.',
    aiPrompt:
      '커머스 메인 페이지를 설계한다. 브랜드 히어로, 대표 카테고리, 추천 상품, 프로모션, 신뢰 요소를 첫 화면부터 자연스럽게 배치한다.',
  },
  {
    title: '브랜드 소개 페이지',
    summary: '브랜드 스토리, 가치 제안, 운영 방식, 신뢰 지표, 문의 CTA를 순서대로 설명하는 소개 페이지 템플릿입니다.',
    category: '소개 페이지',
    tags: ['about', 'brand', 'story'],
    coverImageUrl: null,
    previewImageUrls: [],
    files: [
      {
        id: 'sample-file-about-html',
        name: 'brand-about-page.html',
        url: 'https://smart-fnb-design.com/customer/',
        fileType: 'text/html',
        fileSize: 0,
        purpose: 'source',
      },
    ],
    conventionFiles: [
      {
        id: 'sample-file-about-convention',
        name: 'brand-about-convention.md',
        url: 'https://smart-fnb-design.com/customer/',
        fileType: 'text/markdown',
        fileSize: 0,
        purpose: 'convention',
      },
    ],
    designRules:
      '소개 페이지는 문제 제기, 브랜드 약속, 차별점, 증거, 행동 유도 순서로 읽히게 만든다.\n이미지는 분위기용보다 실제 제품, 공간, 과정, 사람을 우선한다.\n숫자 지표는 3개 이하로 제한하고 과장된 마케팅 문구보다 검증 가능한 표현을 쓴다.\n마지막에는 상품 보기, 상담, 입점 문의 같은 다음 행동을 명확히 둔다.',
    aiPrompt:
      '브랜드 소개 페이지를 설계한다. 스토리, 핵심 가치, 운영 방식, 신뢰 지표, CTA를 과하지 않은 커머스 톤으로 구성한다.',
  },
  {
    title: '장바구니 페이지',
    summary: '선택 상품, 수량 변경, 옵션 확인, 배송/할인 정보, 주문 요약을 한 화면에서 점검하는 장바구니 템플릿입니다.',
    category: '장바구니',
    tags: ['cart', 'order', 'summary'],
    coverImageUrl: null,
    previewImageUrls: [],
    files: [
      {
        id: 'sample-file-cart-html',
        name: 'cart-page.html',
        url: 'https://smart-fnb-design.com/customer/',
        fileType: 'text/html',
        fileSize: 0,
        purpose: 'source',
      },
    ],
    conventionFiles: [
      {
        id: 'sample-file-cart-convention',
        name: 'cart-page-convention.md',
        url: 'https://smart-fnb-design.com/customer/',
        fileType: 'text/markdown',
        fileSize: 0,
        purpose: 'convention',
      },
    ],
    designRules:
      '장바구니는 상품 목록과 주문 요약을 명확히 분리한다.\n상품 행에는 이미지, 상품명, 옵션, 수량, 가격, 삭제 액션을 같은 순서로 반복한다.\n수량 변경, 품절, 배송 불가, 쿠폰 적용 실패 상태를 상품 바로 근처에 표시한다.\n주문 요약에는 상품 금액, 할인, 배송비, 최종 금액, 결제 CTA를 고정된 순서로 둔다.',
    aiPrompt:
      '장바구니 페이지를 설계한다. 상품 목록, 수량/옵션 변경, 배송/할인 상태, 주문 요약, 결제 CTA를 반복 사용에 적합하게 구성한다.',
  },
] satisfies Array<
  Omit<DesignTemplateInsert, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>
>;

const SAMPLE_REFERENCES = [
  {
    title: 'Claude Artifacts',
    category: 'AI 디자인 생성',
    description: 'Claude에서 UI 초안, 인터랙션, 화면 구조를 빠르게 생성해보는 참고 도구',
    url: 'https://claude.ai/',
  },
  {
    title: 'Google Stitch',
    category: 'AI 디자인 생성',
    description: '프롬프트와 이미지로 UI 디자인과 프론트엔드 코드를 생성하는 Google 실험 도구',
    url: 'https://stitch.withgoogle.com/',
  },
  {
    title: 'Base44',
    category: 'AI 디자인 생성',
    description: 'AI가 화면/앱을 생성하는 방식 참고',
    url: 'https://base44.com/',
  },
  {
    title: 'Mobbin',
    category: 'UI 패턴',
    description: '실제 앱/웹 플로우와 UI 패턴 탐색',
    url: 'https://mobbin.com/',
  },
  {
    title: 'Baymard',
    category: '커머스 UX',
    description: '커머스 UX 리서치와 체크아웃 패턴',
    url: 'https://baymard.com/',
  },
  {
    title: 'Awwwards Ecommerce',
    category: '영감',
    description: '비주얼 중심 커머스 사이트 레퍼런스',
    url: 'https://www.awwwards.com/websites/e-commerce/',
  },
  {
    title: 'Shopify',
    category: '커머스 사이트',
    description: '커머스 SaaS 정보 구조와 랜딩 참고',
    url: 'https://www.shopify.com/',
  },
  {
    title: 'MUSINSA',
    category: '커머스 사이트',
    description: '패션 커머스 목록/상세/랭킹 참고',
    url: 'https://www.musinsa.com/',
  },
  {
    title: '29CM',
    category: '커머스 사이트',
    description: '매거진형 커머스 큐레이션 참고',
    url: 'https://www.29cm.co.kr/',
  },
] satisfies Array<
  Omit<
    DesignReferenceInsert,
    'id' | 'sortOrder' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'
  >
>;

@Injectable()
export class DesignTemplatesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  list(user: DesignTemplateUser, rawQuery: unknown) {
    this.ensureSignedIn(user);
    this.ensureSeedTemplates(user);
    const query = listDesignTemplatesQuerySchema.parse(rawQuery ?? {});
    const conditions: SQL[] = [];

    if (query.q) {
      const keyword = `%${query.q}%`;
      const keywordCondition = or(
        like(designTemplatesTable.title, keyword),
        like(designTemplatesTable.summary, keyword),
        like(designTemplatesTable.category, keyword),
        like(designTemplatesTable.designRules, keyword),
        like(designTemplatesTable.aiPrompt, keyword),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    if (query.category) {
      conditions.push(eq(designTemplatesTable.category, query.category));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = this.db
      .select()
      .from(designTemplatesTable)
      .where(where)
      .orderBy(desc(designTemplatesTable.updatedAt))
      .all();

    return rows.map((row) => this.toDto(row, user));
  }

  create(user: DesignTemplateUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createDesignTemplateSchema.parse(payload);
    const now = new Date().toISOString();
    const row: DesignTemplateInsert = {
      id: `design-template-${randomUUID().slice(0, 12)}`,
      ...input,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(designTemplatesTable).values(row).run();
    return this.detail(user, row.id);
  }

  detail(user: DesignTemplateUser, templateId: string) {
    this.ensureSignedIn(user);
    return this.toDto(this.ensureTemplate(templateId), user);
  }

  update(user: DesignTemplateUser, templateId: string, payload: unknown) {
    const row = this.ensureTemplate(templateId);
    this.ensureCanWrite(user, row);
    const input = updateDesignTemplateSchema.parse(payload);
    this.db
      .update(designTemplatesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(designTemplatesTable.id, templateId))
      .run();
    return this.detail(user, templateId);
  }

  delete(user: DesignTemplateUser, templateId: string) {
    const row = this.ensureTemplate(templateId);
    this.ensureCanWrite(user, row);
    this.db
      .delete(designTemplatesTable)
      .where(eq(designTemplatesTable.id, templateId))
      .run();
    return { success: true, id: templateId };
  }

  listReferences(user: DesignTemplateUser) {
    this.ensureSignedIn(user);
    this.ensureSeedReferences(user);
    const rows = this.db
      .select()
      .from(designReferencesTable)
      .orderBy(
        asc(designReferencesTable.sortOrder),
        desc(designReferencesTable.createdAt),
      )
      .all();
    return rows.map((row) => this.toReferenceDto(row));
  }

  createReference(user: DesignTemplateUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createDesignReferenceSchema.parse(payload);
    const now = new Date().toISOString();
    const row: DesignReferenceInsert = {
      id: `design-reference-${randomUUID().slice(0, 12)}`,
      ...input,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(designReferencesTable).values(row).run();
    return this.toReferenceDto(this.ensureReference(row.id));
  }

  updateReference(
    user: DesignTemplateUser,
    referenceId: string,
    payload: unknown,
  ) {
    this.ensureSignedIn(user);
    this.ensureReference(referenceId);
    const input = updateDesignReferenceSchema.parse(payload);
    this.db
      .update(designReferencesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(designReferencesTable.id, referenceId))
      .run();
    return this.toReferenceDto(this.ensureReference(referenceId));
  }

  deleteReference(user: DesignTemplateUser, referenceId: string) {
    this.ensureSignedIn(user);
    this.ensureReference(referenceId);
    this.db
      .delete(designReferencesTable)
      .where(eq(designReferencesTable.id, referenceId))
      .run();
    return { success: true, id: referenceId };
  }

  private ensureSeedTemplates(user: DesignTemplateUser) {
    const now = new Date().toISOString();
    SAMPLE_TEMPLATES.forEach((template, index) => {
      const id = `design-template-sample-${index + 1}`;
      const existing = this.db
        .select({ id: designTemplatesTable.id })
        .from(designTemplatesTable)
        .where(eq(designTemplatesTable.id, id))
        .get();

      if (existing) {
        this.db
          .update(designTemplatesTable)
          .set({
            ...template,
            updatedAt: now,
          })
          .where(eq(designTemplatesTable.id, id))
          .run();
        return;
      }

      this.db
        .insert(designTemplatesTable)
        .values({
          id,
          ...template,
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });
  }

  private ensureSeedReferences(user: DesignTemplateUser) {
    const now = new Date().toISOString();
    SAMPLE_REFERENCES.forEach((reference, index) => {
      const existing = this.db
        .select({
          id: designReferencesTable.id,
          title: designReferencesTable.title,
          category: designReferencesTable.category,
        })
        .from(designReferencesTable)
        .where(eq(designReferencesTable.url, reference.url))
        .get();
      if (existing) {
        const isSeedLike =
          existing.id.startsWith('design-reference-sample-') ||
          existing.id.startsWith('design-reference-seed-') ||
          existing.title === reference.title;
        if (isSeedLike && existing.category !== reference.category) {
          this.db
            .update(designReferencesTable)
            .set({
              title: reference.title,
              category: reference.category,
              description: reference.description,
              sortOrder: index + 1,
              updatedAt: now,
            })
            .where(eq(designReferencesTable.id, existing.id))
            .run();
        }
        return;
      }

      this.db
        .insert(designReferencesTable)
        .values({
          id: `design-reference-seed-${randomUUID().slice(0, 12)}`,
          ...reference,
          sortOrder: index + 1,
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });
  }

  private ensureTemplate(templateId: string) {
    const row = this.db
      .select()
      .from(designTemplatesTable)
      .where(eq(designTemplatesTable.id, templateId))
      .get();
    if (!row) {
      throw new NotFoundException(
        `디자인 템플릿을 찾을 수 없습니다: ${templateId}`,
      );
    }
    return row;
  }

  private ensureReference(referenceId: string) {
    const row = this.db
      .select()
      .from(designReferencesTable)
      .where(eq(designReferencesTable.id, referenceId))
      .get();
    if (!row) {
      throw new NotFoundException(
        `디자인 레퍼런스를 찾을 수 없습니다: ${referenceId}`,
      );
    }
    return row;
  }

  private ensureCanWrite(user: DesignTemplateUser, row: DesignTemplateRow) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('이 디자인 템플릿을 수정할 권한이 없습니다.');
  }

  private ensureSignedIn(user: DesignTemplateUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private toDto(row: DesignTemplateRow, user: DesignTemplateUser) {
    return {
      ...row,
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }

  private toReferenceDto(row: DesignReferenceRow) {
    return {
      ...row,
      canEdit: true,
      canDelete: true,
    };
  }
}
