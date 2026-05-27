import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
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
  type AnalyzeCodeReviewInput,
} from './code-reviews.schemas';

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

const MAX_DIFF_CHARS = 80_000;
const MAX_FILES = 30;
const MAX_FILE_DIFF_CHARS = 20_000;
const MAX_LLM_DIFF_CHARS = 30_000;

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
    const excludedFiles = [
      ...selectedFiles
        .map((file) => this.applyDiffFileExclusion(file))
        .filter((file) => !file.reviewed),
      ...fileLimitExcluded,
    ];
    const reviewableDiff = reviewedFiles.map((file) => file.diff).join('\n');

    if (!reviewableDiff.trim()) {
      throw new BadRequestException(
        '리뷰 가능한 diff가 없습니다. lock/generated 파일만 포함되어 있거나 diff가 비어 있습니다.',
      );
    }

    const diffHash = createHash('sha256')
      .update(reviewableDiff)
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
      reviewedFiles,
      excludedFiles,
      input.sections,
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
      changedFiles: reviewedFiles.map(({ diff: _diff, ...file }) => file),
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
  ): Promise<CodeReviewAnalysis> {
    if (this.openai) {
      const llmReview = await this.tryReviewDiffWithOpenAI(
        source,
        reviewedFiles,
        excludedFiles,
        sections,
      );
      if (llmReview) return llmReview;
    }
    return this.reviewDiffWithHeuristics(
      source,
      reviewedFiles,
      excludedFiles,
      sections,
    );
  }

  private async tryReviewDiffWithOpenAI(
    source: ParsedGithubSource,
    reviewedFiles: ParsedDiffFile[],
    excludedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
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
              '너는 실무 코드 리뷰어다. 한국어 JSON만 출력한다. selectedSections에 포함된 관점만 작성한다. 가능한 관점은 1. 파일 구조 도식화, 2. 주요 프로세스, 3. 주요 로직, 4. 주요 문법, 5. 아키텍처/클린코드 평가, 6. mmd 흐름도다. 테스트 공백은 보조 확인으로만 다루고, 테스트 부재만으로 위험도를 높이지 않는다.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              repository: source.repository,
              sourceType: source.sourceType,
              sourceUrl: source.sourceUrl,
              reviewedFiles: reviewedFiles.map(({ diff: _diff, ...file }) => file),
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
              reviewFocus: [
                '파일 구조 도식화: 변경된 파일을 기능/레이어별 트리로 요약',
                '주요 프로세스: 사용자/운영 플로우가 어디서 시작해 어디에 저장·표시되는지 평가',
                '주요 로직: 핵심 서비스, API, 프론트 상태/라우팅 코드의 계약과 책임 평가',
                '주요 문법: TypeScript, React, NestJS, Zod/DB 사용 방식의 적절성 평가',
                '아키텍처/클린코드 평가: 레이어 분리, 모듈 경계, 파일 크기, 중복, 명명, 유지보수성 평가',
                'mmd 흐름도: 상태 관리나 외부 API/DB 저장 흐름이 복잡할 때만 Mermaid 문법으로 추가',
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
    findings.push(...this.buildStructuralReviewFindings(reviewedFiles, sections));

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
          ? `리뷰 가능한 파일 ${reviewedFiles.length}개를 선택한 ${sections.length}개 관점으로 평가했습니다. 평가 항목은 ${findings.length}개, 제외 파일은 ${excludedFiles.length}개입니다.`
          : `리뷰 가능한 파일 ${reviewedFiles.length}개 기준으로 구조적 평가 항목을 만들지 못했습니다. 제외 파일은 ${excludedFiles.length}개입니다.`,
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
    const findings = Array.isArray(input.findings)
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
            body: String(finding.body ?? '').slice(0, 2000),
            filePath:
              typeof finding.filePath === 'string' ? finding.filePath : null,
            lineNumber:
              typeof finding.lineNumber === 'number' && finding.lineNumber > 0
                ? Math.floor(finding.lineNumber)
                : null,
            recommendation: String(finding.recommendation ?? '수정 방향을 검토하세요.').slice(0, 2000),
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
    );

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

  private buildStructuralReviewFindings(
    reviewedFiles: ParsedDiffFile[],
    sections: CodeReviewSection[],
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
        title: '1. 파일 구조 도식화',
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
        body: [
          hasFrontend
            ? '프론트에서 사용자가 URL을 입력하고 분석을 요청하는 진입점이 추가되었습니다.'
            : '프론트 진입점 변경은 제한적입니다.',
          hasServer
            ? '서버는 GitHub diff 수집, 제외 규칙 적용, 리뷰 생성, DB 저장, 상세 조회 API를 담당합니다.'
            : '서버 처리 흐름 변경은 제한적입니다.',
          hasRouter
            ? '라우터/헤더 연결이 포함되어 메뉴에서 상세 화면까지 직접 접근할 수 있습니다.'
            : '라우터 변경은 감지되지 않았습니다.',
        ].join('\n'),
        filePath: topFiles[0]?.path ?? null,
        lineNumber: null,
        recommendation:
          'URL 입력 -> 분석 API -> 저장 -> 목록/상세 표시 -> 채팅 카드 진입 경로를 실제 사용자 플로우로 검증하세요.',
      });
    }

    if (selectedSectionSet.has('code')) {
      findings.push({
        category: 'code',
        severity: topFiles.some((file) => file.additions + file.deletions > 500)
          ? 'medium'
          : 'low',
        title: '3. 주요 로직',
        body: topFiles
          .map(
            (file) =>
              `${file.path}: +${file.additions} / -${file.deletions}`,
          )
          .join('\n'),
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
        title: '4. 주요 문법',
        body: [
          hasSchema ? 'Zod 스키마로 API 입력값을 검증하는 흐름이 포함되어 있습니다.' : null,
          hasReactQuery ? 'React Query mutation/query 훅으로 목록, 상세, 분석 요청 상태를 관리합니다.' : null,
          hasService ? 'NestJS service/controller/module 패턴으로 서버 기능을 분리합니다.' : null,
          hasDatabase ? 'Drizzle 테이블 타입과 SQLite 초기화 SQL이 함께 변경됩니다.' : null,
        ]
          .filter(Boolean)
          .join('\n') || '주요 프레임워크 문법 변경은 제한적입니다.',
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
        body: [
          hasFrontend && hasServer
            ? '프론트 entity/page와 서버 module/service가 분리되어 기능 경계는 명확합니다.'
            : '레이어 간 변경 범위는 작습니다.',
          hasDatabase
            ? 'DB-driven 메뉴와 실제 라우트/API가 함께 연결되어 메뉴 구조와 기능 진입점이 동기화됩니다.'
            : null,
          largeFiles.length > 0
            ? `큰 변경 파일(${largeFiles.map((file) => file.path).join(', ')})은 이후 훅/섹션/분석 유틸로 분리할 여지가 있습니다.`
            : '파일 크기 관점에서 즉시 분리할 만한 신호는 크지 않습니다.',
        ]
          .filter(Boolean)
          .join('\n'),
        filePath: largeFiles[0]?.path ?? null,
        lineNumber: null,
        recommendation:
          'MVP 이후에는 GitHub diff 파서, 리뷰 생성기, UI 섹션 컴포넌트를 분리해 테스트 가능한 단위로 낮추는 것이 좋습니다.',
      });
    }

    if (shouldIncludeDiagram) {
      findings.push({
        category: 'diagram',
        severity: 'low',
        title: '6. mmd 흐름도',
        body: [
          '```mmd',
          'flowchart TD',
          '  A["GitHub URL 입력"] --> B["POST /api/code-reviews/analyze"]',
          '  B --> C["GitHub .diff 수집"]',
          '  C --> D["파일 제외 규칙 / diff 파싱"]',
          '  D --> E["리뷰 관점 생성"]',
          '  E --> F["code_reviews 저장"]',
          '  F --> G["목록/상세 화면 표시"]',
          '  G --> H["개발 채팅 카드에서 열기"]',
          '```',
        ].join('\n'),
        filePath: null,
        lineNumber: null,
        recommendation:
          '흐름이 복잡한 변경에서는 이 다이어그램을 기준으로 실패 지점과 상태 전이를 하나씩 대조하세요.',
      });
    }

    return findings;
  }

  private formatChangedFileTree(files: ParsedDiffFile[]) {
    const groups = new Map<string, string[]>();
    for (const file of files) {
      const parts = file.path.split('/');
      const group = parts.slice(0, Math.min(parts.length - 1, 4)).join('/');
      const name = parts.at(-1) ?? file.path;
      const current = groups.get(group) ?? [];
      current.push(`${name} (+${file.additions}/-${file.deletions})`);
      groups.set(group, current);
    }

    return Array.from(groups.entries())
      .slice(0, 10)
      .map(([group, names]) => {
        const children = names
          .slice(0, 6)
          .map((name) => `  - ${name}`)
          .join('\n');
        return `${group || '.'}\n${children}`;
      })
      .join('\n');
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
