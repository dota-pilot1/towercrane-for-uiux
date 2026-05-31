import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  GitPullRequest,
  Info,
  Link2,
  Loader2,
  Search,
  Trash2,
  Unlink,
  Upload,
  X,
} from 'lucide-react'

import {
  useAnalyzeCodeReview,
  useCodeReviewDetail,
  useCodeReviewList,
  useCreateCodeReview,
  useDeleteCodeReview,
  useUpdateCodeReview,
} from '../../../entities/code-review/api/code-review-api'
import type {
  CodeReviewChangedFile,
  CodeReviewFinding,
  CodeReviewDetail,
  CodeReviewRiskLevel,
  CodeReviewSection,
  CodeReviewSourceType,
  CreateCodeReviewPayload,
} from '../../../entities/code-review/model/types'
import { TASK_STATUS_LABELS } from '../../../entities/task/model/constants'
import { Button } from '../../../shared/ui/button'
import { Mermaid } from '../../../shared/ui/mermaid'
import { PageHeader } from '../../../shared/ui/page-header'
import { useTasks } from '../../../features/task/model/use-task-queries'

type CodeReviewsPageProps = {
  reviewId?: string
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function truncate(value: string, length = 120) {
  if (value.length <= length) return value
  return `${value.slice(0, length).trim()}...`
}

const PUBLIC_FRONTEND_ORIGIN = 'https://hibot-docu.com'

function publicReferenceUrl(path: string) {
  const origin = window.location.origin
  const baseOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? PUBLIC_FRONTEND_ORIGIN
    : origin
  return `${baseOrigin}${path}`
}

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error('복사에 실패했습니다.')
  }
}

function riskLabel(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === 'high') return '높음'
  if (riskLevel === 'medium') return '중간'
  return '낮음'
}

function riskClassName(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === 'high') {
    return 'border-danger-border bg-danger-glass text-danger-500'
  }
  if (riskLevel === 'medium') {
    return 'border-brand-border bg-brand-glass text-brand-primary'
  }
  return 'border-surface-border-soft bg-surface-muted text-text-secondary'
}

function findingCategoryLabel(category: CodeReviewFinding['category']) {
  if (category === 'structure') return '변경 파일'
  if (category === 'process') return '주요 프로세스'
  if (category === 'code') return '주요 로직'
  if (category === 'syntax') return '핵심 문법'
  if (category === 'architecture') return '아키텍처'
  if (category === 'clean_code') return '클린코드'
  if (category === 'diagram') return 'mmd'
  if (category === 'risk') return '리스크'
  return '평가'
}

function extractMermaidChart(value: string) {
  const fenced = value.match(/```(?:mmd|mermaid)?\n([\s\S]*?)```/i)
  return (fenced?.[1] ?? value).trim()
}

function isMermaidChart(value: string) {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i.test(
    value.trim(),
  )
}

function shouldRenderCodeBlock(category: CodeReviewFinding['category']) {
  return category === 'structure' || category === 'code' || category === 'syntax'
}

const defaultReviewSections: CodeReviewSection[] = [
  'structure',
  'process',
  'code',
  'syntax',
  'architecture',
]

const reviewSectionOptions: Array<{ value: CodeReviewSection; label: string }> = [
  { value: 'structure', label: '1. 변경 파일' },
  { value: 'process', label: '2. 주요 프로세스' },
  { value: 'code', label: '3. 주요 로직' },
  { value: 'syntax', label: '4. 핵심 문법' },
  { value: 'architecture', label: '5. 아키텍처/클린코드' },
  { value: 'diagram', label: '6. mmd' },
]

const testCodeReviewCommitUrl =
  'https://github.com/dota-pilot1/towercrane-for-uiux/commit/0620b8ec376e0ee19379eabf2c063628d140ed6a'
const testCodeReviewGoal = '프로토 타입 워크 스페이스 수정 관련 로직'
const testCodeReviewSections = reviewSectionOptions.map((o) => o.value)

function getCommitUrlInputError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(trimmed)) {
    return '저장소 주소가 아니라 GitHub commit URL을 입력하세요.'
  }
  if (
    !/^https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/[0-9a-f]{7,40}(?:\.diff)?(?:[?#].*)?$/i.test(
      trimmed,
    )
  ) {
    return '예: https://github.com/owner/repo/commit/sha'
  }
  return null
}

type UploadedReviewFile = {
  name: string
  size: number
  text: string
  extension: string
  lineCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function safeRiskLevel(value: unknown): CodeReviewRiskLevel {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'low'
}

function safeSourceType(value: unknown): CodeReviewSourceType {
  if (value === 'commit' || value === 'pr' || value === 'compare' || value === 'diff_url') {
    return value
  }
  return 'diff_url'
}

function createManualSourceUrl(name: string) {
  return `manual-upload://${encodeURIComponent(name)}-${Date.now()}`
}

function simpleHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `upload-${Math.abs(hash).toString(16).padStart(12, '0')}-${Date.now().toString(36)}`
}

