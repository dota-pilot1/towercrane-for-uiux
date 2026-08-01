import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  commonComponentTemplatesTable,
  type CommonComponentExample,
  type CommonComponentTemplateInsert,
  type CommonComponentTemplateRow,
} from '../database/schema';
import {
  createCommonComponentTemplateSchema,
  createCommonComponentExampleSchema,
  listCommonComponentTemplatesQuerySchema,
  updateCommonComponentExampleSchema,
  updateCommonComponentTemplateSchema,
  type CommonComponentTemplateUser,
} from './common-component-templates.schemas';

const SAMPLE_TEMPLATES = [
  {
    title: '입력 필드',
    summary:
      '라벨, 도움말, 오류 상태를 한 번에 다루는 기본 입력 컴포넌트입니다.',
    category: '폼',
    style: '기본형',
    previewKind: 'input' as const,
    componentName: 'TextField',
    tags: ['form', 'input', 'validation'],
    code: `type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {\n  label: string;\n  hint?: string;\n  error?: string;\n};\n\nexport function TextField({ label, hint, error, id, ...props }: TextFieldProps) {\n  const inputId = id ?? label.toLowerCase().replaceAll(' ', '-');\n  return (\n    <label htmlFor={inputId} className="grid gap-1.5 text-sm font-semibold text-text-primary">\n      <span>{label}</span>\n      <input id={inputId} {...props} className="ui-input" aria-invalid={Boolean(error)} />\n      <span className={error ? 'text-destructive' : 'text-text-muted'}>{error ?? hint}</span>\n    </label>\n  );\n}`,
    notes:
      'ui-input 유틸을 프로젝트 공통 스타일로 유지하면 입력 필드의 포커스/오류 상태가 함께 정리됩니다.',
  },
  {
    title: '액션 버튼',
    summary: '주요 행동과 보조 행동을 같은 API로 표현하는 버튼 컴포넌트입니다.',
    category: '액션',
    style: '브랜드',
    previewKind: 'button' as const,
    componentName: 'ActionButton',
    tags: ['button', 'action', 'loading'],
    code: `type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {\n  tone?: 'brand' | 'secondary' | 'danger';\n  loading?: boolean;\n};\n\nexport function ActionButton({ tone = 'brand', loading, children, ...props }: ActionButtonProps) {\n  const toneClass = { brand: 'ui-icon-button-brand px-4', secondary: 'ui-icon-button px-4', danger: 'ui-icon-button-danger px-4' }[tone];\n  return <button {...props} disabled={loading || props.disabled} className={\`inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-bold \${toneClass}\`}>{loading ? '처리 중…' : children}</button>;\n}`,
    notes:
      'tone은 색상이 아니라 의미를 기준으로 사용하고, loading 상태에서는 중복 제출을 차단합니다.',
  },
  {
    title: '정보 카드',
    summary:
      '제목, 설명, 상태 배지를 조합해 목록과 대시보드에서 재사용하는 카드입니다.',
    category: '콘텐츠',
    style: '소프트',
    previewKind: 'card' as const,
    componentName: 'InfoCard',
    tags: ['card', 'dashboard', 'status'],
    code: `type InfoCardProps = { eyebrow?: string; title: string; description: string; status?: string };\n\nexport function InfoCard({ eyebrow, title, description, status }: InfoCardProps) {\n  return <article className="ui-panel-soft grid gap-3 p-4"><div className="flex items-center justify-between gap-3">{eyebrow && <span className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-primary">{eyebrow}</span>}{status && <span className="rounded-full bg-brand-glass px-2 py-1 text-[11px] font-bold text-brand-primary">{status}</span>}</div><h3 className="text-base font-black text-text-primary">{title}</h3><p className="text-sm leading-6 text-text-secondary">{description}</p></article>;\n}`,
    notes:
      'status 표현이 반복되면 문자열 대신 도메인 상태 타입으로 확장하세요.',
  },
  {
    title: '필터 / 탭',
    summary:
      '목록 상단에서 현재 분류를 전환하고 선택 상태를 명확하게 보여주는 탭입니다.',
    category: '내비게이션',
    style: '컴팩트',
    previewKind: 'filter-tabs' as const,
    componentName: 'FilterTabs',
    tags: ['filter', 'tabs', 'navigation'],
    code: `type FilterTabsProps = { items: Array<{ id: string; label: string }>; value: string; onChange: (value: string) => void };\n\nexport function FilterTabs({ items, value, onChange }: FilterTabsProps) {\n  return <div role="tablist" className="flex flex-wrap gap-2">{items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={value === item.id} onClick={() => onChange(item.id)} className={value === item.id ? 'rounded-full bg-brand-primary px-3 py-1.5 text-xs font-bold text-text-on-brand' : 'rounded-full border border-surface-border-soft bg-surface-raised px-3 py-1.5 text-xs font-bold text-text-secondary'}>{item.label}</button>)}</div>;\n}`,
    notes:
      '탭은 색상 하나로만 구분하지 않고 aria-selected와 대비되는 배경을 함께 제공합니다.',
  },
] satisfies Array<
  Omit<
    CommonComponentTemplateInsert,
    'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'
  >
