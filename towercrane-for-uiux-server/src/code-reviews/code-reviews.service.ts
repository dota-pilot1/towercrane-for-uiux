import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { DatabaseService } from '../database/database.service';
import {
  codeReviewsTable,
  type CodeReviewChangedFile,
  type CodeReviewFinding,
  type CodeReviewInsert,
  type CodeReviewRiskLevel,
  type CodeReviewRow,
  type CodeReviewSourceType,
} from '../database/schema';
import {
  analyzeCodeReviewSchema,
  createCodeReviewSchema,
  listCodeReviewsQuerySchema,
  updateCodeReviewSchema,
  validateCodeReviewRepositorySchema,
  type AnalyzeCodeReviewInput,
} from './code-reviews.schemas';
import { codeReviewStyleGuide } from './code-review-style-guide';

export type CodeReviewUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

type ParsedGithubSource = {
  sourceType: CodeReviewSourceType;
  sourceUrl: string;
  diffUrl: string;
  repository: string;
  reference: string;
};

type ParsedDiffFile = CodeReviewChangedFile & {
  diff: string;
  fullText?: string | null;
};

type CodeReviewAnalysis = {
  title: string;
  summary: string;
  riskLevel: CodeReviewRiskLevel;
  findings: CodeReviewFinding[];
  testGaps: string[];
  model: string;
};

type CodeReviewFindingCategory = NonNullable<CodeReviewFinding['category']>;
type CodeReviewSection = AnalyzeCodeReviewInput['sections'][number];
type ReviewIntent = 'delete' | 'update' | 'create' | 'navigation' | 'generic';

const MAX_DIFF_CHARS = 80_000;
const MAX_FILES = 30;
const MAX_FILE_DIFF_CHARS = 20_000;
const MAX_LLM_DIFF_CHARS = 30_000;
const MAX_CONTEXT_FILE_CHARS = 40_000;

@Injectable()
export class CodeReviewsService {
  private readonly openai: OpenAI | null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  private get db() {
    return this.databaseService.db;
  }