function inferRepository(sourceUrl: string) {
  const githubMatch = sourceUrl.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)/i)
  if (githubMatch?.[1]) return githubMatch[1]
  if (sourceUrl.startsWith('manual-upload://')) return 'manual-upload'
  return 'external-upload'
}

function parseFrontmatter(value: string) {
  if (!value.startsWith('---')) return { metadata: {}, body: value }
  const endIndex = value.indexOf('\n---', 3)
  if (endIndex === -1) return { metadata: {}, body: value }

  const metadata = value
    .slice(3, endIndex)
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (match?.[1]) acc[match[1]] = (match[2] ?? '').replace(/^['"]|['"]$/g, '').trim()
      return acc
    }, {})

  return {
    metadata,
    body: value.slice(endIndex + 4).trim(),
  }
}

function getMarkdownSection(body: string, names: string[]) {
  const escapedNames = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const match = body.match(new RegExp(`^#{1,3}\\s*(?:${escapedNames})\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s|$)`, 'im'))
  return match?.[1]?.trim() ?? null
}

function normalizeFinding(value: unknown, index: number): CodeReviewFinding | null {
  if (!isRecord(value)) return null
  const body = stringValue(value.body) ?? stringValue(value.description)
  const recommendation =
    stringValue(value.recommendation) ?? stringValue(value.suggestion) ?? '리뷰 내용을 기준으로 변경 의도와 실제 구현을 확인하세요.'

  if (!body) return null
  return {
    category:
      value.category === 'structure' ||
      value.category === 'process' ||
      value.category === 'code' ||
      value.category === 'syntax' ||
      value.category === 'architecture' ||
      value.category === 'clean_code' ||
      value.category === 'diagram' ||
      value.category === 'risk'
        ? value.category
        : 'code',
    severity: safeRiskLevel(value.severity),
    title: stringValue(value.title) ?? `검토 항목 ${index + 1}`,
    body,
    filePath: stringValue(value.filePath) ?? stringValue(value.path),
    lineNumber: typeof value.lineNumber === 'number' ? value.lineNumber : null,
    recommendation,
  }
}

function normalizeChangedFile(value: unknown): CodeReviewChangedFile | null {
  if (!isRecord(value)) return null
  const path = stringValue(value.path) ?? stringValue(value.filePath)
  if (!path) return null
  return {
    path,
    additions: typeof value.additions === 'number' && value.additions > 0 ? value.additions : 0,
    deletions: typeof value.deletions === 'number' && value.deletions > 0 ? value.deletions : 0,
    reviewed: typeof value.reviewed === 'boolean' ? value.reviewed : true,
    excludedReason: stringValue(value.excludedReason),
  }
}

function filesToChangedFiles(files: UploadedReviewFile[]) {
  return files.map((file) => ({
    path: file.name,
    additions: file.lineCount,
    deletions: 0,
    reviewed: true,
    excludedReason: null,
  }))
}

type FindingCategory = NonNullable<CodeReviewFinding['category']>

function markdownHeadingCategory(title: string): FindingCategory {
  const normalized = title.replace(/^\d+\.\s*/, '').toLowerCase()
  if (/변경|파일|structure/.test(normalized)) return 'structure'
  if (/프로세스|흐름|process/.test(normalized)) return 'process'
  if (/로직|코드|code/.test(normalized)) return 'code'
  if (/문법|syntax/.test(normalized)) return 'syntax'
  if (/아키텍처|클린|설계|architecture|clean/.test(normalized)) return 'architecture'
  if (/mmd|mermaid|다이어그램|diagram/.test(normalized)) return 'diagram'
  if (/리스크|위험|risk/.test(normalized)) return 'risk'
  return 'code'
}

function markdownHeadingRecommendation(category: FindingCategory) {
  if (category === 'structure') return '변경 파일 범위가 기능 단위로 모였는지 확인하세요.'
  if (category === 'process') return '사용자 액션부터 저장/갱신까지 주요 흐름이 끊기지 않는지 확인하세요.'
  if (category === 'architecture') return '프론트, 서버, DB 책임이 한 흐름으로 과하게 묶이지 않았는지 확인하세요.'
  if (category === 'diagram') return '다이어그램이 실제 구현 흐름과 같은지 확인하세요.'
  if (category === 'risk') return '리스크 항목은 배포 전 재현 조건과 완화 방법을 분리해 확인하세요.'
  return '핵심 구현 로직이 요구사항과 예외 상황을 모두 처리하는지 확인하세요.'
}