>;

function makeSampleExamples(
  template: (typeof SAMPLE_TEMPLATES)[number],
  templateId: string,
): CommonComponentExample[] {
  const variants: Record<
    string,
    Array<{ title: string; summary: string; previewVariant: string }>
  > = {
    input: [
      {
        title: '기본형',
        summary: '라벨과 도움말을 보여주는 기본 입력 상태입니다.',
        previewVariant: 'default',
      },
      {
        title: '오류 상태',
        summary: '검증 오류 메시지와 오류 보더를 보여줍니다.',
        previewVariant: 'error',
      },
      {
        title: '비활성 상태',
        summary: '수정할 수 없는 입력 상태를 보여줍니다.',
        previewVariant: 'disabled',
      },
    ],
    button: [
      {
        title: '주요 액션',
        summary: '가장 중요한 저장/제출 행동에 사용하는 버튼입니다.',
        previewVariant: 'primary',
      },
      {
        title: '보조 액션',
        summary: '주요 액션을 보완하는 보조 버튼입니다.',
        previewVariant: 'secondary',
      },
      {
        title: '위험 액션',
        summary: '삭제처럼 주의가 필요한 행동에 사용하는 버튼입니다.',
        previewVariant: 'danger',
      },
    ],
    card: [
      {
        title: '기본 카드',
        summary: '제목과 설명을 담는 기본 정보 카드입니다.',
        previewVariant: 'default',
      },
      {
        title: '상태 강조 카드',
        summary: '상태 배지를 강조하는 정보 카드입니다.',
        previewVariant: 'highlighted',
      },
      {
        title: '빈 상태 카드',
        summary: '데이터가 없을 때 안내하는 카드입니다.',
        previewVariant: 'empty',
      },
    ],
    'filter-tabs': [
      {
        title: '전체 선택',
        summary: '전체 목록을 선택한 필터 상태입니다.',
        previewVariant: 'default',
      },
      {
        title: '진행 중 선택',
        summary: '진행 중 항목만 선택한 필터 상태입니다.',
        previewVariant: 'active',
      },
      {
        title: '완료 선택',
        summary: '완료 항목만 선택한 필터 상태입니다.',
        previewVariant: 'done',
      },
    ],
  };
  const makeProps = (previewVariant: string) => {
    if (template.previewKind === 'input') {
      return {
        label: '프로젝트 이름',
        placeholder: '예: RocketBanchan',
        hint:
          previewVariant === 'error'
            ? ''
            : previewVariant === 'disabled'
              ? '비활성화된 입력 필드입니다.'
              : '화면에서 바로 입력해 볼 수 있습니다.',
        error:
          previewVariant === 'error' ? '프로젝트 이름을 입력해주세요.' : '',
        disabled: previewVariant === 'disabled',
      };
    }
    if (template.previewKind === 'button') {
      return {
        children:
          previewVariant === 'danger'
            ? '삭제하기'
            : previewVariant === 'secondary'
              ? '취소하기'
              : '저장하기',
        tone:
          previewVariant === 'danger'
            ? 'danger'
            : previewVariant === 'secondary'
              ? 'secondary'
              : 'brand',
        loading: false,
        disabled: false,
      };
    }
    if (template.previewKind === 'card') {
      return {
        eyebrow: 'Component',
        title: '주문 처리 현황',
        description:
          '반복되는 정보 묶음을 카드 하나로 정리하면 목록 화면의 밀도를 낮출 수 있습니다.',
        status: previewVariant === 'highlighted' ? '주의' : '활성',
      };
    }
    return {
      items: [
        { id: 'all', label: '전체' },
        { id: 'active', label: '진행 중' },
        { id: 'done', label: '완료' },
      ],
      value:
        previewVariant === 'active'
          ? 'active'
          : previewVariant === 'done'
            ? 'done'
            : 'all',
    };
  };
  return (variants[template.previewKind] ?? variants.input).map(
    (variant, index) => ({
      id: `${templateId}-example-${index + 1}`,
      ...variant,
      previewKind: template.previewKind,
      code: template.code,
      props: makeProps(variant.previewVariant),
      orderIdx: index,
    }),
  );
}