  list(user: CodeReviewUser, rawQuery: unknown) {
    this.ensureSignedIn(user);
    const query = listCodeReviewsQuerySchema.parse(rawQuery ?? {});
    const conditions: SQL[] = [];

    if (query.q) {
      const keyword = `%${query.q}%`;
      const keywordCondition = or(
        like(codeReviewsTable.title, keyword),
        like(codeReviewsTable.summary, keyword),
        like(codeReviewsTable.sourceUrl, keyword),
        like(codeReviewsTable.repository, keyword),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    if (query.repository) {
      conditions.push(like(codeReviewsTable.repository, `%${query.repository}%`));
    }
    if (query.riskLevel) {
      conditions.push(eq(codeReviewsTable.riskLevel, query.riskLevel));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;
    const rows = this.db
      .select()
      .from(codeReviewsTable)
      .where(where)
      .orderBy(desc(codeReviewsTable.createdAt))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(codeReviewsTable)
      .where(where)
      .get();
    const total = Number(totalRow?.count ?? 0);

    return {
      items: rows.map((row) => this.toSummaryDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async analyzeAndSave(user: CodeReviewUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = analyzeCodeReviewSchema.parse(payload);
    const source = this.parseGithubSource(input.sourceUrl);
    const diff = await this.fetchDiff(source.diffUrl);
    const parsed = this.parseDiff(diff);
    const selectedFiles = parsed.files.slice(0, MAX_FILES);
    const fileLimitExcluded = parsed.files.slice(MAX_FILES).map((file) => ({
      ...file,
      reviewed: false,
      excludedReason: '파일 수 제한 초과',
    }));
    const reviewedFiles = selectedFiles
      .map((file) => this.applyDiffFileExclusion(file))
      .filter((file) => file.reviewed);
    const reviewedFilesWithContext = await this.attachGithubFileContext(
      source,
      reviewedFiles,
    );
    const excludedFiles = [
      ...selectedFiles
        .map((file) => this.applyDiffFileExclusion(file))
        .filter((file) => !file.reviewed),
      ...fileLimitExcluded,
    ];
    const reviewableDiff = reviewedFilesWithContext
      .map((file) => file.diff)
      .join('\n');
    const reviewGoal = input.reviewGoal.trim();
    const repositoryUrl =
      input.repositoryUrl?.trim() || `https://github.com/${source.repository}`;

    if (!reviewableDiff.trim()) {
      throw new BadRequestException(
        '리뷰 가능한 diff가 없습니다. lock/generated 파일만 포함되어 있거나 diff가 비어 있습니다.',
      );
    }

    const diffHash = createHash('sha256')
      .update(reviewableDiff)
      .update('\n--review-goal--\n')
      .update(reviewGoal)
      .digest('hex');
    const duplicate = this.findDuplicate(source.sourceUrl, diffHash);
    if (duplicate) {
      return {
        ...this.toDetailDto(duplicate, user),
        duplicate: true,
      };
    }

    const analysis = await this.reviewDiff(
      source,
      reviewedFilesWithContext,
      excludedFiles,
      input.sections,
      repositoryUrl,
      reviewGoal,
    );
    const now = new Date().toISOString();
    const row: CodeReviewInsert = {
      id: `code-review-${randomUUID().slice(0, 12)}`,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      repository: source.repository,
      title: analysis.title,
      summary: analysis.summary,
      riskLevel: analysis.riskLevel,
      findings: analysis.findings,
      testGaps: analysis.testGaps,
      changedFiles: reviewedFilesWithContext.map(
        ({ diff: _diff, fullText: _fullText, ...file }) => file,
      ),
      excludedFiles: excludedFiles.map(({ diff: _diff, ...file }) => file),
      diffHash,
      diffSnapshot: reviewableDiff.slice(0, MAX_DIFF_CHARS),
      model: analysis.model,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(codeReviewsTable).values(row).run();
    return {
      ...this.detail(user, row.id),
      duplicate: false,
    };
  }

  create(user: CodeReviewUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createCodeReviewSchema.parse(payload);
    const duplicate = this.findDuplicate(input.sourceUrl, input.diffHash);
    if (duplicate) return this.toDetailDto(duplicate, user);

    const now = new Date().toISOString();
    const row: CodeReviewInsert = {
      id: `code-review-${randomUUID().slice(0, 12)}`,
      ...input,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(codeReviewsTable).values(row).run();
    return this.detail(user, row.id);
  }

  async validateRepository(user: CodeReviewUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = validateCodeReviewRepositorySchema.parse(payload ?? {});
    const repository = this.parseGithubRepository(input.repositoryUrl);
    const repositoryUrl = `https://github.com/${repository}`;

    try {
      const response = await fetch(`https://api.github.com/repos/${repository}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'towercrane-code-review',
        },
      });
      if (!response.ok) {
        return {
          valid: false,
          repository,
          repositoryUrl,
          defaultBranch: null,
          message:
            response.status === 404
              ? '저장소를 찾을 수 없습니다.'
              : `GitHub 확인 실패: ${response.status}`,
        };
      }
      const data = (await response.json()) as { default_branch?: string };

      return {
        valid: true,
        repository,
        repositoryUrl,
        defaultBranch: data.default_branch ?? null,
        message: 'GitHub 확인됨',
      };
    } catch {
      return {
        valid: false,
        repository,
        repositoryUrl,
        defaultBranch: null,
        message: 'GitHub 확인에 실패했습니다.',
      };
    }
  }

  detail(user: CodeReviewUser, reviewId: string) {
    this.ensureSignedIn(user);
    return this.toDetailDto(this.ensureReview(reviewId), user);
  }

  update(user: CodeReviewUser, reviewId: string, payload: unknown) {
    const row = this.ensureReview(reviewId);
    this.assertOwnerOrAdmin(row, user);
    const input = updateCodeReviewSchema.parse(payload);
    const changes: Partial<CodeReviewInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.title !== undefined) changes.title = input.title;
    if (input.summary !== undefined) changes.summary = input.summary;
    if (input.riskLevel !== undefined) changes.riskLevel = input.riskLevel;

    this.db
      .update(codeReviewsTable)
      .set(changes)
      .where(eq(codeReviewsTable.id, reviewId))
      .run();

    return this.detail(user, reviewId);
  }

  delete(user: CodeReviewUser, reviewId: string) {
    const row = this.ensureReview(reviewId);
    this.assertOwnerOrAdmin(row, user);
    this.db
      .delete(codeReviewsTable)
      .where(eq(codeReviewsTable.id, reviewId))
      .run();
    return { success: true, id: reviewId };
  }

  private parseGithubRepository(rawValue: string) {
    const value = rawValue.trim().replace(/\/$/g, '');
    const shorthand = value.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (shorthand) {
      return `${shorthand[1]}/${shorthand[2].replace(/\.git$/i, '')}`;
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('GitHub 저장소 형식이 아닙니다.');
    }

    if (url.hostname.toLowerCase() !== 'github.com') {
      throw new BadRequestException('github.com 저장소만 지원합니다.');
    }

    const [owner, repo] = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));

    if (!owner || !repo) {
      throw new BadRequestException('GitHub 저장소 구조를 확인해 주세요.');
    }

    return `${owner}/${repo.replace(/\.git$/i, '')}`;
  }

  private parseGithubSource(rawValue: string): ParsedGithubSource {
    const matchedUrl = rawValue.match(/https?:\/\/github\.com\/[^\s<>)\]]+/i)?.[0];
    const cleaned = (matchedUrl ?? rawValue)
      .trim()
      .replace(/[.,;!?]+$/g, '')
      .replace(/\/$/g, '');
    let url: URL;
    try {
      url = new URL(cleaned);
    } catch {
      throw new BadRequestException('GitHub URL 형식이 아닙니다.');
    }

    if (url.hostname.toLowerCase() !== 'github.com') {
      throw new BadRequestException('github.com URL만 지원합니다.');
    }

    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    const [owner, repo, typeSegment] = segments;
    if (!owner || !repo || !typeSegment) {
      throw new BadRequestException('GitHub 저장소 URL 구조를 확인해 주세요.');
    }

    const repository = `${owner}/${repo.replace(/\.git$/i, '')}`;
    const origin = `${url.protocol}//${url.hostname}`;

    if (typeSegment === 'commit' && segments[3]) {
      const sha = segments[3].replace(/\.diff$/i, '');
      const sourceUrl = `${origin}/${repository}/commit/${sha}`;
      return {
        sourceType: 'commit',
        sourceUrl,
        diffUrl: `${sourceUrl}.diff`,
        repository,
        reference: sha,
      };
    }

    if (typeSegment === 'pull' && segments[3]) {
      const pullNumber = segments[3].replace(/\.diff$/i, '');
      const sourceUrl = `${origin}/${repository}/pull/${pullNumber}`;
      return {
        sourceType: 'pr',
        sourceUrl,
        diffUrl: `${sourceUrl}.diff`,
        repository,
        reference: `#${pullNumber}`,
      };
    }

    if (typeSegment === 'compare' && segments[3]) {
      const compareRef = segments.slice(3).join('/').replace(/\.diff$/i, '');
      const sourceUrl = `${origin}/${repository}/compare/${compareRef}`;
      return {
        sourceType: 'compare',
        sourceUrl,
        diffUrl: `${sourceUrl}.diff`,
        repository,
        reference: compareRef,
      };
    }

    if (cleaned.endsWith('.diff')) {
      const sourceUrl = cleaned.replace(/\.diff$/i, '');
      return {
        sourceType: 'diff_url',
        sourceUrl,
        diffUrl: cleaned,
        repository,
        reference: 'diff',
      };
    }

    throw new BadRequestException(
      'commit, pull request, compare, .diff URL만 지원합니다.',
    );
  }

  private async fetchDiff(diffUrl: string) {
    const response = await fetch(diffUrl, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'towercrane-code-review',
      },
    });
    if (!response.ok) {
      throw new BadRequestException(
        `GitHub diff를 가져오지 못했습니다. 상태 코드: ${response.status}`,
      );
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new BadRequestException('GitHub diff가 비어 있습니다.');
    }
    if (text.length > MAX_DIFF_CHARS) {
      return text.slice(0, MAX_DIFF_CHARS);
    }
    return text;
  }

  private async attachGithubFileContext(
    source: ParsedGithubSource,
    files: ParsedDiffFile[],
  ): Promise<ParsedDiffFile[]> {
    const ref = await this.resolveGithubContentRef(source);
    if (!ref) return files;

    return Promise.all(
      files.map(async (file) => ({
        ...file,
        fullText: await this.fetchGithubFileText(source.repository, file.path, ref),
      })),
    );
  }

  private async resolveGithubContentRef(source: ParsedGithubSource) {
    if (source.sourceType === 'commit') return source.reference;

    if (source.sourceType === 'compare') {
      const headRef = source.reference.includes('...')
        ? source.reference.split('...').pop()
        : source.reference.split('..').pop();
      return headRef?.split(':').pop() ?? null;
    }

    if (source.sourceType === 'pr') {
      const pullNumber = source.reference.replace(/^#/, '');
      try {
        const response = await fetch(
          `https://api.github.com/repos/${source.repository}/pulls/${pullNumber}`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'towercrane-code-review',
            },
          },
        );
        if (!response.ok) return null;
        const data = (await response.json()) as { head?: { sha?: string } };
        return data.head?.sha ?? null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private async fetchGithubFileText(
    repository: string,
    path: string,
    ref: string,
  ) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repository}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'towercrane-code-review',
          },
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as {
        content?: string;
        encoding?: string;
        type?: string;
      };
      if (data.type !== 'file' || data.encoding !== 'base64' || !data.content) {
        return null;
      }

      return Buffer.from(data.content.replace(/\n/g, ''), 'base64')
        .toString('utf8')
        .slice(0, MAX_CONTEXT_FILE_CHARS);
    } catch {
      return null;
    }
  }

  private parseDiff(diff: string) {
    const lines = diff.split('\n');
    const files: ParsedDiffFile[] = [];
    let current: ParsedDiffFile | null = null;
    const pushCurrent = () => {
      if (current) files.push(current);
    };

    for (const line of lines) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        pushCurrent();
        current = {
          path: match[2],
          additions: 0,
          deletions: 0,
          reviewed: true,
          excludedReason: null,
          diff: `${line}\n`,
        };
        continue;
      }

      if (!current) continue;
      current.diff += `${line}\n`;
      if (line.startsWith('+') && !line.startsWith('+++')) current.additions += 1;
      if (line.startsWith('-') && !line.startsWith('---')) current.deletions += 1;
      const renameMatch = line.match(/^\+\+\+ b\/(.+)$/);
      if (renameMatch) current.path = renameMatch[1];
    }

    pushCurrent();

    if (files.length === 0) {
      throw new BadRequestException('파일 단위 diff를 찾지 못했습니다.');
    }

    return { files };
  }

  private applyDiffFileExclusion(file: ParsedDiffFile): ParsedDiffFile {
    const reason = this.exclusionReason(file);
    if (!reason) return file;
    return {
      ...file,
      reviewed: false,
      excludedReason: reason,
    };
  }

  private exclusionReason(file: ParsedDiffFile) {
    const path = file.path.toLowerCase();
    if (file.diff.length > MAX_FILE_DIFF_CHARS) return '파일 diff 크기 제한 초과';
    if (/(^|\/)(dist|build|coverage|node_modules)\//.test(path)) {
      return '빌드 산출물 또는 외부 의존성';
    }
    if (/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/.test(path)) {
      return '락 파일';
    }
    if (/\.(min\.js|map|snap)$/i.test(path)) return '생성 파일 패턴';
    if (/generated|__generated__|\.generated\./i.test(path)) {
      return '생성 파일 패턴';
    }
    return null;
  }

  private async reviewDiff(
    source: ParsedGithubSource,
    reviewedFiles: ParsedDiffFile[],
    excludedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    repositoryUrl: string,
    reviewGoal: string,
  ): Promise<CodeReviewAnalysis> {
    if (this.openai) {
      const llmReview = await this.tryReviewDiffWithOpenAI(
        source,
        reviewedFiles,
        excludedFiles,
        sections,
        repositoryUrl,
        reviewGoal,
      );
      if (llmReview) return llmReview;
    }
    return this.reviewDiffWithHeuristics(
      source,
      reviewedFiles,
      excludedFiles,
      sections,
      reviewGoal,
    );
  }

  private async tryReviewDiffWithOpenAI(
    source: ParsedGithubSource,
    reviewedFiles: ParsedDiffFile[],
    excludedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    repositoryUrl: string,
    reviewGoal: string,
  ): Promise<CodeReviewAnalysis | null> {
    try {
      const model =
        this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini';
      const diff = reviewedFiles
        .map((file) => file.diff)
        .join('\n')
        .slice(0, MAX_LLM_DIFF_CHARS);
      const response = await this.openai!.chat.completions.create({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              `너는 실무 코드 리뷰어다. 한국어 JSON만 출력한다. selectedSections에 포함된 관점만 작성한다. 테스트 공백은 보조 확인으로만 다루고, 테스트 부재만으로 위험도를 높이지 않는다.\n\n${codeReviewStyleGuide}`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              repository: source.repository,
              repositoryUrl,
              sourceType: source.sourceType,
              sourceUrl: source.sourceUrl,
              reviewUnit:
                source.sourceType === 'commit'
                  ? 'single_commit'
                  : source.sourceType,
              sourceInstruction:
                source.sourceType === 'commit'
                  ? '이 요청은 단일 커밋 리뷰다. reviewedFiles는 해당 커밋 diff에서 파싱한 변경 파일 목록이므로 변경 파일 구조, 주요 프로세스, 주요 로직은 이 변경 파일과 reviewGoal을 기준으로만 작성한다.'
                  : '이 요청은 commit이 아닌 GitHub diff 리뷰다. reviewedFiles에서 기능 단위를 먼저 좁힌 뒤 reviewGoal과 직접 관련된 변경만 중심으로 작성한다.',
              reviewGoal,
              reviewInstruction:
                reviewGoal.length > 0
                  ? 'reviewGoal을 최우선 기준으로 삼아 diff에서 해당 기능 흐름만 추적한다. reviewGoal과 직접 관련 없는 일반론은 쓰지 않는다.'
                  : 'diff에서 변경 의도를 먼저 추론하고, 그 기능 흐름과 직접 관련된 내용만 작성한다.',
              reviewedFiles: reviewedFiles.map(
                ({ diff: _diff, fullText: _fullText, ...file }) => file,
              ),
              excludedFiles: excludedFiles.map(({ diff: _diff, ...file }) => file),
              selectedSections: sections,
              requiredShape: {
                title: 'string',
                summary: 'string',
                riskLevel: 'low | medium | high',
                findings:
                  'array of {category: structure | process | code | syntax | architecture | clean_code | diagram | risk, severity, title, body, filePath, lineNumber, recommendation}',
                testGaps:
                  'string[] for auxiliary verification only. Do not make missing tests the main review result.',
              },
              bodyFormat: {
                structure:
                  'plain text file tree only. No prose in body.',
                process:
                  'numbered overview steps only. No code block.',
                code:
                  'repeat topic blocks only in this order: topic title with code role/name in parentheses, fenced core code, short explanation.',
                syntax:
                  'write "핵심 문법 없음." if there is no syntax/pattern worth explaining. Otherwise repeat only in this order: core syntax or pattern name, fenced related code, supplemental explanation. Do not add file path prose.',
                architecture:
                  'short evaluation of boundaries, responsibilities, size, duplication, naming, maintainability.',
                diagram:
                  'raw Mermaid only, must start with flowchart TD, no code fence and no prose.',
              },
              reviewFocus: [
                '변경 파일 구조: reviewedFiles에 포함된 실제 변경 파일만 plain text folder tree로 작성',
                '주요 프로세스: 코드 없이 대략적인 처리 흐름만 작성',
                '주요 로직: 구현 주제 제목을 먼저 쓰고 괄호 안에 역할 타입과 함수명을 보조로 작성. 코드, 설명 순서로 작성',
                '핵심 문법: 기술/패턴 이름, 관련 코드, 보충 설명 순서로만 작성. React Query, Zod, NestJS, Drizzle, 상태 파생 조건처럼 diff 이해에 필요한 핵심 문법만 작성. import/type-only 선언 금지',
                '아키텍처/클린코드 평가: 레이어 분리, 모듈 경계, 파일 크기, 중복, 명명, 유지보수성 평가',
                'mmd 흐름도: 선택된 경우 body는 반드시 flowchart TD로 시작하는 Mermaid 문법만 작성. 설명문, 권장문, 코드펜스는 넣지 않음',
              ],
              diff,
            }),
          },
        ],
      });
      const content = response.choices[0]?.message.content;
      if (!content) return null;
      const parsed = JSON.parse(content) as Partial<CodeReviewAnalysis>;
      return this.normalizeAnalysis(
        parsed,
        model,
        source,
        reviewedFiles,
        excludedFiles,
        sections,
        reviewGoal,
      );
    } catch {
      return null;
    }
  }