function buildMarkdownReviewFindings(
  body: string,
  filePath: string,
  riskLevel: CodeReviewRiskLevel,
) {
  const headings = Array.from(body.matchAll(/^#{2,3}\s+(.+)$/gm))
  const findings: CodeReviewFinding[] = []

  headings.forEach((heading, index) => {
    const title = heading[1]?.trim()
    const start = (heading.index ?? 0) + heading[0].length
    const end = headings[index + 1]?.index ?? body.length
    const content = body.slice(start, end).trim()
    if (!title || !content) return
    if (/^(전체\s*)?요약|summary|테스트|검증|tests?$/i.test(title)) return

    const category = markdownHeadingCategory(title)
    findings.push({
      category,
      severity: category === 'risk' ? riskLevel : 'low',
      title: truncate(title.replace(/^\d+\.\s*/, ''), 157),
      body: truncate(content, 11997),
      filePath,
      lineNumber: null,
      recommendation: markdownHeadingRecommendation(category),
    })
  })

  return findings
}

function buildPayloadFromJson(
  value: unknown,
  uploadedFiles: UploadedReviewFile[],
  fallbackSourceUrl: string,
): CreateCodeReviewPayload | null {
  if (!isRecord(value)) return null

  const sourceUrl =
    stringValue(value.sourceUrl) ??
    (fallbackSourceUrl.trim() || createManualSourceUrl(uploadedFiles[0]?.name ?? 'review'))
  const repository = stringValue(value.repository) ?? inferRepository(sourceUrl)
  const summary = stringValue(value.summary) ?? stringValue(value.description)
  const primaryText = uploadedFiles.map((file) => `# ${file.name}\n${file.text}`).join('\n\n')
  const findings = Array.isArray(value.findings)
    ? value.findings
        .map((finding, index) => normalizeFinding(finding, index))
        .filter((finding): finding is CodeReviewFinding => Boolean(finding))
    : []
  const changedFiles = Array.isArray(value.changedFiles)
    ? value.changedFiles
        .map(normalizeChangedFile)
        .filter((file): file is CodeReviewChangedFile => Boolean(file))
    : filesToChangedFiles(uploadedFiles)

  return {
    taskId: stringValue(value.taskId),
    sourceType: safeSourceType(value.sourceType),
    sourceUrl,
    repository,
    title: truncate(stringValue(value.title) ?? `업로드 코드 리뷰 - ${uploadedFiles[0]?.name ?? 'review'}`, 177),
    summary: summary ?? truncate(primaryText, 11997),
    riskLevel: safeRiskLevel(value.riskLevel),
    findings,
    testGaps: Array.isArray(value.testGaps)
      ? value.testGaps.map(stringValue).filter((item): item is string => Boolean(item))
      : [],
    changedFiles,
    excludedFiles: Array.isArray(value.excludedFiles)
      ? value.excludedFiles
          .map(normalizeChangedFile)
          .filter((file): file is CodeReviewChangedFile => Boolean(file))
      : [],
    diffHash: stringValue(value.diffHash) ?? simpleHash(primaryText),
    diffSnapshot: stringValue(value.diffSnapshot) ?? truncate(primaryText, 119997),
    model: stringValue(value.model) ?? 'file-upload',
  }
}

async function buildUploadedReviewPayload(
  files: File[],
  fallbackSourceUrl: string,
): Promise<CreateCodeReviewPayload> {
  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      const text = await file.text()
      return {
        name: file.webkitRelativePath || file.name,
        size: file.size,
        text,
        extension: file.name.split('.').pop()?.toLowerCase() ?? '',
        lineCount: text.split(/\r?\n/).length,
      }
    }),
  )

  const primaryFile =
    uploadedFiles.find((file) => file.extension === 'json') ??
    uploadedFiles.find((file) => /review|리뷰|summary|요약/i.test(file.name)) ??
    uploadedFiles.find((file) => file.extension === 'md' || file.extension === 'markdown') ??
    uploadedFiles[0]

  if (!primaryFile) throw new Error('업로드할 파일을 선택하세요.')

  if (primaryFile.extension === 'json') {
    const payload = buildPayloadFromJson(JSON.parse(primaryFile.text), uploadedFiles, fallbackSourceUrl)
    if (payload) return payload
  }

  const { metadata, body } = parseFrontmatter(primaryFile.text)
  const sourceUrl =
    metadata.sourceUrl || metadata.source_url || fallbackSourceUrl.trim() || createManualSourceUrl(primaryFile.name)
  const repository = metadata.repository || inferRepository(sourceUrl)
  const summary =
    getMarkdownSection(body, ['전체 요약', '요약', 'summary']) ??
    truncate(body || `${primaryFile.name} 파일을 기준으로 코드 리뷰를 등록했습니다.`, 11997)
  const testsSection = getMarkdownSection(body, ['테스트', '검증', 'test', 'tests'])
  const relatedFiles = uploadedFiles.filter((file) => file.name !== primaryFile.name)
  const changedFiles = filesToChangedFiles(relatedFiles.length ? relatedFiles : [primaryFile])
  const combinedSnapshot = uploadedFiles
    .map((file) => `# ${file.name}\n\n${file.text}`)
    .join('\n\n---\n\n')
  const riskLevel = safeRiskLevel(metadata.riskLevel || metadata.risk_level)
  const markdownFindings = buildMarkdownReviewFindings(body, primaryFile.name, riskLevel)
  const fallbackFindings: CodeReviewFinding[] = [
    {
      category: 'process',
      severity: riskLevel,
      title: '리뷰 요약',
      body: summary,
      filePath: primaryFile.name,
      lineNumber: null,
      recommendation: '요약 기준으로 구현 의도와 실제 변경 흐름을 대조하세요.',
    },
    {
      category: 'structure',
      severity: 'low',
      title: '업로드 파일 구조',
      body: truncate(
        changedFiles
          .map((file) => `- ${file.path} (${file.additions} lines)`)
          .join('\n'),
        11997,
      ),
      filePath: null,
      lineNumber: null,
      recommendation: '업로드 파일이 실제 변경 범위와 맞는지 확인하세요.',
    },
  ]

  return {
    taskId: metadata.taskId || metadata.task_id || null,
    sourceType: safeSourceType(metadata.sourceType || metadata.source_type),
    sourceUrl,
    repository,
    title: truncate(metadata.title || `파일 업로드 코드 리뷰 - ${primaryFile.name}`, 177),
    summary,
    riskLevel,
    findings: [
      ...(markdownFindings.length ? markdownFindings : fallbackFindings),
      ...(relatedFiles.length
        ? [
            {
              category: 'code' as const,
              severity: 'low' as const,
              title: '관련 파일 내용',
              body: relatedFiles
                .slice(0, 5)
                .map((file) => `### ${file.name}\n\n\`\`\`\n${truncate(file.text, 1600)}\n\`\`\``)
                .join('\n\n'),
              filePath: null,
              lineNumber: null,
              recommendation: '핵심 파일은 상세 리뷰에서 흐름 단위로 다시 확인하세요.',
            },
          ]
        : []),
    ],
    testGaps: testsSection
      ? testsSection
          .split(/\r?\n/)
          .map((line) => line.replace(/^[-*]\s*/, '').trim())
          .filter(Boolean)
      : [],
    changedFiles,
    excludedFiles: [],
    diffHash: simpleHash(combinedSnapshot),
    diffSnapshot: truncate(combinedSnapshot, 119997),
    model: 'file-upload',
  }
}