@Injectable()
export class CommonComponentTemplatesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  list(user: CommonComponentTemplateUser, rawQuery: unknown) {
    this.ensureSignedIn(user);
    this.ensureSeedTemplates(user);
    const query = listCommonComponentTemplatesQuerySchema.parse(rawQuery ?? {});
    const conditions: SQL[] = [];
    if (query.q) {
      const keyword = `%${query.q}%`;
      const condition = or(
        like(commonComponentTemplatesTable.title, keyword),
        like(commonComponentTemplatesTable.summary, keyword),
        like(commonComponentTemplatesTable.category, keyword),
        like(commonComponentTemplatesTable.style, keyword),
        like(commonComponentTemplatesTable.componentName, keyword),
      );
      if (condition) conditions.push(condition);
    }
    if (query.category)
      conditions.push(
        eq(commonComponentTemplatesTable.category, query.category),
      );
    if (query.style)
      conditions.push(eq(commonComponentTemplatesTable.style, query.style));
    const rows = this.db
      .select()
      .from(commonComponentTemplatesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(commonComponentTemplatesTable.updatedAt))
      .all();
    return rows.map((row) => this.toDto(row, user));
  }

  create(user: CommonComponentTemplateUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createCommonComponentTemplateSchema.parse(payload);
    const now = new Date().toISOString();
    const row: CommonComponentTemplateInsert = {
      id: `common-component-template-${randomUUID().slice(0, 12)}`,
      ...input,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(commonComponentTemplatesTable).values(row).run();
    return this.detail(user, row.id);
  }

  detail(user: CommonComponentTemplateUser, templateId: string) {
    this.ensureSignedIn(user);
    return this.toDto(this.ensureTemplate(templateId), user);
  }

  update(
    user: CommonComponentTemplateUser,
    templateId: string,
    payload: unknown,
  ) {
    const row = this.ensureTemplate(templateId);
    this.ensureCanWrite(user, row);
    const input = updateCommonComponentTemplateSchema.parse(payload);
    this.db
      .update(commonComponentTemplatesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(commonComponentTemplatesTable.id, templateId))
      .run();
    return this.detail(user, templateId);
  }

  delete(user: CommonComponentTemplateUser, templateId: string) {
    const row = this.ensureTemplate(templateId);
    this.ensureCanWrite(user, row);
    this.db
      .delete(commonComponentTemplatesTable)
      .where(eq(commonComponentTemplatesTable.id, templateId))
      .run();
    return { success: true, id: templateId };
  }

  private ensureSeedTemplates(user: CommonComponentTemplateUser) {
    const now = new Date().toISOString();
    SAMPLE_TEMPLATES.forEach((template, index) => {
      const id = `common-component-template-sample-${index + 1}`;
      const existing = this.db
        .select({
          id: commonComponentTemplatesTable.id,
          examples: commonComponentTemplatesTable.examples,
          code: commonComponentTemplatesTable.code,
        })
        .from(commonComponentTemplatesTable)
        .where(eq(commonComponentTemplatesTable.id, id))
        .get();
      if (existing) {
        if (!existing.examples.length) {
          const examples = makeSampleExamples(template, id).map(
            (example, exampleIndex) => ({
              ...example,
              code: exampleIndex === 0 ? existing.code : example.code,
            }),
          );
          this.db
            .update(commonComponentTemplatesTable)
            .set({ examples, updatedAt: now })
            .where(eq(commonComponentTemplatesTable.id, id))
            .run();
        }
        return;
      }
      const examples = makeSampleExamples(template, id);
      this.db
        .insert(commonComponentTemplatesTable)
        .values({
          id,
          ...template,
          examples,
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });
  }

  createExample(
    user: CommonComponentTemplateUser,
    templateId: string,
    payload: unknown,
  ) {
    const template = this.ensureTemplate(templateId);
    this.ensureCanWrite(user, template);
    const input = createCommonComponentExampleSchema.parse(payload);
    const examples = template.examples ?? [];
    const example: CommonComponentExample = {
      id: `common-component-example-${randomUUID().slice(0, 12)}`,
      ...input,
      orderIdx: examples.length,
    };
    const nextExamples = [...examples, example];
    this.db
      .update(commonComponentTemplatesTable)
      .set({
        examples: nextExamples,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(commonComponentTemplatesTable.id, templateId))
      .run();
    return this.detail(user, templateId);
  }

  updateExample(
    user: CommonComponentTemplateUser,
    templateId: string,
    exampleId: string,
    payload: unknown,
  ) {
    const template = this.ensureTemplate(templateId);
    this.ensureCanWrite(user, template);
    const input = updateCommonComponentExampleSchema.parse(payload);
    const examples = template.examples ?? [];
    const target = examples.find((example) => example.id === exampleId);
    if (!target) {
      throw new NotFoundException(
        `공통 컴포넌트 예제를 찾을 수 없습니다: ${exampleId}`,
      );
    }
    const nextExamples = examples.map((example) =>
      example.id === exampleId ? { ...example, ...input } : example,
    );
    this.db
      .update(commonComponentTemplatesTable)
      .set({
        examples: nextExamples,
        code: nextExamples[0]?.code ?? template.code,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(commonComponentTemplatesTable.id, templateId))
      .run();
    return this.detail(user, templateId);
  }

  private ensureTemplate(templateId: string) {
    const row = this.db
      .select()
      .from(commonComponentTemplatesTable)
      .where(eq(commonComponentTemplatesTable.id, templateId))
      .get();
    if (!row)
      throw new NotFoundException(
        `공통 컴포넌트 템플릿을 찾을 수 없습니다: ${templateId}`,
      );
    return row;
  }

  private ensureCanWrite(
    user: CommonComponentTemplateUser,
    row: CommonComponentTemplateRow,
  ) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException(
      '이 공통 컴포넌트 템플릿을 수정할 권한이 없습니다.',
    );
  }

  private ensureSignedIn(user: CommonComponentTemplateUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private toDto(
    row: CommonComponentTemplateRow,
    user: CommonComponentTemplateUser,
  ) {
    return {
      ...row,
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }
}