  private reviewDiffWithHeuristics(
    source: ParsedGithubSource,
    reviewedFiles: ParsedDiffFile[],
    excludedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[] = [
      'structure',
      'process',
      'code',
      'syntax',
      'architecture',
    ],
    reviewGoal = '',
  ): CodeReviewAnalysis {
    const findings: CodeReviewFinding[] = [];
    const selectedSectionSet = new Set(sections);
    const shouldRunRiskChecks =
      selectedSectionSet.has('code') || selectedSectionSet.has('architecture');
    const addFinding = (
      category: CodeReviewFindingCategory,
      severity: CodeReviewFinding['severity'],
      title: string,
      body: string,
      file: ParsedDiffFile | null,
      pattern: RegExp,
      recommendation: string,
    ) => {
      const lineNumber = file ? this.findAddedLineNumber(file.diff, pattern) : null;
      findings.push({
        category,
        severity,
        title,
        body,
        filePath: file?.path ?? null,
        lineNumber,
        recommendation,
      });
    };

    for (const file of reviewedFiles) {
      const addedText = this.extractAddedText(file.diff);
      if (
        shouldRunRiskChecks &&
        /dangerouslySetInnerHTML|innerHTML\s*=|eval\s*\(/.test(addedText)
      ) {
        addFinding(
          'risk',
          'high',
          '동적 HTML/스크립트 실행 위험',
          '추가된 코드에 HTML 직접 주입 또는 동적 실행 패턴이 있습니다. 입력값 경계가 명확하지 않으면 XSS 또는 임의 실행 위험으로 이어질 수 있습니다.',
          file,
          /dangerouslySetInnerHTML|innerHTML\s*=|eval\s*\(/,
          '입력값을 신뢰하지 말고 sanitizer 또는 안전한 렌더링 API로 대체하세요.',
        );
      }
      if (
        shouldRunRiskChecks &&
        /(password|secret|api[_-]?key|token)\s*[:=]/i.test(addedText)
      ) {
        addFinding(
          'risk',
          'high',
          '민감정보 하드코딩 의심',
          '추가된 코드에 비밀번호, 토큰, API 키로 보이는 값 할당 패턴이 있습니다.',
          file,
          /(password|secret|api[_-]?key|token)\s*[:=]/i,
          '민감정보는 환경변수나 비밀 관리 저장소로 분리하고 저장소 기록 노출 여부를 확인하세요.',
        );
      }
      if (
        selectedSectionSet.has('code') &&
        /catch\s*\(\s*\w*\s*\)\s*{\s*}|catch\s*{\s*}/.test(addedText)
      ) {
        addFinding(
          'code',
          'medium',
          '빈 catch 블록',
          '오류를 삼키는 catch 블록은 장애 원인 추적과 사용자 피드백을 어렵게 만듭니다.',
          file,
          /catch\s*\(\s*\w*\s*\)\s*{\s*}|catch\s*{\s*}/,
          '최소한 로깅, 사용자 메시지, 재시도 여부 중 하나를 명시하세요.',
        );
      }
      if (
        selectedSectionSet.has('architecture') &&
        /console\.(log|debug|info)\s*\(/.test(addedText)
      ) {
        addFinding(
          'clean_code',
          'low',
          '디버그 로그 잔존',
          '추가된 코드에 console 로그가 남아 있습니다. 운영 화면 또는 서버 로그 품질에 영향을 줄 수 있습니다.',
          file,
          /console\.(log|debug|info)\s*\(/,
          '의도한 운영 로그가 아니라면 제거하고, 필요하면 프로젝트 로거로 전환하세요.',
        );
      }
      if (
        selectedSectionSet.has('syntax') &&
        /\bany\b/.test(addedText) &&
        /\.(ts|tsx)$/.test(file.path)
      ) {
        addFinding(
          'syntax',
          'low',
          'any 타입 추가',
          'TypeScript 변경에 any 타입이 추가되어 계약이 느슨해질 수 있습니다.',
          file,
          /\bany\b/,
          '입력/응답 경계 타입을 좁히거나 unknown 후 검증하는 방식으로 바꾸는 것을 검토하세요.',
        );
      }
    }

    const changedFileCount = reviewedFiles.length + excludedFiles.length;
    const changedPaths = reviewedFiles.map((file) => file.path.toLowerCase());
    findings.push(
      ...this.buildStructuralReviewFindings(reviewedFiles, sections, reviewGoal),
    );

    const hasTestChange = changedPaths.some((path) =>
      /(^|\/)(__tests__|test|tests|spec)(\/|\.|-)|\.(test|spec)\.(ts|tsx|js|jsx)$/.test(path),
    );
    const testGaps = hasTestChange
      ? []
      : [
          '보조 확인: 자동화 테스트 변경은 diff에서 보이지 않습니다. URL 분석, 저장, 상세 조회처럼 사용자가 직접 타는 주요 경로는 수동 검증하거나 회귀 테스트를 보강하세요.',
        ];
    if (changedFileCount > 12) {
      testGaps.push(
        '보조 확인: 변경 파일 수가 많으므로 기능별 체크리스트로 URL 분석, 중복 저장, 상세 표시, 채팅 카드 렌더링을 나눠 확인하는 것이 좋습니다.',
      );
    }

    const riskLevel: CodeReviewRiskLevel =
      findings.some((finding) => finding.severity === 'high')
        ? 'high'
        : findings.some((finding) => finding.severity === 'medium') ||
            changedFileCount > 8
          ? 'medium'
          : 'low';

    return {
      title: `${source.repository} ${source.reference} 코드 리뷰`,
      summary:
        findings.length > 0
          ? `리뷰 가능한 파일 ${reviewedFiles.length}개를 선택한 ${sections.length}개 관점으로 평가했습니다. 평가 항목은 ${findings.length}개입니다.`
          : `리뷰 가능한 파일 ${reviewedFiles.length}개 기준으로 구조적 평가 항목을 만들지 못했습니다.`,
      riskLevel,
      findings: findings.slice(0, 12),
      testGaps,
      model: 'local-heuristic',
    };
  }

  private normalizeAnalysis(
    input: Partial<CodeReviewAnalysis>,
    model: string,
    source: ParsedGithubSource,
    reviewedFiles: ParsedDiffFile[],
    excludedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[] = [
      'structure',
      'process',
      'code',
      'syntax',
      'architecture',
    ],
    reviewGoal = '',
  ): CodeReviewAnalysis {
    const allowedRisks = new Set(['low', 'medium', 'high']);
    const allowedSeverities = new Set(['low', 'medium', 'high']);
    const allowedCategories = new Set([
      'process',
      'code',
      'syntax',
      'structure',
      'architecture',
      'clean_code',
      'diagram',
      'risk',
    ]);
    const selectedSectionSet = new Set(sections);
    const categoryAllowedByRequest = (category: CodeReviewFindingCategory) => {
      if (category === 'clean_code') return selectedSectionSet.has('architecture');
      if (category === 'risk') {
        return selectedSectionSet.has('code') || selectedSectionSet.has('architecture');
      }
      return selectedSectionSet.has(category as CodeReviewSection);
    };
    let findings: CodeReviewFinding[] = Array.isArray(input.findings)
      ? input.findings
          .filter((finding) => finding && typeof finding === 'object')
          .map((finding) => ({
            category: allowedCategories.has(finding.category ?? '')
              ? (finding.category as CodeReviewFindingCategory)
              : 'code',
            severity: allowedSeverities.has(finding.severity)
              ? finding.severity
              : 'low',
            title: String(finding.title ?? '검토 항목').slice(0, 160),
            body: String(finding.body ?? '').slice(0, 12000),
            filePath:
              typeof finding.filePath === 'string' ? finding.filePath : null,
            lineNumber:
              typeof finding.lineNumber === 'number' && finding.lineNumber > 0
                ? Math.floor(finding.lineNumber)
                : null,
            recommendation: String(finding.recommendation ?? '수정 방향을 검토하세요.').slice(0, 4000),
          }))
          .filter((finding) => finding.body)
          .filter((finding) =>
            categoryAllowedByRequest(finding.category as CodeReviewFindingCategory),
          )
          .slice(0, 12)
      : [];
    const fallback = this.reviewDiffWithHeuristics(
      source,
      reviewedFiles,
      excludedFiles,
      sections,
      reviewGoal,
    );
    findings = this.ensureStructureFinding(findings, reviewedFiles, sections);
    findings = this.ensureProcessFinding(findings, reviewedFiles, sections, reviewGoal);
    findings = this.ensureLogicFinding(findings, reviewedFiles, sections, reviewGoal);
    findings = this.ensureSyntaxFinding(findings, reviewedFiles, sections);
    findings = this.ensureArchitectureFinding(findings, reviewedFiles, sections, reviewGoal);
    findings = this.ensureDiagramFinding(findings, reviewedFiles, sections, reviewGoal);

    return {
      title:
        typeof input.title === 'string' && input.title.trim()
          ? input.title.trim().slice(0, 180)
          : fallback.title,
      summary:
        typeof input.summary === 'string' && input.summary.trim()
          ? input.summary.trim().slice(0, 12000)
          : fallback.summary,
      riskLevel: allowedRisks.has(input.riskLevel ?? '')
        ? (input.riskLevel as CodeReviewRiskLevel)
        : fallback.riskLevel,
      findings: findings.length > 0 ? findings : fallback.findings,
      testGaps:
        Array.isArray(input.testGaps) && input.testGaps.length > 0
          ? input.testGaps.map((item) => String(item).slice(0, 1000)).slice(0, 8)
          : fallback.testGaps,
      model,
    };
  }

  private ensureStructureFinding(
    findings: CodeReviewFinding[],
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
  ): CodeReviewFinding[] {
    if (!sections.includes('structure')) return findings;

    const structureFinding: CodeReviewFinding = {
      category: 'structure',
      severity: 'low',
      title: '1. 변경 파일 구조',
      body: this.formatChangedFileTree(reviewedFiles),
      filePath: null,
      lineNumber: null,
      recommendation:
        '이 트리를 기준으로 변경 범위가 기능 단위로 모였는지, 프론트/서버/DB 연결 파일이 한 흐름으로 묶이는지 확인하세요.',
    };
    const withoutStructure = findings.filter(
      (finding) => finding.category !== 'structure',
    );

    return [structureFinding, ...withoutStructure];
  }

  private ensureDiagramFinding(
    findings: CodeReviewFinding[],
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    reviewGoal = '',
  ): CodeReviewFinding[] {
    if (!sections.includes('diagram')) return findings;
    const intent = this.detectReviewIntent(reviewedFiles, reviewGoal);

    const diagramFinding: CodeReviewFinding = {
      category: 'diagram',
      severity: 'low',
      title: '6. mmd 흐름도',
      body: this.buildReviewMermaidFlowchart(reviewedFiles, reviewGoal),
      filePath: null,
      lineNumber: null,
      recommendation:
        intent === 'delete'
          ? '이 흐름도를 기준으로 삭제 권한, 삭제 차단 조건, mutation 성공 후 목록 갱신이 이어지는지 확인하세요.'
          : intent === 'update'
            ? '이 흐름도를 기준으로 수정 버튼 노출, 초기값 세팅, 변경 검증, update mutation, 목록 갱신이 이어지는지 확인하세요.'
            : '이 흐름도를 기준으로 사용자 입력, API 처리, 저장, 화면 반영 단계의 책임 경계를 확인하세요.',
    };
    const withoutDiagram = findings.filter(
      (finding) => finding.category !== 'diagram',
    );

    return [...withoutDiagram, diagramFinding];
  }

  private ensureProcessFinding(
    findings: CodeReviewFinding[],
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    reviewGoal = '',
  ): CodeReviewFinding[] {
    if (!sections.includes('process')) return findings;
    const intent = this.detectReviewIntent(reviewedFiles, reviewGoal);

    const processFinding: CodeReviewFinding = {
      category: 'process',
      severity: this.hasFullStackChange(reviewedFiles) ? 'medium' : 'low',
      title: '2. 주요 프로세스',
      body: this.formatProcessOverview(reviewedFiles, reviewGoal),
      filePath: this.pickTopChangedFiles(reviewedFiles, 1)[0]?.path ?? null,
      lineNumber: null,
      recommendation:
        intent === 'delete'
          ? '삭제 버튼 노출, 확인 다이얼로그, 삭제 차단 조건, mutation 성공 후 목록 갱신이 실제 화면에서 끊기지 않는지 확인하세요.'
          : intent === 'update'
            ? '수정 버튼 노출, 기존 값 초기화, 변경 검증, update mutation, 캐시 갱신이 실제 화면에서 끊기지 않는지 확인하세요.'
            : '입력, 분석, 저장, 조회, 화면 반영 흐름이 실제 사용자 경로에서 끊기지 않는지 확인하세요.',
    };
    const withoutProcess = findings.filter(
      (finding) => finding.category !== 'process',
    );

    return [...withoutProcess, processFinding];
  }

  private ensureLogicFinding(
    findings: CodeReviewFinding[],
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    reviewGoal = '',
  ): CodeReviewFinding[] {
    if (!sections.includes('code')) return findings;
    const intent = this.detectReviewIntent(reviewedFiles, reviewGoal);

    const logicFinding: CodeReviewFinding = {
      category: 'code',
      severity: this.hasLargeChange(reviewedFiles) ? 'medium' : 'low',
      title: '3. 주요 로직',
      body: this.formatLogicWalkthrough(reviewedFiles, reviewGoal),
      filePath: this.pickTopChangedFiles(reviewedFiles, 1)[0]?.path ?? null,
      lineNumber: null,
      recommendation:
        intent === 'delete'
          ? '삭제 확인 UI와 실제 delete mutation 사이에 권한/차단 조건이 중복되거나 빠지지 않았는지 확인하세요.'
          : intent === 'update'
            ? '카드 권한 분기, 다이얼로그 폼 상태, submit mutation 책임이 과도하게 한곳에 섞이지 않는지 확인하세요.'
            : '실행 흐름의 각 함수가 입력 검증, 외부 호출, 상태 갱신, 저장 책임을 과도하게 함께 갖지 않는지 확인하세요.',
    };
    const withoutLogic = findings.filter((finding) => finding.category !== 'code');

    return [...withoutLogic, logicFinding];
  }

  private ensureSyntaxFinding(
    findings: CodeReviewFinding[],
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
  ): CodeReviewFinding[] {
    if (!sections.includes('syntax')) return findings;

    const syntaxBody = this.formatSyntaxWalkthrough(reviewedFiles);

    const syntaxFinding: CodeReviewFinding = {
      category: 'syntax',
      severity: 'low',
      title: '4. 핵심 문법',
      body: syntaxBody,
      filePath: null,
      lineNumber: null,
      recommendation:
        syntaxBody === '핵심 문법 없음.'
          ? '이번 diff에서는 별도 문법 해설보다 주요 프로세스와 주요 로직을 우선 확인하세요.'
          : '핵심 문법이 런타임 검증, 서버 상태, 라우팅, DB 저장 계약과 같은 의미를 유지하는지 확인하세요.',
    };
    const withoutSyntax = findings.filter(
      (finding) => finding.category !== 'syntax',
    );

    return [...withoutSyntax, syntaxFinding];
  }

  private ensureArchitectureFinding(
    findings: CodeReviewFinding[],
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    reviewGoal = '',
  ): CodeReviewFinding[] {
    if (!sections.includes('architecture')) return findings;
    const intent = this.detectReviewIntent(reviewedFiles, reviewGoal);
    const largeFiles = reviewedFiles.filter(
      (file) => file.additions + file.deletions >= 250,
    );

    const architectureFinding: CodeReviewFinding = {
      category: 'architecture',
      severity: largeFiles.length > 0 ? 'medium' : 'low',
      title: '5. 아키텍처/클린코드 평가',
      body: this.formatArchitectureAssessment(reviewedFiles, reviewGoal),
      filePath: largeFiles[0]?.path ?? this.pickTopChangedFiles(reviewedFiles, 1)[0]?.path ?? null,
      lineNumber: null,
      recommendation:
        intent === 'update'
          ? '수정 기능이 카드 표시 책임, 다이얼로그 폼 책임, mutation 호출 책임으로 읽히는지 확인하세요.'
          : intent === 'delete'
            ? '삭제 기능이 카드 표시 책임, 확인/차단 책임, mutation 호출 책임으로 읽히는지 확인하세요.'
            : '요청한 리뷰 범위 안에서 책임 분리, 파일 크기, 중복, 명명, 유지보수성을 확인하세요.',
    };
    const withoutArchitecture = findings.filter(
      (finding) =>
        finding.category !== 'architecture' && finding.category !== 'clean_code',
    );

    return [...withoutArchitecture, architectureFinding];
  }

  private buildStructuralReviewFindings(
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
    reviewGoal = '',
  ): CodeReviewFinding[] {
    const selectedSectionSet = new Set(sections);
    const filesByPath = [...reviewedFiles].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    const topFiles = [...reviewedFiles]
      .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
      .slice(0, 6);
    const changedPaths = filesByPath.map((file) => file.path);
    const hasFrontend = changedPaths.some((path) =>
      path.includes('towercrane-for-uiux-front/src/'),
    );
    const hasServer = changedPaths.some((path) =>
      path.includes('towercrane-for-uiux-server/src/'),
    );
    const hasDatabase = changedPaths.some((path) =>
      /database\/(schema|database\.service)\.ts$/.test(path),
    );
    const hasRouter = changedPaths.some((path) => path.endsWith('/router.tsx'));
    const hasPage = changedPaths.some((path) => path.includes('/pages/'));
    const hasService = changedPaths.some((path) => path.endsWith('.service.ts'));
    const hasSchema = changedPaths.some((path) => path.endsWith('.schemas.ts'));
    const hasReactQuery = changedPaths.some((path) => path.includes('/api/'));
    const shouldIncludeDiagram =
      selectedSectionSet.has('diagram') &&
      ((hasFrontend && hasServer && hasDatabase) ||
        changedPaths.some((path) => path.includes('/dev-management/')) ||
        reviewedFiles.length >= 8);
    const largeFiles = topFiles.filter(
      (file) => file.additions + file.deletions >= 250,
    );

    const findings: CodeReviewFinding[] = [];

    if (selectedSectionSet.has('structure')) {
      findings.push({
        category: 'structure',
        severity: 'low',
        title: '1. 변경 파일 구조',
        body: this.formatChangedFileTree(filesByPath),
        filePath: null,
        lineNumber: null,
        recommendation:
          '변경 파일을 기능 단위로 볼 때 서버 API/DB, 프론트 entity/page, 라우터/헤더 연결이 한 흐름으로 묶이는지 먼저 확인하세요.',
      });
    }

    if (selectedSectionSet.has('process')) {
      findings.push({
        category: 'process',
        severity: hasFrontend && hasServer ? 'medium' : 'low',
        title: '2. 주요 프로세스',
        body: this.formatProcessOverview(reviewedFiles, reviewGoal),
        filePath: topFiles[0]?.path ?? null,
        lineNumber: null,
        recommendation:
          'URL 입력 -> 분석 API -> 저장 -> 목록/상세 표시 -> 채팅 카드 진입 경로를 실제 사용자 플로우로 검증하세요.',
      });
    }

    if (selectedSectionSet.has('code')) {
      findings.push({
        category: 'code',
        severity: this.hasLargeChange(topFiles) ? 'medium' : 'low',
        title: '3. 주요 로직',
        body: this.formatLogicWalkthrough(reviewedFiles, reviewGoal),
        filePath: topFiles[0]?.path ?? null,
        lineNumber: null,
        recommendation:
          '가장 큰 변경 파일부터 입력 검증, 예외 처리, 중복 저장, 상태 갱신, 권한 체크가 한 책임 안에 과도하게 섞이지 않았는지 확인하세요.',
      });
    }

    if (selectedSectionSet.has('syntax')) {
      findings.push({
        category: 'syntax',
        severity: 'low',
        title: '4. 핵심 문법',
        body: this.formatSyntaxWalkthrough(reviewedFiles),
        filePath: null,
        lineNumber: null,
        recommendation:
          '런타임 payload는 Zod, DB JSON 타입, 프론트 타입이 같은 필드명과 nullability를 공유하는지 맞춰 보세요.',
      });
    }

    if (selectedSectionSet.has('architecture')) {
      findings.push({
        category: 'architecture',
        severity: largeFiles.length > 0 ? 'medium' : 'low',
        title: '5. 아키텍처/클린코드 평가',
        body: this.formatArchitectureAssessment(reviewedFiles, reviewGoal),
        filePath: largeFiles[0]?.path ?? null,
        lineNumber: null,
        recommendation:
          '요청한 리뷰 범위 안에서 책임 분리, 파일 크기, 중복, 명명, 유지보수성을 확인하세요.',
      });
    }

    if (shouldIncludeDiagram) {
      findings.push({
        category: 'diagram',
        severity: 'low',
        title: '6. mmd 흐름도',
        body: this.buildReviewMermaidFlowchart(reviewedFiles, reviewGoal),
        filePath: null,
        lineNumber: null,
        recommendation:
          '흐름이 복잡한 변경에서는 이 다이어그램을 기준으로 실패 지점과 상태 전이를 하나씩 대조하세요.',
      });
    }

    return findings;
  }

  private formatLogicWalkthrough(files: ParsedDiffFile[], reviewGoal = '') {
    const candidates = this.pickFlowFiles(files, 4);
    if (candidates.length === 0) {
      return '리뷰 가능한 변경 파일이 없어 단계별 주요 로직을 만들 수 없습니다.';
    }
    const intent = this.detectReviewIntent(files, reviewGoal);
    if (intent === 'delete') {
      const deleteLogic = this.formatDeleteLogicWalkthrough(candidates);
      if (deleteLogic) return deleteLogic;
    }
    if (intent === 'update') {
      const updateLogic = this.formatUpdateLogicWalkthrough(candidates);
      if (updateLogic) return updateLogic;
    }

    return candidates
      .map((file, index) => {
        const symbol = this.findChangedSymbol(file);
        const snippet = this.extractReviewSnippet(
          file,
          this.logicPatternsForPath(file.path),
          8,
        );

        return [
          `단계 ${index + 1}. ${this.logicStepTitle(symbol, file.path, intent)} (${this.logicSubjectLabel(symbol, file.path)})`,
          '',
          '핵심 코드:',
          '',
          `\`\`\`${this.languageForPath(file.path)}`,
          this.withSnippetComment(snippet, this.logicCodeComment(file.path, intent, symbol)),
          '```',
          '',
          `설명: ${this.logicExplanation(file.path, intent, symbol)}`,
        ].join('\n');
      })
      .join('\n\n');
  }

  private formatDeleteLogicWalkthrough(files: ParsedDiffFile[]) {
    const blocks: string[] = [];
    const cardFile = files.find((file) =>
      /DeleteWorkspaceDialog|Trash2|canManage/.test(this.extractAddedText(file.diff)),
    );
    if (!cardFile) return null;

    const cardSnippet = this.extractReviewSnippet(
      cardFile,
      [/canManage|DeleteWorkspaceDialog|삭제 권한 없음|Trash2/],
      18,
    );
    blocks.push(
      [
        '단계 1. 삭제 버튼 UI (함수 컴포넌트: PrototypeWorkspaceCard)',
        '',
        '핵심 코드:',
        '',
        `\`\`\`${this.languageForPath(cardFile.path)}`,
        this.withSnippetComment(
          cardSnippet,
          '소유자 권한을 기준으로 삭제 액션 노출 여부를 결정',
        ),
        '```',
        '',
        '설명: 카드에서 소유자 여부를 판단해 삭제 다이얼로그를 노출하고, 권한이 없으면 비활성 삭제 버튼으로 상태를 알려주는 로직입니다.',
      ].join('\n'),
    );

    const dialogSnippet = this.extractReviewSnippet(
      cardFile,
      [/function\s+DeleteWorkspaceDialog|const\s+onDelete|deleteWorkspace\.mutateAsync|hasCategories/],
      14,
    );
    if (dialogSnippet && dialogSnippet !== cardSnippet) {
      blocks.push(
        [
          '단계 2. 삭제 확인 다이얼로그 (함수 컴포넌트: DeleteWorkspaceDialog)',
          '',
          '핵심 코드:',
          '',
          `\`\`\`${this.languageForPath(cardFile.path)}`,
          this.withSnippetComment(
            dialogSnippet,
            '삭제 확인, 삭제 차단 조건, delete mutation 실행을 한 다이얼로그에서 처리',
          ),
          '```',
          '',
          '설명: 삭제 확인 다이얼로그의 열림 상태, 카테고리 존재 시 삭제 차단, delete mutation 실행, 실패 메시지 표시를 담당합니다.',
        ].join('\n'),
      );
    }

    return blocks.join('\n\n');
  }

  private formatUpdateLogicWalkthrough(files: ParsedDiffFile[]) {
    const workspaceFile = files.find((file) =>
      /EditWorkspaceDialog|useUpdatePrototypeWorkspace|Pencil/.test(
        this.extractAddedText(file.diff),
      ),
    );
    if (!workspaceFile) return null;
    const language = this.languageForPath(workspaceFile.path);

    return [
      [
        '단계 1. 수정 버튼 UI (함수 컴포넌트: PrototypeWorkspaceCard)',
        '',
        '핵심 코드:',
        '',
        `\`\`\`${language}`,
        [
          '// 소유자에게만 수정/삭제 액션 노출',
          "const canManage = workspace.role === 'owner'",
          '{canManage ? (',
          '  <>',
          '    <EditWorkspaceDialog workspace={workspace} />',
          '    <DeleteWorkspaceDialog workspace={workspace} />',
          '  </>',
          ') : (',
          '  <Button title="소유자만 수정할 수 있습니다" disabled>',
          '    <Pencil className="size-3.5" />',
          '  </Button>',
          ')}',
        ].join('\n'),
        '```',
        '',
        '설명: 카드에서 소유자 권한을 기준으로 수정 다이얼로그를 노출하고, 권한이 없으면 수정 버튼을 비활성 상태로 보여줍니다.',
      ].join('\n'),
      [
        '단계 2. 수정 폼 상태와 저장 가능 조건 (함수 컴포넌트: EditWorkspaceDialog)',
        '',
        '핵심 코드:',
        '',
        `\`\`\`${language}`,
        [
          '// 기존 워크스페이스 값을 폼 초기값으로 사용',
          "const [name, setName] = useState(workspace.name)",
          "const [description, setDescription] = useState(workspace.description ?? '')",
          'const updateWorkspace = useUpdatePrototypeWorkspace(workspace.id)',
          '// 이름이 유효하고 실제 변경이 있을 때만 저장 허용',
          'const canSubmit =',
          '  name.trim().length >= 2 &&',
          '  (name.trim() !== workspace.name ||',
          "    description.trim() !== (workspace.description ?? ''))",
        ].join('\n'),
        '```',
        '',
        '설명: 다이얼로그가 열릴 때 기존 값을 폼 상태로 옮기고, 이름 길이와 실제 변경 여부를 저장 조건으로 계산합니다.',
      ].join('\n'),
      [
        '단계 3. 수정 저장 요청 (이벤트 핸들러: onSubmit)',
        '',
        '핵심 코드:',
        '',
        `\`\`\`${language}`,
        [
          '// 정리된 값만 update mutation으로 전송',
          'await updateWorkspace.mutateAsync({',
          '  name: name.trim(),',
          '  description: description.trim() || null,',
          '})',
          '// 저장 성공 후 다이얼로그 닫기',
          'setOpen(false)',
        ].join('\n'),
        '```',
        '',
        '설명: 검증된 이름과 설명만 update mutation으로 보내고, 성공하면 다이얼로그를 닫습니다. 목록 갱신은 React Query 훅의 invalidateQueries가 담당합니다.',
      ].join('\n'),
    ].join('\n\n');
  }

  private formatProcessOverview(files: ParsedDiffFile[], reviewGoal = '') {
    const intent = this.detectReviewIntent(files, reviewGoal);
    if (intent === 'delete') {
      return [
        '1. 워크스페이스 카드에서 삭제 액션을 노출합니다.',
        '2. 소유자 권한이 없으면 삭제 버튼을 비활성 상태로 표시합니다.',
        '3. 삭제 버튼을 누르면 확인 다이얼로그를 열고 삭제 가능 조건을 확인합니다.',
        '4. 카테고리가 남아 있으면 삭제 실행을 막고 안내 문구를 보여줍니다.',
        '5. 삭제 가능하면 delete mutation을 실행하고 성공 후 목록을 갱신합니다.',
      ].join('\n');
    }
    if (intent === 'update') {
      return [
        '1. 워크스페이스 카드에서 소유자에게 수정 버튼을 노출합니다.',
        '2. 수정 버튼을 누르면 EditWorkspaceDialog를 열고 기존 이름/설명을 폼 상태로 채웁니다.',
        '3. 이름 길이와 실제 변경 여부를 확인해 저장 버튼 활성 여부를 결정합니다.',
        '4. 저장 시 useUpdatePrototypeWorkspace mutation으로 이름/설명을 전송합니다.',
        '5. 성공하면 다이얼로그를 닫고 React Query 캐시 무효화로 워크스페이스 목록을 갱신합니다.',
      ].join('\n');
    }
    if (intent === 'create') {
      return [
        '1. 화면에서 생성 액션을 선택합니다.',
        '2. 생성 폼 입력값을 검증합니다.',
        '3. create mutation을 실행해 새 데이터를 저장합니다.',
        '4. 성공 시 폼을 닫고 목록 캐시를 갱신합니다.',
      ].join('\n');
    }

    const changedPaths = files.map((file) => file.path);
    const steps = [
      changedPaths.some((path) => path.includes('/pages/'))
        ? '1. 화면에서 사용자가 변경된 기능을 실행합니다.'
        : null,
      changedPaths.some((path) => path.includes('/api/'))
        ? '2. 프론트 API 계층이 분석 요청과 목록/상세 조회를 서버 계약으로 연결합니다.'
        : null,
      changedPaths.some((path) => path.includes('code-reviews.service.ts'))
        ? '3. 서버 서비스가 GitHub diff와 파일 컨텍스트를 수집하고 리뷰 항목을 정규화합니다.'
        : null,
      changedPaths.some((path) => path.includes('/database/'))
        ? '4. 분석 결과는 DB 스키마의 코드 리뷰 저장 구조에 맞춰 보관됩니다.'
        : null,
      changedPaths.some((path) => path.includes('/router') || path.includes('/app-header/'))
        ? '5. 라우터/헤더 연결을 통해 저장된 리뷰 목록과 상세 화면으로 진입합니다.'
        : null,
    ].filter(Boolean);

    return steps.length > 0
      ? steps.join('\n')
      : '1. 변경 파일을 기준으로 사용자 액션, 상태 변경, 서버 요청, 화면 반영 흐름을 확인합니다.';
  }

  private formatSyntaxWalkthrough(files: ParsedDiffFile[]) {
    const candidates = this.pickSyntaxFiles(files, 2);
    if (candidates.length === 0) {
      return '핵심 문법 없음.';
    }

    return candidates
      .map((file, index) => {
        const focus = this.detectSyntaxFocus(file);
        const snippet = this.extractReviewSnippet(file, focus.patterns);

        return [
          `문법 ${index + 1}. ${focus.label}`,
          '',
          '관련 코드:',
          '',
          `\`\`\`${this.languageForPath(file.path)}`,
          snippet,
          '```',
          '',
          `보충 설명: ${focus.explanation}`,
        ].join('\n');
      })
      .join('\n\n');
  }

  private formatArchitectureAssessment(files: ParsedDiffFile[], reviewGoal = '') {
    const intent = this.detectReviewIntent(files, reviewGoal);
    const changedPaths = files.map((file) => file.path);
    const largeFiles = files.filter((file) => file.additions + file.deletions >= 250);

    if (intent === 'update') {
      return [
        '카드 컴포넌트는 수정 버튼 노출과 열기 액션만 담당하고, 실제 수정 폼은 EditWorkspaceDialog로 분리되어 읽기 쉽습니다.',
        '기존 서버 PATCH API와 useUpdatePrototypeWorkspace 훅을 재사용하므로 새 서버 계약을 만들지 않고 수정 기능을 연결한 점은 적절합니다.',
        largeFiles.length > 0
          ? '다만 카드, 삭제 다이얼로그, 수정 다이얼로그가 한 파일에 계속 쌓이고 있어 이후 워크스페이스 관리 액션이 늘면 다이얼로그 컴포넌트를 분리하는 편이 좋습니다.'
          : '변경 범위가 워크스페이스 카드와 수정 다이얼로그에 집중되어 있어 현재 기능 단위로는 과한 분리는 필요하지 않습니다.',
      ].join('\n');
    }

    if (intent === 'delete') {
      return [
        '카드 컴포넌트는 삭제 버튼 노출 조건을 판단하고, 삭제 확인/차단/요청 흐름은 DeleteWorkspaceDialog로 분리되어 있습니다.',
        '삭제 가능 조건과 mutation 호출이 같은 다이얼로그 안에 모여 있어 사용자가 누르는 액션과 서버 요청 흐름을 따라가기 쉽습니다.',
      ].join('\n');
    }

    return [
      changedPaths.some((path) => path.includes('towercrane-for-uiux-front/src/')) &&
      changedPaths.some((path) => path.includes('towercrane-for-uiux-server/src/'))
        ? '프론트와 서버 변경이 함께 있어 기능 경계와 API 계약을 같이 확인해야 합니다.'
        : '변경 범위가 한 레이어에 가까워 책임 경계는 비교적 단순합니다.',
      largeFiles.length > 0
        ? `큰 변경 파일(${largeFiles.map((file) => file.path).join(', ')})은 이후 훅/섹션/유틸로 분리할 여지가 있습니다.`
        : '파일 크기 관점에서 즉시 분리할 만한 신호는 크지 않습니다.',
    ].join('\n');
  }

  private logicSubjectLabel(symbol: string, path: string) {
    if (/^use[A-Z]/.test(symbol)) return `커스텀 훅: ${symbol}`;
    if (/Dialog|Card|Page|Panel|Section|List|Form/.test(symbol)) {
      return `함수 컴포넌트: ${symbol}`;
    }
    if (path.includes('/api/')) return `API 모듈: ${symbol}`;
    if (path.includes('/service') || path.includes('.service.')) return `서비스 함수: ${symbol}`;
    if (/on[A-Z]|handle[A-Z]/.test(symbol)) return `이벤트 핸들러: ${symbol}`;

    return `함수: ${symbol}`;
  }

  private logicStepTitle(symbol: string, path: string, intent: ReviewIntent) {
    if (intent === 'update') {
      if (/Dialog|Form/.test(symbol)) return '수정 폼 처리';
      if (/on[A-Z]|handle[A-Z]/.test(symbol)) return '수정 저장 요청';
      if (/Card|Button|Pencil/.test(symbol)) return '수정 버튼 UI';
      return '수정 로직';
    }
    if (intent === 'delete') {
      if (/Dialog/.test(symbol)) return '삭제 확인 다이얼로그';
      if (/on[A-Z]|handle[A-Z]/.test(symbol)) return '삭제 실행 요청';
      if (/Card|Button|Trash/.test(symbol)) return '삭제 버튼 UI';
      return '삭제 로직';
    }
    if (path.includes('/api/')) return 'API 요청 연결';
    if (path.includes('/pages/')) return '화면 상태와 사용자 액션';
    if (path.includes('/router')) return '라우트 연결';

    return '주요 변경 로직';
  }

  private logicCodeComment(path: string, intent: ReviewIntent, symbol: string) {
    if (intent === 'update') return '리뷰 요청과 직접 관련된 수정 흐름의 핵심 코드';
    if (intent === 'delete') return '리뷰 요청과 직접 관련된 삭제 흐름의 핵심 코드';
    if (path.includes('/api/')) return '화면과 서버 계약을 연결하는 핵심 호출 코드';
    if (path.includes('/pages/')) return '사용자 액션과 화면 상태를 연결하는 핵심 코드';

    return `${symbol}에서 변경 흐름을 만드는 핵심 코드`;
  }

  private withSnippetComment(snippet: string, comment: string) {
    const trimmed = snippet.trim();
    if (!trimmed) return `// ${comment}`;
    if (trimmed.startsWith('//')) return trimmed;

    return [`// ${comment}`, trimmed].join('\n');
  }

  private pickTopChangedFiles(files: ParsedDiffFile[], limit: number) {
    return [...files]
      .filter((file) => file.additions > 0)
      .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
      .slice(0, limit);
  }

  private pickFlowFiles(files: ParsedDiffFile[], limit: number) {
    const priority = (path: string) => {
      if (path.includes('/pages/')) return 1;
      if (path.includes('/api/')) return 2;
      if (path.endsWith('.controller.ts')) return 3;
      if (path.endsWith('.service.ts')) return 4;
      if (path.endsWith('.schemas.ts')) return 5;
      if (path.includes('/database/')) return 6;
      if (path.includes('/router')) return 7;
      return 9;
    };

    return [...files]
      .filter((file) => file.additions > 0)
      .sort((a, b) => {
        const priorityDiff = priority(a.path) - priority(b.path);
        if (priorityDiff !== 0) return priorityDiff;
        return b.additions + b.deletions - (a.additions + a.deletions);
      })
      .slice(0, limit);
  }

  private pickSyntaxFiles(files: ParsedDiffFile[], limit: number) {
    const patterns = [
      /\bz\.(object|enum|array|string|number|boolean)|z\.infer/,
      /use(Query|Mutation)|queryKey|mutationFn|invalidateQueries/,
      /@(Controller|Get|Post|Patch|Delete|Injectable)|constructor\(/,
      /sqliteTable|text\(|integer\(|\.\$type</,
    ];
    const syntaxFiles = files.filter((file) => {
      if (!/\.(ts|tsx)$/.test(file.path)) return false;
      const addedText = this.extractNonImportAddedText(file.diff);
      return patterns.some((pattern) => pattern.test(addedText));
    });
    return syntaxFiles
      .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
      .slice(0, limit);
  }

  private logicPatternsForPath(path: string) {
    if (path.includes('/pages/')) {
      return [
        /use(Query|Mutation|State|Memo|Effect)/,
        /function\s+\w+/,
        /const\s+\w+\s*=/,
        /return\s*\(/,
      ];
    }
    if (path.includes('/api/')) {
      return [/apiRequest|use(Query|Mutation)|queryKey|mutationFn|invalidateQueries/];
    }
    if (path.endsWith('.service.ts')) {
      return [/async\s+\w+|this\.db|\.select\(|\.insert\(|\.update\(|fetch\(/];
    }
    if (path.endsWith('.schemas.ts')) return [/\bz\.(object|enum|array|string)/];
    if (path.includes('/database/')) return [/sqliteTable|text\(|integer\(|\.\$type</];
    return [/function\s+\w+|const\s+\w+\s*=|return\s+/];
  }

  private extractReviewSnippet(
    file: ParsedDiffFile,
    patterns: RegExp[],
    maxLines = 14,
  ) {
    if (file.fullText) {
      const fullTextSnippet = this.extractFullTextSnippet(
        file.fullText,
        file.diff,
        patterns,
        maxLines,
      );
      if (fullTextSnippet) return fullTextSnippet;
    }

    const sourceLines = this.extractDiffContextLines(file.diff).filter(
      (line) =>
        line.text.trim().length > 0 && !this.isSnippetBoilerplateLine(line.text),
    );
    if (sourceLines.length === 0) return '// diff에서 표시 가능한 코드 스니펫 없음';

    const addedAnchor = sourceLines.findIndex(
      (line) =>
        line.added && patterns.some((pattern) => pattern.test(line.text)),
    );
    const contextAnchor = sourceLines.findIndex((line) =>
      patterns.some((pattern) => pattern.test(line.text)),
    );
    const firstAddedLine = sourceLines.findIndex((line) => line.added);
    const anchor =
      addedAnchor >= 0
        ? addedAnchor
        : contextAnchor >= 0
          ? contextAnchor
          : firstAddedLine >= 0
            ? firstAddedLine
            : 0;
    let start = Math.max(0, anchor - 4);
    let end = Math.min(sourceLines.length, start + maxLines);

    while (
      start < anchor &&
      /^[}\])];?,?$/.test(sourceLines[start]?.text.trim() ?? '')
    ) {
      start += 1;
    }

    while (
      end > start + 1 &&
      /^[{[(]$/.test(sourceLines[end - 1]?.text.trim() ?? '')
    ) {
      end -= 1;
    }

    return sourceLines
      .slice(start, end)
      .map((line) => line.text)
      .map((line) => (line.length > 100 ? `${line.slice(0, 97)}...` : line))
      .join('\n');
  }

  private extractFullTextSnippet(
    fullText: string,
    diff: string,
    patterns: RegExp[],
    maxLines: number,
  ) {
    const lines = fullText.split('\n');
    if (lines.length === 0) return null;

    const changedLine = this.findFirstSignificantAddedLineNumber(diff);
    const patternLine = lines.findIndex((line) =>
      !this.isSnippetBoilerplateLine(line) &&
      patterns.some((pattern) => pattern.test(line)),
    );
    const anchor =
      patternLine >= 0
        ? patternLine
        : changedLine && changedLine > 0
          ? Math.min(changedLine - 1, lines.length - 1)
          : 0;
    const functionStart = this.findSnippetStart(lines, anchor);
    const start = Math.max(0, functionStart >= 0 ? functionStart : anchor - 4);
    const end = Math.min(lines.length, start + maxLines);

    const snippetLines = lines.slice(start, end);
    while (
      snippetLines.length > 0 &&
      this.isSnippetBoilerplateLine(snippetLines[0])
    ) {
      snippetLines.shift();
    }

    return snippetLines
      .map((line) => (line.length > 100 ? `${line.slice(0, 97)}...` : line))
      .join('\n')
      .trim();
  }

  private findSnippetStart(lines: string[], anchor: number) {
    for (let index = anchor; index >= 0 && index >= anchor - 80; index -= 1) {
      if (this.isSnippetBoilerplateLine(lines[index])) continue;
      if (
        /^(export\s+)?(async\s+)?function\s+\w+/.test(lines[index].trim()) ||
        /^(export\s+)?const\s+\w+\s*=/.test(lines[index].trim()) ||
        /^class\s+\w+/.test(lines[index].trim()) ||
        /@(Controller|Injectable)\b/.test(lines[index].trim())
      ) {
        return index;
      }
    }
    return -1;
  }

  private findFirstSignificantAddedLineNumber(diff: string) {
    let currentLine = 0;
    for (const line of diff.split('\n')) {
      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        currentLine = Number(hunk[1]);
        continue;
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        if (!this.isImportLikeLine(line.slice(1))) return currentLine || null;
        currentLine += 1;
        continue;
      }
      if (!line.startsWith('-')) currentLine += 1;
    }
    return null;
  }

  private findChangedSymbol(file: ParsedDiffFile) {
    const lines = (file.fullText ?? this.extractDiffContextLines(file.diff).map((line) => line.text).join('\n'))
      .split('\n')
      .filter((line) => !this.isSnippetBoilerplateLine(line));
    const changedLine = this.findFirstSignificantAddedLineNumber(file.diff);
    const anchor =
      changedLine && file.fullText
        ? Math.min(changedLine - 1, lines.length - 1)
        : lines.findIndex((line) =>
            /use(Query|Mutation)|apiRequest|fetch\(|\.select\(|\.insert\(|z\.object|sqliteTable|function\s+\w+|const\s+\w+\s*=/.test(
              line,
            ),
          );
    const start = this.findSnippetStart(lines, Math.max(0, anchor));
    const candidate = lines[start >= 0 ? start : Math.max(0, anchor)]?.trim();

    if (!candidate) return this.moduleNameFromPath(file.path);
    return candidate
      .replace(/^\s*export\s+/, '')
      .replace(/\s*=>.*$/, '')
      .replace(/\s*\{?\s*$/, '')
      .slice(0, 120);
  }

  private moduleNameFromPath(path: string) {
    const name = path.split('/').pop() ?? path;
    return name.replace(/\.(tsx?|jsx?)$/, '');
  }

  private extractNonImportAddedText(diff: string) {
    return diff
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1))
      .filter((line) => !this.isImportLikeLine(line))
      .join('\n');
  }

  private isImportLikeLine(line: string) {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('import ') ||
      trimmed.startsWith('import{') ||
      trimmed.startsWith('from ') ||
      /^} from ['"]/.test(trimmed) ||
      /^}\s*$/.test(trimmed) ||
      /^[\w$]+\s*,?$/.test(trimmed)
    );
  }

  private isSnippetBoilerplateLine(line: string) {
    const trimmed = line.trim();
    return (
      this.isImportLikeLine(line) ||
      /^export\s+type\s+\w+/.test(trimmed) ||
      /^type\s+\w+/.test(trimmed) ||
      /^export\s+interface\s+\w+/.test(trimmed) ||
      /^interface\s+\w+/.test(trimmed)
    );
  }

  private extractDiffContextLines(diff: string) {
    return diff
      .split('\n')
      .filter((line) => {
        if (!line) return false;
        if (line.startsWith('diff --git')) return false;
        if (line.startsWith('index ')) return false;
        if (line.startsWith('---') || line.startsWith('+++')) return false;
        if (line.startsWith('@@')) return false;
        if (line.startsWith('-')) return false;
        return line.startsWith('+') || line.startsWith(' ');
      })
      .map((line) => ({
        added: line.startsWith('+'),
        text: line.slice(1),
      }));
  }

  private detectSyntaxFocus(file: ParsedDiffFile) {
    const addedText = this.extractAddedText(file.diff);
    const candidates = [
      {
        label: 'Zod',
        patterns: [/\bz\.(object|enum|array|string|number|boolean)|z\.infer/],
        explanation:
          '런타임 검증 스키마가 API payload의 실제 형태를 제한하고, 프론트/서버 타입 계약의 기준점이 됩니다.',
      },
      {
        label: 'TanStack Query',
        patterns: [/use(Query|Mutation)|queryKey|mutationFn|invalidateQueries/],
        explanation:
          'queryKey, mutationFn, 성공 후 무효화 흐름이 서버 상태를 화면 상태와 연결하는 핵심 문법입니다.',
      },
      {
        label: 'NestJS',
        patterns: [/@(Controller|Get|Post|Patch|Delete|Injectable)|constructor\(/],
        explanation:
          '데코레이터와 생성자 주입이 HTTP 엔드포인트, 서비스 책임, 의존성 경계를 선언적으로 묶습니다.',
      },
      {
        label: 'Drizzle',
        patterns: [/sqliteTable|text\(|integer\(|\.\$type</],
        explanation:
          'DB 컬럼 선언과 TypeScript 타입이 저장 가능한 JSON 구조와 조회 결과 타입을 함께 고정합니다.',
      },
    ];

    return (
      candidates.find((candidate) =>
        candidate.patterns.some((pattern) => pattern.test(addedText)),
      ) ?? candidates[0]
    );
  }

  private logicExplanation(path: string, intent: ReviewIntent, symbol: string) {
    if (intent === 'delete') {
      if (/Delete|delete|onDelete|Trash/.test(symbol)) {
        return '삭제 확인 다이얼로그의 열림 상태, 삭제 가능 조건, delete mutation 호출, 실패 메시지를 한 흐름으로 묶는 핵심 로직입니다.';
      }
      if (path.includes('/pages/')) {
        return '카드에서 삭제 액션의 노출 조건과 열기 액션을 분리해, 카드 이동과 삭제 실행이 서로 충돌하지 않게 만드는 로직입니다.';
      }
      if (path.includes('/api/')) {
        return '삭제 요청을 서버 계약으로 감싸고 성공 후 목록 캐시를 갱신하는 경계 로직입니다.';
      }
      return '삭제 기능에서 사용자 확인, 요청 실행, 화면 갱신 책임이 이어지는지 확인해야 하는 로직입니다.';
    }
    if (intent === 'update') {
      return '수정 기능에서 기존 값 초기화, 입력 검증, update mutation, 성공 후 화면 갱신이 끊기지 않는지 확인해야 하는 로직입니다.';
    }
    if (intent === 'create') {
      return '생성 기능에서 입력값 검증, create mutation, 성공 후 폼 초기화와 목록 갱신이 이어지는지 확인해야 하는 로직입니다.';
    }
    if (path.includes('/api/')) {
      return '요청 함수는 URL, payload, 응답 타입을 한 곳에서 고정하므로 화면 컴포넌트가 서버 계약을 직접 알 필요가 줄어듭니다.';
    }
    if (path.includes('/pages/')) {
      return '페이지 로직은 입력값, 선택 상태, mutation 결과, 상세 표시를 이어 주므로 상태 전이가 길어지면 훅이나 섹션 컴포넌트로 분리하는 편이 좋습니다.';
    }
    if (path.endsWith('.service.ts')) {
      return '서비스 함수는 외부 diff 수집, 분석, 정규화, 저장을 담당하므로 실패 처리와 중복 저장 방어가 핵심입니다.';
    }
    if (path.endsWith('.schemas.ts')) {
      return '스키마는 API 경계의 첫 방어선이므로 기본값, enum, 배열 길이 제한이 실제 UI 요청과 맞아야 합니다.';
    }
    if (path.includes('/database/')) {
      return 'DB 타입은 저장 payload를 장기 계약으로 만들기 때문에 nullable, JSON 구조, 기본값을 프론트 타입과 맞춰야 합니다.';
    }
    return '이 코드가 맡는 입력, 처리, 출력 책임이 한 함수 안에서 읽히는지 확인하는 것이 핵심입니다.';
  }

  private hasLargeChange(files: ParsedDiffFile[]) {
    return files.some((file) => file.additions + file.deletions > 500);
  }

  private hasFullStackChange(files: ParsedDiffFile[]) {
    const paths = files.map((file) => file.path);
    return (
      paths.some((path) => path.includes('towercrane-for-uiux-front/src/')) &&
      paths.some((path) => path.includes('towercrane-for-uiux-server/src/'))
    );
  }

  private languageForPath(path: string) {
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.ts')) return 'ts';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.sql')) return 'sql';
    return '';
  }

  private formatChangedFileTree(files: ParsedDiffFile[]) {
    type TreeNode = {
      children: Map<string, TreeNode>;
      file: ParsedDiffFile | null;
    };
    const root: TreeNode = { children: new Map(), file: null };

    for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
      const parts = file.path.split('/').filter(Boolean);
      let current = root;
      for (const [index, part] of parts.entries()) {
        const next = current.children.get(part) ?? {
          children: new Map<string, TreeNode>(),
          file: null,
        };
        if (index === parts.length - 1) {
          next.file = file;
        }
        current.children.set(part, next);
        current = next;
      }
    }

    const render = (node: TreeNode, prefix = ''): string[] => {
      const entries = Array.from(node.children.entries()).sort((a, b) => {
        const aIsFile = Boolean(a[1].file);
        const bIsFile = Boolean(b[1].file);
        if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
        return a[0].localeCompare(b[0]);
      });

      return entries.flatMap(([name, child], index) => {
        const isLast = index === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const nextPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
        const label = child.file
          ? `${name} (+${child.file.additions}/-${child.file.deletions})`
          : name;
        return [`${prefix}${connector}${label}`, ...render(child, nextPrefix)];
      });
    };

    return ['.', ...render(root)].join('\n');
  }

  private buildReviewMermaidFlowchart(files: ParsedDiffFile[], reviewGoal = '') {
    const intent = this.detectReviewIntent(files, reviewGoal);
    if (intent === 'delete') {
      return [
        'flowchart TD',
        '  A["워크스페이스 카드"] --> B{"소유자 권한인가?"}',
        '  B -- "아니오" --> C["삭제 버튼 비활성"]',
        '  B -- "예" --> D["삭제 버튼 표시"]',
        '  D --> E["삭제 확인 다이얼로그 열기"]',
        '  E --> F{"카테고리가 남아 있는가?"}',
        '  F -- "예" --> G["삭제 차단 안내"]',
        '  F -- "아니오" --> H["delete mutation 실행"]',
        '  H --> I["다이얼로그 닫기"]',
        '  I --> J["워크스페이스 목록 갱신"]',
      ].join('\n');
    }
    if (intent === 'update') {
      return [
        'flowchart TD',
        '  A["워크스페이스 카드"] --> B{"소유자 권한인가?"}',
        '  B -- "아니오" --> C["수정 버튼 비활성"]',
        '  B -- "예" --> D["수정 버튼 표시"]',
        '  D --> E["EditWorkspaceDialog 열기"]',
        '  E --> F["기존 이름/설명으로 폼 초기화"]',
        '  F --> G{"이름 유효 + 변경 있음?"}',
        '  G -- "아니오" --> H["저장 버튼 비활성"]',
        '  G -- "예" --> I["update mutation 실행"]',
        '  I --> J["다이얼로그 닫기"]',
        '  J --> K["워크스페이스 목록 갱신"]',
      ].join('\n');
    }

    const changedPaths = files.map((file) => file.path);
    const hasFrontend = changedPaths.some((path) =>
      path.includes('towercrane-for-uiux-front/src/'),
    );
    const hasServer = changedPaths.some((path) =>
      path.includes('towercrane-for-uiux-server/src/'),
    );
    const hasDatabase = changedPaths.some((path) =>
      path.includes('/database/') || path.includes('/data/'),
    );

    const lines = ['flowchart TD', '  A["commit URL 입력"] --> B["커밋 diff 수집"]'];

    if (hasServer) {
      lines.push(
        '  B --> C["서버 분석 API"]',
        '  C --> D["파일 제외 규칙 적용"]',
        '  D --> E["선택 관점별 리뷰 생성"]',
      );
    } else {
      lines.push('  B --> E["선택 관점별 리뷰 생성"]');
    }

    if (hasDatabase) {
      lines.push('  E --> F["code_reviews 저장"]');
    } else {
      lines.push('  E --> F["리뷰 결과 구성"]');
    }

    if (hasFrontend) {
      lines.push(
        '  F --> G["목록/상세 화면 갱신"]',
        '  G --> H["사용자 검토 및 삭제/수정"]',
      );
    } else {
      lines.push('  F --> H["사용자 검토"]');
    }

    return lines.join('\n');
  }

  private detectReviewIntent(files: ParsedDiffFile[], reviewGoal = ''): ReviewIntent {
    const addedText = files.map((file) => this.extractAddedText(file.diff)).join('\n');
    const pathText = files.map((file) => file.path).join('\n');
    if (/useUpdate|update[A-Z]|\bPATCH\b|Pencil|onSubmit|수정/.test(reviewGoal)) {
      return 'update';
    }
    if (/useDelete|delete[A-Z]|\bDELETE\b|Trash2|onDelete|삭제/.test(reviewGoal)) {
      return 'delete';
    }
    if (/useCreate|create[A-Z]|\bPOST\b|Plus|생성/.test(reviewGoal)) {
      return 'create';
    }
    const text = `${reviewGoal}\n${pathText}\n${addedText}`;

    if (/useDelete|delete[A-Z]|\bDELETE\b|Trash2|onDelete|삭제/.test(text)) {
      return 'delete';
    }
    if (/useUpdate|update[A-Z]|\bPATCH\b|Pencil|onSubmit|수정/.test(text)) {
      return 'update';
    }
    if (/useCreate|create[A-Z]|\bPOST\b|Plus|생성/.test(text)) {
      return 'create';
    }
    if (/navigate\(|onOpen|ArrowRight|라우트|route/i.test(text)) {
      return 'navigation';
    }
    return 'generic';
  }

  private extractAddedText(diff: string) {
    return diff
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1))
      .join('\n');
  }

  private findAddedLineNumber(diff: string, pattern: RegExp) {
    let currentLine = 0;
    for (const line of diff.split('\n')) {
      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        currentLine = Number(hunk[1]);
        continue;
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        if (pattern.test(line.slice(1))) return currentLine || null;
        currentLine += 1;
        continue;
      }
      if (!line.startsWith('-')) currentLine += 1;
    }
    return null;
  }

  private findDuplicate(sourceUrl: string, diffHash: string) {
    return this.db
      .select()
      .from(codeReviewsTable)
      .where(
        and(
          eq(codeReviewsTable.sourceUrl, sourceUrl),
          eq(codeReviewsTable.diffHash, diffHash),
        ),
      )
      .get();
  }

  private ensureReview(reviewId: string) {
    const row = this.db
      .select()
      .from(codeReviewsTable)
      .where(eq(codeReviewsTable.id, reviewId))
      .get();
    if (!row) throw new NotFoundException(`코드 리뷰를 찾을 수 없습니다: ${reviewId}`);
    return row;
  }

  private ensureSignedIn(user: CodeReviewUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private assertOwnerOrAdmin(row: CodeReviewRow, user: CodeReviewUser) {
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('이 코드 리뷰를 수정할 권한이 없습니다.');
  }

  private toSummaryDto(row: CodeReviewRow) {
    const highSeverityCount = row.findings.filter(
      (finding) => finding.severity === 'high',
    ).length;
    return {
      id: row.id,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
      repository: row.repository,
      title: row.title,
      summary: row.summary,
      riskLevel: row.riskLevel,
      findingCount: row.findings.length,
      highSeverityCount,
      testGapCount: row.testGaps.length,
      changedFileCount: row.changedFiles.length,
      excludedFileCount: row.excludedFiles.length,
      model: row.model,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDetailDto(row: CodeReviewRow, user: CodeReviewUser) {
    return {
      ...this.toSummaryDto(row),
      findings: row.findings,
      testGaps: row.testGaps,
      changedFiles: row.changedFiles,
      excludedFiles: row.excludedFiles,
      diffHash: row.diffHash,
      diffSnapshot: row.diffSnapshot,
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }
}