const UPLOAD_JSON_TEMPLATE = `{
  "sourceUrl": "https://github.com/owner/repo/commit/sha",
  "reviewGoal": "리뷰할 로직 설명 (선택)",
  "title": "리뷰 제목",
  "summary": "전체 요약",
  "riskLevel": "low | medium | high",
  "model": "claude-sonnet-4-6",
  "findings": [
    {
      "category": "structure | process | code | syntax | architecture | clean_code | diagram",
      "severity": "low | medium | high",
      "title": "항목 제목",
      "body": "본문 (Markdown 지원)",
      "recommendation": "개선 방향",
      "filePath": "src/example.ts",
      "lineNumber": 42
    }
  ],
  "testGaps": ["테스트 부족 항목"]
}`

const CLAUDE_CODE_SKILL = `# towercrane 코드 리뷰 업로드 스킬
# ~/.claude/skills/towercrane-review.md 에 저장

## 사용법
/towercrane-review <리뷰 주제>

## 동작
1. 주제 관련 파일을 ripgrep으로 탐색
2. 백엔드 + 프론트 코드 읽기
3. 구조화된 리뷰 생성
4. POST https://api.hibot-docu.com/api/code-reviews/upload

## 환경 변수 필요
TOWERCRANE_TOKEN=<로그인 후 발급받은 토큰>
TOWERCRANE_COMMIT_URL=<분석할 커밋 URL>`

function UploadGuideDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'api' | 'json'>('api')
  const [copied, setCopied] = useState(false)

  function copy(text: string) {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-md border border-surface-border bg-surface-raised shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-surface-border-soft px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-text-primary">직접 코드 리뷰 저장하기</h2>
            <p className="mt-0.5 text-xs text-text-muted">Claude Code / Codex 스킬 연동 또는 JSON 직접 업로드</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-surface-border-soft">
          {(['api', 'json'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                tab === t
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t === 'api' ? '방법 1 — Claude Code / Codex 스킬 연동' : '방법 2 — JSON 직접 업로드'}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto p-5 text-sm">
          {tab === 'api' ? (
            <div className="space-y-4">
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                <p className="font-extrabold text-text-primary">동작 흐름</p>
                <ol className="mt-3 space-y-2 text-xs leading-5 text-text-secondary">
                  <li>1. Claude Code 또는 Codex가 로컬 코드베이스를 자율 탐색</li>
                  <li>2. ripgrep으로 관련 파일 검색 → 백+프론트 코드 읽기</li>
                  <li>3. 구조화된 리뷰 JSON 생성</li>
                  <li>4. <code className="rounded bg-surface-raised px-1 font-mono text-brand-primary">POST /api/code-reviews/upload</code> 로 전송</li>
                  <li>5. towercrane에 저장 → 팀 공유 URL 발급</li>
                </ol>
              </div>

              <div>
                <p className="mb-2 text-xs font-extrabold text-text-secondary">API 엔드포인트</p>
                <div className="flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
                  <code className="flex-1 font-mono text-xs text-brand-primary">
                    POST https://api.hibot-docu.com/api/code-reviews/upload
                  </code>
                  <button
                    type="button"
                    onClick={() => copy('POST https://api.hibot-docu.com/api/code-reviews/upload')}
                    className="shrink-0 text-[11px] font-bold text-text-muted hover:text-text-primary"
                  >
                    복사
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-extrabold text-text-secondary">스킬 파일 템플릿</p>
                <div className="relative rounded-md border border-surface-border-soft bg-surface-muted p-3">
                  <pre className="overflow-x-auto font-mono text-[11px] leading-5 text-text-secondary">{CLAUDE_CODE_SKILL}</pre>
                  <button
                    type="button"
                    onClick={() => copy(CLAUDE_CODE_SKILL)}
                    className="absolute right-2 top-2 rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-text-muted hover:text-text-primary"
                  >
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-brand-border bg-brand-glass px-4 py-3 text-xs leading-5 text-brand-primary">
                💡 Claude Code가 이미 ripgrep + 파일 읽기 + tool_use 루프를 내장하고 있어
                별도 에이전트 구현 없이 스킬 파일만으로 로컬 풀스택 리뷰가 가능합니다.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                <p className="font-extrabold text-text-primary">동작 흐름</p>
                <ol className="mt-3 space-y-2 text-xs leading-5 text-text-secondary">
                  <li>1. 아래 JSON 스키마를 복사</li>
                  <li>2. 외부 AI 툴 또는 스크립트로 내용 채우기</li>
                  <li>3. <code className="rounded bg-surface-raised px-1 font-mono text-brand-primary">POST /api/code-reviews/upload</code> 로 전송</li>
                  <li>4. towercrane 목록에 즉시 반영</li>
                </ol>
              </div>

              <div>
                <p className="mb-2 text-xs font-extrabold text-text-secondary">JSON 스키마 템플릿</p>
                <div className="relative rounded-md border border-surface-border-soft bg-surface-muted p-3">
                  <pre className="overflow-x-auto font-mono text-[11px] leading-5 text-text-secondary">{UPLOAD_JSON_TEMPLATE}</pre>
                  <button
                    type="button"
                    onClick={() => copy(UPLOAD_JSON_TEMPLATE)}
                    className="absolute right-2 top-2 rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-text-muted hover:text-text-primary"
                  >
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-xs leading-5 text-text-secondary">
                <p className="font-bold text-text-primary">필수 헤더</p>
                <code className="mt-1 block font-mono text-[11px] text-brand-primary">
                  Authorization: Bearer {'<token>'}{'\n'}
                  Content-Type: application/json
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ANALYZE_STEPS = [
  { icon: '⬇️', label: 'GitHub diff 수집 중...' },
  { icon: '📂', label: '변경 파일 전체 읽는 중...' },
  { icon: '🔗', label: '연관 파일 탐색 중...' },
  { icon: '🤖', label: 'AI 코드 리뷰 생성 중...' },
  { icon: '💾', label: '리뷰 저장 중...' },
]

function AnalyzingOverlay() {
  const [step, setStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStep((prev) => (prev < ANALYZE_STEPS.length - 1 ? prev + 1 : prev))
    }, 2200)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-8 p-8">
      {/* 아이콘 애니메이션 */}
      <div className="relative flex size-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-glass opacity-60" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-brand-glass opacity-40" />
        <Code2 className="relative size-10 text-brand-primary" />
      </div>

      {/* 제목 */}
      <div className="text-center">
        <p className="text-base font-extrabold text-text-primary">AI 코드 리뷰 분석 중</p>
        <p className="mt-1 text-xs text-text-muted">diff · 전체 파일 · 연관 파일까지 읽습니다</p>
      </div>

      {/* 단계 표시 */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        {ANALYZE_STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-500 ${
              i === step
                ? 'bg-brand-glass text-brand-primary font-bold'
                : i < step
                  ? 'text-text-muted line-through opacity-50'
                  : 'text-text-muted opacity-30'
            }`}
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.label}</span>
            {i === step && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-brand-primary" />
            )}
            {i < step && (
              <Check className="ml-auto size-3.5 text-brand-primary" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CodeReviewsPage({ reviewId = null }: CodeReviewsPageProps) {
  const navigate = useNavigate()
  const reviewFileInputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [sourceUrl, setSourceUrl] = useState('')
  const [reviewGoal, setReviewGoal] = useState('')
  const [selectedSections, setSelectedSections] =
    useState<CodeReviewSection[]>(defaultReviewSections)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [showUploadGuide, setShowUploadGuide] = useState(false)
  const listQuery = useCodeReviewList({ q, page, pageSize: 20 })
  const detailQuery = useCodeReviewDetail(reviewId)
  const analyzeMutation = useAnalyzeCodeReview()
  const createReviewMutation = useCreateCodeReview()
  const sourceUrlError = getCommitUrlInputError(sourceUrl)

  useEffect(() => {
    setPage(1)
  }, [q])

  const selectedId = reviewId ?? listQuery.data?.items[0]?.id ?? null

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAnalyzeError(null)
    if (sourceUrlError) {
      setAnalyzeError(sourceUrlError)
      return
    }
    try {
      const detail = await analyzeMutation.mutateAsync({
        sourceUrl,
        reviewGoal: reviewGoal.trim() || undefined,
        sections: selectedSections,
      })
      setSourceUrl('')
      navigate({ to: '/code-reviews/$reviewId', params: { reviewId: detail.id } })
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : '분석에 실패했습니다.')
    }
  }

  async function uploadReviewFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    try {
      const payload = await buildUploadedReviewPayload(files, sourceUrl)
      const detail = await createReviewMutation.mutateAsync(payload)
      toast.success('코드 리뷰가 등록되었습니다.')
      navigate({ to: '/code-reviews/$reviewId', params: { reviewId: detail.id } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '코드 리뷰 파일 등록에 실패했습니다.')
    }
  }

  function toggleSection(section: CodeReviewSection) {
    setSelectedSections((current) => {
      if (current.includes(section)) {
        return current.filter((item) => item !== section)
      }
      return [...current, section]
    })
  }

  function fillTestReviewInput() {
    setSourceUrl(testCodeReviewCommitUrl)
    setReviewGoal(testCodeReviewGoal)
    setSelectedSections(testCodeReviewSections)
    setAnalyzeError(null)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-full flex-col gap-4">
      <PageHeader
        icon={Code2}
        title="코드 리뷰 게시판"
        description="GitHub commit URL 또는 직접 작성한 리뷰 파일을 분석하여 AI 코드 리뷰 히스토리를 저장하고 공유합니다."
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={reviewFileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".json,.md,.markdown,.txt,.ts,.tsx,.js,.jsx,.css,.html,.mmd,.mermaid,.java,.kt,.py,.go,.rs,.sql,.yml,.yaml"
              onChange={uploadReviewFiles}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => reviewFileInputRef.current?.click()}
              disabled={analyzeMutation.isPending || createReviewMutation.isPending}
            >
              {createReviewMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              리뷰 파일 업로드
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadGuide(true)}
            >
              <Info className="mr-1.5 size-3.5" />
              직접 저장하기 구현 계획
            </Button>
          </div>
        }
      />
      {showUploadGuide && <UploadGuideDialog onClose={() => setShowUploadGuide(false)} />}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* 왼쪽: 입력 폼 + 목록 */}
        <section className="flex min-h-0 flex-col rounded-md border border-surface-border bg-surface-raised">
          {/* 패널 헤더 */}
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border-soft px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-text-primary">
              <FileCode2 className="size-4 text-brand-primary" />
              코드 리뷰 분석
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={fillTestReviewInput}
              disabled={analyzeMutation.isPending}
            >
              <Code2 className="mr-1.5 size-3.5" />
              테스트
            </Button>
          </div>

          {/* 입력 폼 */}
          <form
            onSubmit={analyze}
            className="shrink-0 border-b border-surface-border-soft p-4"
          >
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <GitPullRequest className="size-4 shrink-0 text-text-muted" />
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
                placeholder="https://github.com/owner/repo/commit/sha"
                disabled={analyzeMutation.isPending}
              />
            </label>
            {sourceUrlError ? (
              <p className="mt-1.5 text-xs font-semibold text-destructive">{sourceUrlError}</p>
            ) : null}

            <label className="mt-3 block rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
              <span className="text-[11px] font-extrabold text-text-secondary">리뷰할 로직 설명</span>
              <textarea
                value={reviewGoal}
                onChange={(event) => setReviewGoal(event.target.value)}
                className="mt-1.5 min-h-16 w-full resize-y bg-transparent text-xs leading-5 text-text-primary outline-none placeholder:text-text-muted"
                placeholder="예: 워크스페이스 삭제 권한, delete mutation 후 목록 갱신 흐름 위주로 리뷰"
                maxLength={1000}
                disabled={analyzeMutation.isPending}
              />
            </label>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {reviewSectionOptions.map((option) => {
                const checked = selectedSections.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={`flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border px-2 text-[11px] font-bold transition-colors ${
                      checked
                        ? 'border-brand-border bg-brand-glass text-brand-primary'
                        : 'border-surface-border-soft bg-surface-muted text-text-secondary hover:border-brand-border hover:bg-brand-glass'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(option.value)}
                      className="size-3 accent-[var(--brand-primary)]"
                      disabled={analyzeMutation.isPending}
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>

            <Button
              type="submit"
              size="sm"
              className="mt-3 w-full"
              disabled={
                !sourceUrl.trim() ||
                Boolean(sourceUrlError) ||
                selectedSections.length === 0 ||
                analyzeMutation.isPending
              }
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <FileCode2 className="mr-1.5 size-3.5" />
              )}
              분석 후 저장
            </Button>
            {analyzeError ? (
              <p className="mt-2 text-xs font-semibold text-danger-500">{analyzeError}</p>
            ) : null}
          </form>

          {/* 검색 */}
          <div className="shrink-0 border-b border-surface-border-soft p-3">
            <label className="flex h-9 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <Search className="size-4 text-text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="제목, 저장소, 요약 검색"
              />
            </label>
          </div>

          {/* 목록 */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                불러오는 중
              </div>
            ) : listQuery.data?.items.length ? (
              <div className="flex flex-col gap-2">
                {listQuery.data.items.map((item) => {
                  const isActive = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: '/code-reviews/$reviewId',
                          params: { reviewId: item.id },
                        })
                      }
                      className={`rounded-md border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border-soft bg-surface-muted hover:border-brand-border hover:bg-brand-glass'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 text-sm font-extrabold text-text-primary">
                          {item.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-bold ${riskClassName(
                            item.riskLevel,
                          )}`}
                        >
                          {riskLabel(item.riskLevel)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-text-secondary">
                        {truncate(item.summary)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
                        <span>{item.repository}</span>
                        <span>{item.createdByName}</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-brand-primary">
                        평가 {item.findingCount}개
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-12 text-center">
                <Code2 className="mx-auto size-8 text-text-muted" />
                <p className="mt-3 text-sm font-bold text-text-primary">저장된 코드 리뷰가 없습니다.</p>
                <p className="mt-1 text-xs text-text-secondary">
                  GitHub commit URL을 입력하면 변경 파일 분석 후 리뷰가 저장됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between border-t border-surface-border-soft px-3 py-2 text-xs text-text-muted">
            <span>총 {listQuery.data?.total ?? 0}건</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                이전
              </Button>
              <span>
                {page} / {listQuery.data?.totalPages ?? 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= (listQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </section>

        {/* 오른쪽: 상세 패널 */}
        <section className="min-h-0 min-w-0 rounded-md border border-surface-border bg-surface-raised">
          {analyzeMutation.isPending || createReviewMutation.isPending ? (
            <AnalyzingOverlay />
          ) : reviewId ? (
            <ReviewDetailPanel
              reviewId={reviewId}
              onBack={() => navigate({ to: '/code-reviews' })}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <Code2 className="mx-auto size-10 text-text-muted" />
                <h3 className="mt-4 text-base font-extrabold text-text-primary">
                  코드 리뷰를 선택하세요
                </h3>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ReviewDetailPanel({
  reviewId,
  onBack,
}: {
  reviewId: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const detailQuery = useCodeReviewDetail(reviewId)
  const updateMutation = useUpdateCodeReview(reviewId)
  const deleteMutation = useDeleteCodeReview()
  const [isEditing, setIsEditing] = useState(false)
  const [showTaskLinkDialog, setShowTaskLinkDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!detailQuery.data) return
    setTitle(detailQuery.data.title)
    setSummary(detailQuery.data.summary)
    setIsEditing(false)
  }, [detailQuery.data])

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        코드 리뷰를 불러오는 중
      </div>
    )
  }

  if (!detailQuery.data) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center text-sm text-text-muted">
        코드 리뷰를 찾을 수 없습니다.
      </div>
    )
  }

  const detail = detailQuery.data

  async function save() {
    await updateMutation.mutateAsync({ title, summary })
    setIsEditing(false)
  }

  async function remove() {
    if (!window.confirm('이 코드 리뷰를 삭제할까요?')) return
    await deleteMutation.mutateAsync(reviewId)
    navigate({ to: '/code-reviews' })
  }

  function copyReferenceUrl() {
    const lines = [
      'Towercrane 코드 리뷰 참고',
      `리뷰 ID: ${detail.id}`,
      `제목: ${detail.title}`,
      `URL: ${publicReferenceUrl(`/code-reviews/${detail.id}`)}`,
    ]
    if (detail.taskId) lines.splice(3, 0, `연결 업무 ID: ${detail.taskId}`)
    void copyText(lines.join('\n'), '코드 리뷰 참고 URL을 복사했습니다.')
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="border-b border-surface-border-soft p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {isEditing ? (
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="ui-input h-10 w-full max-w-2xl text-base font-extrabold"
              />
            ) : (
              <h2 className="text-xl font-extrabold text-text-primary">{detail.title}</h2>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
              <span>{detail.repository}</span>
              <span>{detail.createdByName}</span>
              <span>{formatDateTime(detail.createdAt)}</span>
              <span
                className={`rounded-sm border px-2 py-0.5 ${riskClassName(detail.riskLevel)}`}
              >
                위험도 {riskLabel(detail.riskLevel)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyReferenceUrl}>
              <Copy className="mr-1.5 size-3.5" />
              참고 URL
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTaskLinkDialog(true)}
            >
              <Link2 className="mr-1.5 size-3.5" />
              {detail.taskId ? '업무 연결 변경' : '업무 연결'}
            </Button>
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-muted px-3 text-sm font-semibold text-text-primary hover:bg-surface-strong"
            >
              <ExternalLink className="mr-1.5 size-3.5" />
              원본
            </a>
            {detail.canEdit ? (
              isEditing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="mr-1.5 size-3.5" />
                    취소
                  </Button>
                  <Button size="sm" onClick={save} disabled={updateMutation.isPending}>
                    <Check className="mr-1.5 size-3.5" />
                    저장
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  수정
                </Button>
              )
            ) : null}
            {detail.canDelete ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={remove}
                disabled={deleteMutation.isPending}
                className="text-danger-500 hover:text-danger-500"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                삭제
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onBack}>
              닫기
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-extrabold text-text-primary">전체 요약</h3>
            {isEditing ? (
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="ui-input mt-2 min-h-36 w-full resize-y py-3 leading-6"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm leading-6 text-text-secondary">
                {detail.summary}
              </p>
            )}
          </section>

          <FindingSection findings={detail.findings} />
        </div>
      </div>
      {showTaskLinkDialog ? (
        <TaskLinkDialog
          detail={detail}
          onClose={() => setShowTaskLinkDialog(false)}
        />
      ) : null}
    </div>
  )
}

function TaskLinkDialog({
  detail,
  onClose,
}: {
  detail: CodeReviewDetail
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const tasksQuery = useTasks({
    q,
    page: 1,
    pageSize: 10,
    archived: false,
    sort: 'recent',
  })
  const updateMutation = useUpdateCodeReview(detail.id)

  async function connect(taskId: string | null) {
    await updateMutation.mutateAsync({ taskId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 ui-overlay" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-text-primary">
              코드 리뷰를 업무에 연결
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              업무를 선택하면 이 코드 리뷰가 해당 업무의 리뷰 목록에 표시됩니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div>
            <label className="text-xs font-extrabold text-text-secondary">
              업무 검색
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
              <Search className="size-4 text-text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="제목 또는 내용으로 검색"
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          </div>

          {detail.taskId ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-brand-border bg-brand-glass p-3">
              <p className="min-w-0 break-all text-xs font-bold text-brand-primary">
                현재 연결: {detail.taskId}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => connect(null)}
                disabled={updateMutation.isPending}
              >
                <Unlink className="mr-1.5 size-3.5" />
                해제
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            {tasksQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted p-8 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                업무를 불러오는 중
              </div>
            ) : tasksQuery.data?.items.length ? (
              tasksQuery.data.items.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => connect(task.id)}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-surface-border-soft bg-surface-muted p-3 text-left transition-colors hover:border-brand-border hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-text-primary">
                        {task.title}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-text-muted">
                        {task.id}
                      </p>
                    </div>
                    <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                  {task.content ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-muted">
                      {task.content}
                    </p>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-8 text-center text-sm text-text-muted">
                검색된 업무가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FindingSection({ findings }: { findings: CodeReviewFinding[] }) {
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">검토 항목</h3>
      <div className="mt-2 space-y-2">
        {findings.length ? (
          findings.map((finding, index) => (
            <div
              key={`${finding.title}-${index}`}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                    {findingCategoryLabel(finding.category)}
                  </span>
                  <h4 className="min-w-0 text-sm font-extrabold text-text-primary">
                    {finding.title}
                  </h4>
                </div>
                <span
                  className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
                    finding.severity,
                  )}`}
                >
                  {riskLabel(finding.severity)}
                </span>
              </div>
              <FindingBody finding={finding} />
              <p className="mt-2 text-sm font-semibold text-text-primary">
                권장: {finding.recommendation}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
                {finding.filePath ? <span>{finding.filePath}</span> : null}
                {finding.lineNumber ? <span>line {finding.lineNumber}</span> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">평가 항목이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function FindingBody({ finding }: { finding: CodeReviewFinding }) {
  if (finding.category === 'diagram') {
    const chart = extractMermaidChart(finding.body)

    if (!isMermaidChart(chart)) {
      return (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
          {finding.body}
        </pre>
      )
    }

    return (
      <div className="mt-3 rounded-md border border-surface-border-soft bg-surface-raised p-3">
        <Mermaid chart={chart} className="min-h-36" />
      </div>
    )
  }

  if (shouldRenderCodeBlock(finding.category)) {
    if (finding.category === 'code' || finding.category === 'syntax') {
      return <HighlightedMarkdownBody value={finding.body} />
    }

    return (
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
        {finding.body}
      </pre>
    )
  }

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
      {finding.body}
    </p>
  )
}

function HighlightedMarkdownBody({ value }: { value: string }) {
  return (
    <div className="mt-3 space-y-4 text-sm leading-6 text-text-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h4: ({ children }) => (
            <h4 className="pt-2 text-sm font-extrabold text-text-primary">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
              {children}
            </p>
          ),
          hr: () => <hr className="my-5 border-surface-border-soft" />,
          ol: ({ children }) => (
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-text-secondary">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
              {children}
            </ul>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          pre: ({ children }) => (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            if (className?.includes('hljs') || className?.startsWith('language-')) {
              return <code className={className}>{children}</code>
            }

            return (
              <code className="rounded-sm border border-surface-border-soft bg-surface-muted px-1 py-0.5 font-mono text-[0.92em] text-text-primary">
                {children}
              </code>
            )
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}
