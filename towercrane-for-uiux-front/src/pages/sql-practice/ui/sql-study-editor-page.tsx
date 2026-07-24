import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  Database,
  FileUp,
  GitFork,
  Info,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'

import type {
  SqlStudyLevel,
  SqlStudyMeta,
  SqlStudyVisibility,
  SqlStudyWorkspacePayload,
  SqlUserPracticeProblemPayload,
} from '../../../entities/sql-practice/model/types'
import {
  useCreateSqlPersonalPracticeProblem,
  useCreateSqlPersonalPracticeProblemSet,
  useCreateSqlTeamPracticeProblem,
  useCreateSqlTeamPracticeProblemSet,
  useDeleteSqlPersonalPracticeProblem,
  useDeleteSqlTeamPracticeProblem,
  useGenerateSqlPersonalPracticeAnswer,
  useGenerateSqlPersonalPracticeProblemSetProblems,
  useGenerateSqlTeamPracticeAnswer,
  useGenerateSqlTeamPracticeProblemSetProblems,
  useRegenerateSqlPersonalPracticeErd,
  useRegenerateSqlTeamPracticeErd,
  useReplaceSqlPersonalPracticeSchemaVersion,
  useReplaceSqlTeamPracticeSchemaVersion,
  useSqlPersonalPracticeErd,
  useSqlPersonalPracticeProblems,
  useSqlPersonalPracticeProblemSets,
  useSqlPersonalPracticeTables,
  useSqlPersonalPracticeWorkspace,
  useSqlTeamPracticeErd,
  useSqlTeamPracticeProblems,
  useSqlTeamPracticeProblemSets,
  useSqlTeamPracticeTables,
  useSqlTeamPracticeWorkspace,
  useUpdateSqlPersonalPracticeErd,
  useUpdateSqlPersonalPracticeProblem,
  useUpdateSqlPersonalPracticeWorkspace,
  useUpdateSqlTeamPracticeErd,
  useUpdateSqlTeamPracticeProblem,
  useUpdateSqlTeamPracticeWorkspace,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlErdView } from '../../../features/sql-practice/ui/sql-erd-view'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { SqlPersonalSchemaReplaceDialog } from './sql-personal-schema-replace-dialog'

type StudyScope = 'personal' | 'team'
type EditorStep = 'meta' | 'dataset' | 'erd' | 'problems'

const STEPS: Array<{
  id: EditorStep
  label: string
  description: string
  icon: typeof Info
}> = [
  { id: 'meta', label: '1. 학습 정보', description: '주제와 학습 목표', icon: Info },
  { id: 'dataset', label: '2. 데이터셋', description: 'SQL 파일과 테이블', icon: Database },
  { id: 'erd', label: '3. ERD', description: '관계도 생성과 편집', icon: GitFork },
  { id: 'problems', label: '4. 문제', description: '문제와 정답 설정', icon: ListChecks },
]

const EMPTY_PROBLEM: SqlUserPracticeProblemPayload = {
  title: '',
  description: '',
  level: 1,
  targetTables: [],
  starterSql: '',
  answerSql: '',
  explanation: '',
  visibility: 'private',
  status: 'draft',
}

export function SqlStudyEditorPage({ scope }: { scope: StudyScope }) {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId?: string }
  const navigate = useNavigate()
  const [step, setStep] = useState<EditorStep>('meta')
  const personalWorkspaceQuery = useSqlPersonalPracticeWorkspace(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamWorkspaceQuery = useSqlTeamPracticeWorkspace(
    scope === 'team' ? workspaceId : undefined,
  )
  const workspace =
    scope === 'personal' ? personalWorkspaceQuery.data : teamWorkspaceQuery.data
  const isLoading =
    scope === 'personal'
      ? personalWorkspaceQuery.isLoading
      : teamWorkspaceQuery.isLoading
  const canEdit =
    scope === 'personal' ||
    teamWorkspaceQuery.data?.myRole === 'owner' ||
    teamWorkspaceQuery.data?.myRole === 'editor'

  if (!workspaceId) return null
  if (isLoading) {
    return (
      <Card className="flex min-h-72 items-center justify-center rounded-md">
        <Loader2 className="size-5 animate-spin text-brand-primary" />
      </Card>
    )
  }
  if (!workspace) {
    return (
      <Card className="rounded-md p-8 text-center text-sm font-semibold text-text-muted">
        스터디를 찾을 수 없습니다.
      </Card>
    )
  }

  const learningPath =
    scope === 'personal'
      ? `/sql/personal/workspaces/${workspaceId}`
      : `/sql/team/workspaces/${workspaceId}`
  const listPath = scope === 'personal' ? '/sql/personal' : '/sql/team'

  return (
    <section className="space-y-4 pb-16">
      <div className="flex flex-col gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="ui-icon-button size-9 shrink-0"
            onClick={() => navigate({ to: listPath })}
            aria-label="스터디 목록"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-black text-brand-primary">
              {scope === 'personal' ? '개인 스터디' : '팀 스터디'} 편집기
            </p>
            <h1 className="truncate text-lg font-black text-text-primary">{workspace.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => window.location.reload()}
            aria-label="페이지 새로고침"
            title="페이지 새로고침"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button className="gap-1.5" onClick={() => navigate({ to: learningPath })}>
            <BookOpen className="size-4" />
            학습 시작
          </Button>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm font-semibold text-text-secondary">
          이 스터디는 조회만 가능합니다. owner 또는 editor 권한이 있어야 수정할 수 있습니다.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit rounded-md p-2">
          <nav className="space-y-1">
            {STEPS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                    step === item.id
                      ? 'border-brand-border bg-brand-glass'
                      : 'border-transparent hover:border-surface-border-soft hover:bg-surface-muted'
                  }`}
                  onClick={() => setStep(item.id)}
                >
                  <span className="ui-icon-button-brand size-8 shrink-0">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-text-primary">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">{item.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </Card>

        {step === 'meta' && (
          <StudyMetaPanel
            key={`${scope}:${workspaceId}:${workspace.updatedAt}`}
            scope={scope}
            workspaceId={workspaceId}
            workspace={workspace}
            disabled={!canEdit}
          />
        )}
        {step === 'dataset' && (
          <StudyDatasetPanel scope={scope} workspaceId={workspaceId} disabled={!canEdit} />
        )}
        {step === 'erd' && (
          <StudyErdPanel scope={scope} workspaceId={workspaceId} disabled={!canEdit} />
        )}
        {step === 'problems' && (
          <StudyProblemsPanel scope={scope} workspaceId={workspaceId} disabled={!canEdit} />
        )}
      </div>
    </section>
  )
}

function StudyMetaPanel({
  scope,
  workspaceId,
  workspace,
  disabled,
}: {
  scope: StudyScope
  workspaceId: string
  workspace: SqlStudyMeta & { title: string; description: string }
  disabled: boolean
}) {
  const personalMutation = useUpdateSqlPersonalPracticeWorkspace(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamMutation = useUpdateSqlTeamPracticeWorkspace(
    scope === 'team' ? workspaceId : undefined,
  )
  const [form, setForm] = useState<SqlStudyWorkspacePayload>(() => ({
    title: workspace.title,
    description: workspace.description,
    learningGoal: workspace.learningGoal,
    level: workspace.level,
    topics: workspace.topics,
    visibility: workspace.visibility,
  }))
  const [topicsText, setTopicsText] = useState(() => workspace.topics.join(', '))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      ...form,
      learningGoal: form.learningGoal?.trim() || null,
      topics: topicsText.split(',').map((topic) => topic.trim()).filter(Boolean),
    }
    if (scope === 'personal') await personalMutation.mutateAsync(payload)
    else await teamMutation.mutateAsync(payload)
  }

  const pending = personalMutation.isPending || teamMutation.isPending

  return (
    <EditorCard
      title="학습 정보"
      description="학습자가 파일명이 아닌 주제와 목표로 스터디를 이해하도록 설정합니다."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="스터디 주제">
          <Input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            maxLength={80}
            disabled={disabled}
            required
          />
        </Field>
        <Field label="학습 목표">
          <Textarea
            value={form.learningGoal ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, learningGoal: event.target.value }))
            }
            rows={3}
            maxLength={2000}
            disabled={disabled}
            placeholder="이 스터디에서 익힐 SQL 개념과 수행 목표"
          />
        </Field>
        <Field label="설명">
          <Textarea
            value={form.description ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={4}
            maxLength={1000}
            disabled={disabled}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="난이도">
            <Select
              value={form.level ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  level: (event.target.value || null) as SqlStudyLevel | null,
                }))
              }
              disabled={disabled}
            >
              <option value="">미설정</option>
              <option value="beginner">입문</option>
              <option value="basic">초급</option>
              <option value="intermediate">중급</option>
              <option value="advanced">고급</option>
            </Select>
          </Field>
          <Field label="공개 범위">
            <Select
              value={form.visibility}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  visibility: event.target.value as SqlStudyVisibility,
                }))
              }
              disabled={disabled}
            >
              <option value="private">비공개</option>
              <option value="public">공개</option>
            </Select>
          </Field>
        </div>
        <Field label="태그" hint="쉼표로 구분합니다.">
          <Input
            value={topicsText}
            onChange={(event) => setTopicsText(event.target.value)}
            placeholder="JOIN, GROUP BY, 서브쿼리"
            disabled={disabled}
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" className="gap-1.5" disabled={disabled || pending || !form.title.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            학습 정보 저장
          </Button>
        </div>
      </form>
    </EditorCard>
  )
}

function StudyDatasetPanel({
  scope,
  workspaceId,
  disabled,
}: {
  scope: StudyScope
  workspaceId: string
  disabled: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const personalWorkspace = useSqlPersonalPracticeWorkspace(scope === 'personal' ? workspaceId : undefined)
  const teamWorkspace = useSqlTeamPracticeWorkspace(scope === 'team' ? workspaceId : undefined)
  const personalTables = useSqlPersonalPracticeTables(scope === 'personal' ? workspaceId : undefined)
  const teamTables = useSqlTeamPracticeTables(scope === 'team' ? workspaceId : undefined)
  const personalProblems = useSqlPersonalPracticeProblems(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamProblems = useSqlTeamPracticeProblems(scope === 'team' ? workspaceId : undefined)
  const personalMutation = useReplaceSqlPersonalPracticeSchemaVersion(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamMutation = useReplaceSqlTeamPracticeSchemaVersion(
    scope === 'team' ? workspaceId : undefined,
  )
  const workspace = scope === 'personal' ? personalWorkspace.data : teamWorkspace.data
  const tables = scope === 'personal' ? personalTables.data ?? [] : teamTables.data ?? []
  const schemaVersion =
    scope === 'personal'
      ? personalProblems.data?.schemaVersion
      : teamProblems.data?.schemaVersion

  const handleSubmit = async (input: { file: File; title?: string; description?: string }) => {
    setError(null)
    try {
      if (scope === 'personal') await personalMutation.mutateAsync(input)
      else await teamMutation.mutateAsync(input)
      setDialogOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '데이터셋 교체에 실패했습니다.')
    }
  }

  return (
    <EditorCard
      title="데이터셋"
      description=".sql 파일을 올리면 격리된 SQLite 학습 DB와 ERD가 자동으로 생성됩니다."
    >
      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-text-primary">
              {schemaVersion?.title ?? '기본 데이터셋'}
            </p>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              {schemaVersion?.sourceFileName ?? '기본 SQL'} · v{schemaVersion?.version ?? 1} · 테이블 {tables.length}개
            </p>
          </div>
          <Button
            type="button"
            className="gap-1.5"
            onClick={() => setDialogOpen(true)}
            disabled={disabled}
          >
            <FileUp className="size-4" />
            SQL 파일 설정
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table.tableName}
            className="rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3"
          >
            <p className="truncate text-sm font-black text-text-primary">{table.tableName}</p>
            <p className="mt-1 text-xs text-text-muted">
              컬럼 {table.columns.length}개 · {table.rowCount}행
            </p>
          </div>
        ))}
      </div>
      <SqlPersonalSchemaReplaceDialog
        open={dialogOpen}
        workspaceTitle={workspace?.title ?? 'SQL 스터디'}
        currentVersion={schemaVersion}
        isPending={personalMutation.isPending || teamMutation.isPending}
        errorMessage={error}
        onSubmit={handleSubmit}
        onClose={() => {
          setDialogOpen(false)
          setError(null)
        }}
      />
    </EditorCard>
  )
}

function StudyErdPanel({
  scope,
  workspaceId,
  disabled,
}: {
  scope: StudyScope
  workspaceId: string
  disabled: boolean
}) {
  const personalQuery = useSqlPersonalPracticeErd(scope === 'personal' ? workspaceId : undefined)
  const teamQuery = useSqlTeamPracticeErd(scope === 'team' ? workspaceId : undefined)
  const personalUpdate = useUpdateSqlPersonalPracticeErd(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamUpdate = useUpdateSqlTeamPracticeErd(scope === 'team' ? workspaceId : undefined)
  const personalRegenerate = useRegenerateSqlPersonalPracticeErd(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamRegenerate = useRegenerateSqlTeamPracticeErd(
    scope === 'team' ? workspaceId : undefined,
  )
  const mmd = scope === 'personal' ? personalQuery.data?.mmd : teamQuery.data?.mmd
  return (
    <StudyErdEditor
      key={mmd ?? 'empty'}
      scope={scope}
      initialMmd={mmd ?? 'erDiagram\n'}
      disabled={disabled}
      personalUpdate={personalUpdate}
      teamUpdate={teamUpdate}
      personalRegenerate={personalRegenerate}
      teamRegenerate={teamRegenerate}
    />
  )
}

function StudyErdEditor({
  scope,
  initialMmd,
  disabled,
  personalUpdate,
  teamUpdate,
  personalRegenerate,
  teamRegenerate,
}: {
  scope: StudyScope
  initialMmd: string
  disabled: boolean
  personalUpdate: ReturnType<typeof useUpdateSqlPersonalPracticeErd>
  teamUpdate: ReturnType<typeof useUpdateSqlTeamPracticeErd>
  personalRegenerate: ReturnType<typeof useRegenerateSqlPersonalPracticeErd>
  teamRegenerate: ReturnType<typeof useRegenerateSqlTeamPracticeErd>
}) {
  const [value, setValue] = useState(initialMmd)

  const handleSave = async () => {
    if (scope === 'personal') await personalUpdate.mutateAsync(value)
    else await teamUpdate.mutateAsync(value)
  }
  const handleRegenerate = async () => {
    const response =
      scope === 'personal'
        ? await personalRegenerate.mutateAsync()
        : await teamRegenerate.mutateAsync()
    setValue(response.mmd ?? 'erDiagram\n')
  }
  const pending =
    personalUpdate.isPending ||
    teamUpdate.isPending ||
    personalRegenerate.isPending ||
    teamRegenerate.isPending

  return (
    <EditorCard
      title="ERD"
      description="업로드한 데이터셋에서 자동 생성하거나 Mermaid erDiagram 텍스트를 직접 수정합니다."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={24}
            className="min-h-[520px] font-mono text-xs leading-5"
            spellCheck={false}
            disabled={disabled}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5"
              onClick={handleRegenerate}
              disabled={disabled || pending}
            >
              <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} />
              데이터셋에서 재생성
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              onClick={handleSave}
              disabled={disabled || pending || !value.trim()}
            >
              <Save className="size-4" />
              ERD 저장
            </Button>
          </div>
        </div>
        <div className="min-h-[520px] overflow-auto rounded-md border border-surface-border-soft bg-surface-muted p-4">
          {value.trim() ? (
            <SqlErdView mmd={value} />
          ) : (
            <div className="flex min-h-64 items-center justify-center text-sm text-text-muted">
              ERD 텍스트를 입력하면 미리보기가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </EditorCard>
  )
}

function StudyProblemsPanel({
  scope,
  workspaceId,
  disabled,
}: {
  scope: StudyScope
  workspaceId: string
  disabled: boolean
}) {
  const personalQuery = useSqlPersonalPracticeProblems(scope === 'personal' ? workspaceId : undefined)
  const teamQuery = useSqlTeamPracticeProblems(scope === 'team' ? workspaceId : undefined)
  const personalCreate = useCreateSqlPersonalPracticeProblem(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamCreate = useCreateSqlTeamPracticeProblem(scope === 'team' ? workspaceId : undefined)
  const personalUpdate = useUpdateSqlPersonalPracticeProblem(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamUpdate = useUpdateSqlTeamPracticeProblem(scope === 'team' ? workspaceId : undefined)
  const personalDelete = useDeleteSqlPersonalPracticeProblem(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamDelete = useDeleteSqlTeamPracticeProblem(scope === 'team' ? workspaceId : undefined)
  const personalGenerate = useGenerateSqlPersonalPracticeAnswer(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamGenerate = useGenerateSqlTeamPracticeAnswer(scope === 'team' ? workspaceId : undefined)
  const personalProblemSets = useSqlPersonalPracticeProblemSets(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamProblemSets = useSqlTeamPracticeProblemSets(scope === 'team' ? workspaceId : undefined)
  const personalCreateSet = useCreateSqlPersonalPracticeProblemSet(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamCreateSet = useCreateSqlTeamPracticeProblemSet(scope === 'team' ? workspaceId : undefined)
  const personalGenerateSetProblems = useGenerateSqlPersonalPracticeProblemSetProblems(
    scope === 'personal' ? workspaceId : undefined,
  )
  const teamGenerateSetProblems = useGenerateSqlTeamPracticeProblemSetProblems(
    scope === 'team' ? workspaceId : undefined,
  )
  const problems = useMemo(
    () =>
      scope === 'personal'
        ? personalQuery.data?.problems ?? []
        : teamQuery.data?.problems ?? [],
    [personalQuery.data?.problems, scope, teamQuery.data?.problems],
  )
  const problemSets = useMemo(
    () =>
      scope === 'personal'
        ? personalProblemSets.data?.problemSets ?? personalQuery.data?.problemSets ?? []
        : teamProblemSets.data?.problemSets ?? teamQuery.data?.problemSets ?? [],
    [
      personalProblemSets.data?.problemSets,
      personalQuery.data?.problemSets,
      scope,
      teamProblemSets.data?.problemSets,
      teamQuery.data?.problemSets,
    ],
  )
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const selectedSet = problemSets.find((set) => set.id === selectedSetId) ?? problemSets[0]
  const visibleProblems = useMemo(
    () => {
      const scopedProblems = selectedSet
        ? problems.filter((problem) => problem.problemSetId === selectedSet.id)
        : problems
      return [...scopedProblems].sort(
        (first, second) =>
          first.orderIdx - second.orderIdx ||
          first.level - second.level ||
          second.updatedAt.localeCompare(first.updatedAt),
      )
    },
    [problems, selectedSet],
  )
  const [problemSetForm, setProblemSetForm] = useState({
    title: '',
    description: '',
    level: '',
    status: 'draft',
  })
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false)
  const [isProblemDialogOpen, setIsProblemDialogOpen] = useState(false)
  const [generationInstructions, setGenerationInstructions] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SqlUserPracticeProblemPayload>(EMPTY_PROBLEM)
  const [targets, setTargets] = useState('')

  const handleEdit = (problem: (typeof problems)[number]) => {
    setEditingId(problem.id)
    setForm({
      title: problem.title,
      problemSetId: problem.problemSetId ?? selectedSet?.id,
      description: problem.description,
      level: problem.level,
      targetTables: problem.targetTables,
      starterSql: problem.starterSql ?? '',
      answerSql: problem.answerSql,
      explanation: problem.explanation ?? '',
      visibility: 'private',
      status: problem.status === 'archived' ? 'draft' : problem.status,
    })
    setTargets(problem.targetTables.join(', '))
    setIsProblemDialogOpen(true)
  }

  const reset = () => {
    setEditingId(null)
    setForm({ ...EMPTY_PROBLEM, problemSetId: selectedSet?.id })
    setTargets('')
  }
  const handleNewProblem = () => {
    reset()
    setIsProblemDialogOpen(true)
  }
  const payload = (): SqlUserPracticeProblemPayload => ({
    ...form,
    problemSetId: selectedSet?.id ?? form.problemSetId,
    targetTables: targets.split(',').map((table) => table.trim()).filter(Boolean),
    starterSql: form.starterSql?.trim() || undefined,
    explanation: form.explanation?.trim() || undefined,
    visibility: 'private',
  })
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = payload()
    if (editingId) {
      if (scope === 'personal') {
        await personalUpdate.mutateAsync({ id: editingId, payload: next })
      } else {
        await teamUpdate.mutateAsync({ id: editingId, payload: next })
      }
    } else if (scope === 'personal') {
      await personalCreate.mutateAsync(next)
    } else {
      await teamCreate.mutateAsync(next)
    }
    setIsProblemDialogOpen(false)
    reset()
  }
  const handleCreateSet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      title: problemSetForm.title,
      description: problemSetForm.description,
      level: problemSetForm.level ? Number(problemSetForm.level) : null,
      status: problemSetForm.status as 'draft' | 'published',
    }
    const created =
      scope === 'personal'
        ? await personalCreateSet.mutateAsync(payload)
        : await teamCreateSet.mutateAsync(payload)
    setSelectedSetId(created.id)
    setProblemSetForm({ title: '', description: '', level: '', status: 'draft' })
    setIsSetDialogOpen(false)
    setEditingId(null)
  }
  const handleGenerateSetProblems = async () => {
    if (!selectedSet) return
    const generationPayload = {
      problemSetId: selectedSet.id,
      count: 10,
      additionalInstructions: generationInstructions.trim() || undefined,
    }
    if (scope === 'personal') {
      await personalGenerateSetProblems.mutateAsync(generationPayload)
    } else {
      await teamGenerateSetProblems.mutateAsync(generationPayload)
    }
  }
  const handleGenerate = async () => {
    const request = {
      title: form.title.trim() || undefined,
      description: form.description,
      level: form.level,
      targetTables: payload().targetTables,
    }
    const response =
      scope === 'personal'
        ? await personalGenerate.mutateAsync(request)
        : await teamGenerate.mutateAsync(request)
    setForm((current) => ({
      ...current,
      answerSql: response.answerSql,
      explanation: response.explanation ?? current.explanation,
    }))
  }
  const handleDelete = async (id: string) => {
    if (!window.confirm('이 문제를 삭제할까요?')) return
    if (scope === 'personal') await personalDelete.mutateAsync(id)
    else await teamDelete.mutateAsync(id)
    if (editingId === id) {
      setIsProblemDialogOpen(false)
      reset()
    }
  }
  const handleMoveProblem = async (
    problem: (typeof visibleProblems)[number],
    index: number,
    direction: -1 | 1,
  ) => {
    const target = visibleProblems[index + direction]
    if (!target) return
    const nextProblemOrder = index + direction
    const nextTargetOrder = index
    if (scope === 'personal') {
      await Promise.all([
        personalUpdate.mutateAsync({ id: problem.id, payload: { orderIdx: nextProblemOrder } }),
        personalUpdate.mutateAsync({ id: target.id, payload: { orderIdx: nextTargetOrder } }),
      ])
    } else {
      await Promise.all([
        teamUpdate.mutateAsync({ id: problem.id, payload: { orderIdx: nextProblemOrder } }),
        teamUpdate.mutateAsync({ id: target.id, payload: { orderIdx: nextTargetOrder } }),
      ])
    }
  }
  const pending =
    personalCreate.isPending ||
    teamCreate.isPending ||
    personalUpdate.isPending ||
    teamUpdate.isPending
  const setPending =
    personalCreateSet.isPending ||
    teamCreateSet.isPending ||
    personalGenerateSetProblems.isPending ||
    teamGenerateSetProblems.isPending

  return (
    <>
      <EditorCard
        title="시험/문제 설정"
        description="왼쪽에서 시험지를 선택하고, 오른쪽에서 선택한 시험지의 문제를 관리합니다."
      >
        <div className="grid gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div className="space-y-3 rounded-md border border-surface-border-soft bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-text-primary">시험지</p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  총 {problemSets.length}개 · 선택 후 문제를 관리합니다.
                </p>
              </div>
              <Button
                type="button"
                className="gap-1.5"
                onClick={() => setIsSetDialogOpen(true)}
                disabled={disabled}
              >
                <Plus className="size-4" />
                새 시험지
              </Button>
            </div>

            <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
            {problemSets.map((problemSet) => (
              <button
                key={problemSet.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left ${
                  selectedSet?.id === problemSet.id
                    ? 'border-brand-border bg-brand-glass'
                    : 'border-surface-border-soft bg-surface-raised'
                }`}
                onClick={() => {
                  setSelectedSetId(problemSet.id)
                  setEditingId(null)
                  setForm({ ...EMPTY_PROBLEM, problemSetId: problemSet.id })
                  setTargets('')
                }}
              >
                <p className="text-xs font-black text-brand-primary">
                  {problemSet.level ? `L${problemSet.level}` : '레벨 없음'} · {problemSet.status} · {problemSet.problemCount}문제
                </p>
                <p className="mt-1 truncate text-sm font-black text-text-primary">{problemSet.title}</p>
                {problemSet.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-text-muted">{problemSet.description}</p>
                )}
              </button>
            ))}
              {!problemSets.length && (
                <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-raised p-4 text-sm font-semibold text-text-muted">
                  아직 시험지가 없습니다. 새 시험지를 만든 뒤 문제를 추가하세요.
                </div>
              )}
            </div>

            <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3">
              <Field
                label="AI 문제 생성 추가 지침"
                hint="아래 버튼을 누르면 선택 시험지에 10문제를 자동 생성합니다."
              >
                <Textarea
                  value={generationInstructions}
                  onChange={(event) => setGenerationInstructions(event.target.value)}
                  rows={6}
                  className="min-h-[140px] resize-y"
                  placeholder={`예:
- JOIN 문제 3개 이상
- 서브쿼리 2개 포함
- 결제/배송 테이블 중심
- GROUP BY 문제는 중급 이상으로 구성
- 정답 SQL은 너무 길지 않게`}
                  disabled={disabled || setPending}
                />
              </Field>

              <Button
                type="button"
                className="mt-3 w-full gap-1.5"
                onClick={handleGenerateSetProblems}
                disabled={disabled || setPending || !selectedSet}
              >
                {personalGenerateSetProblems.isPending || teamGenerateSetProblems.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <WandSparkles className="size-4" />
                )}
                {personalGenerateSetProblems.isPending || teamGenerateSetProblems.isPending
                  ? 'AI 문제 생성 중...'
                  : 'AI 문제 10개 생성'}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-text-primary">
                  {selectedSet?.title ?? '시험지를 선택하세요'}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  선택 시험지 문제 {visibleProblems.length}개
                </p>
              </div>
              <Button
                type="button"
                className="gap-1.5"
                onClick={handleNewProblem}
                disabled={disabled || !selectedSet}
              >
                <Plus className="size-4" />
                새 문제
              </Button>
            </div>
            <ol className="mt-3 space-y-2">
              {visibleProblems.map((problem, index) => (
                <li
                  key={problem.id}
                  className={`flex items-center gap-3 rounded-md border p-3 ${
                    editingId === problem.id
                      ? 'border-brand-border bg-brand-glass'
                      : 'border-surface-border-soft bg-surface-raised'
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-sm font-black text-text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => handleEdit(problem)}>
                    <span className="block text-xs font-black text-brand-primary">
                      L{problem.level} · {problem.status}
                    </span>
                    <span className="mt-1 block truncate text-sm font-black text-text-primary">
                      {problem.title}
                    </span>
                    {problem.description && (
                      <span className="mt-1 block line-clamp-2 text-xs font-semibold text-text-muted">
                        {problem.description}
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="ui-icon-button size-8"
                      onClick={() => handleMoveProblem(problem, index, -1)}
                      disabled={disabled || pending || index === 0}
                      aria-label="문제 위로 이동"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="ui-icon-button size-8"
                      onClick={() => handleMoveProblem(problem, index, 1)}
                      disabled={disabled || pending || index === visibleProblems.length - 1}
                      aria-label="문제 아래로 이동"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="ui-icon-button-danger size-8 shrink-0"
                    onClick={() => handleDelete(problem.id)}
                    disabled={disabled}
                    aria-label="문제 삭제"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
              {!visibleProblems.length && (
                <li className="rounded-md border border-dashed border-surface-border-soft bg-surface-raised p-4 text-sm font-semibold text-text-muted">
                  선택한 시험지에 문제가 없습니다. 새 문제를 추가하거나 AI로 10문제를 생성하세요.
                </li>
              )}
            </ol>
          </div>
        </div>
      </EditorCard>

      <Dialog.Root
        open={isSetDialogOpen}
        onOpenChange={(open) => {
          setIsSetDialogOpen(open)
          if (!open) {
            setProblemSetForm({ title: '', description: '', level: '', status: 'draft' })
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised shadow-2xl">
            <form onSubmit={handleCreateSet}>
              <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
                <div>
                  <Dialog.Title className="text-lg font-black text-text-primary">
                    새 시험지 추가
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-text-secondary">
                    시험 단위를 만든 뒤, 선택한 시험지에 문제를 추가합니다.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="ui-icon-button size-9" aria-label="닫기">
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="space-y-4 p-5">
                <Field label="시험지 제목">
                  <Input
                    value={problemSetForm.title}
                    onChange={(event) =>
                      setProblemSetForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="쇼핑몰 주문/결제 기초"
                    disabled={disabled || setPending}
                    required
                  />
                </Field>
                <Field label="설명">
                  <Textarea
                    value={problemSetForm.description}
                    onChange={(event) =>
                      setProblemSetForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="시험지 설명"
                    disabled={disabled || setPending}
                  />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="레벨">
                    <Select
                      value={problemSetForm.level}
                      onChange={(event) =>
                        setProblemSetForm((current) => ({
                          ...current,
                          level: event.target.value,
                        }))
                      }
                      disabled={disabled || setPending}
                    >
                      <option value="">레벨 없음</option>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          L{level}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="상태">
                    <Select
                      value={problemSetForm.status}
                      onChange={(event) =>
                        setProblemSetForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      disabled={disabled || setPending}
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                    </Select>
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-surface-border px-5 py-4">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary" disabled={setPending}>
                    취소
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  className="gap-1.5"
                  disabled={disabled || setPending || !problemSetForm.title.trim()}
                >
                  {setPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  시험지 추가
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isProblemDialogOpen}
        onOpenChange={(open) => {
          setIsProblemDialogOpen(open)
          if (!open) reset()
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(860px,calc(100vh-2rem))] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-2xl">
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
                <div>
                  <Dialog.Title className="text-lg font-black text-text-primary">
                    {editingId ? '문제 수정' : '새 문제 추가'}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-text-secondary">
                    {selectedSet?.title ?? '선택 시험지'}에 포함될 문제와 정답 SQL을 설정합니다.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="ui-icon-button size-9" aria-label="닫기">
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                  <Field label="문제 제목">
                    <Input
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, title: event.target.value }))
                      }
                      disabled={disabled || pending}
                      required
                    />
                  </Field>
                  <Field label="레벨">
                    <Select
                      value={form.level}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          level: Number(event.target.value),
                        }))
                      }
                      disabled={disabled || pending}
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          L{level}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="문제 설명">
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    disabled={disabled || pending}
                    required
                  />
                </Field>
                <Field label="대상 테이블" hint="쉼표로 구분합니다.">
                  <Input
                    value={targets}
                    onChange={(event) => setTargets(event.target.value)}
                    placeholder="orders, order_items"
                    disabled={disabled || pending}
                  />
                </Field>
                <Field label="시작 SQL">
                  <Textarea
                    value={form.starterSql ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        starterSql: event.target.value,
                      }))
                    }
                    rows={4}
                    className="font-mono text-sm"
                    disabled={disabled || pending}
                  />
                </Field>
                <Field
                  label="정답 SQL"
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleGenerate}
                      disabled={
                        disabled ||
                        pending ||
                        !form.description.trim() ||
                        personalGenerate.isPending ||
                        teamGenerate.isPending
                      }
                    >
                      {personalGenerate.isPending || teamGenerate.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <WandSparkles className="size-3.5" />
                      )}
                      AI 정답 생성
                    </Button>
                  }
                >
                  <Textarea
                    value={form.answerSql}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        answerSql: event.target.value,
                      }))
                    }
                    rows={7}
                    className="font-mono text-sm"
                    disabled={disabled || pending}
                    required
                  />
                </Field>
                <Field label="해설">
                  <Textarea
                    value={form.explanation ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        explanation: event.target.value,
                      }))
                    }
                    rows={4}
                    disabled={disabled || pending}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-surface-border px-5 py-4">
                <label className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                  <input
                    type="checkbox"
                    checked={form.status === 'published'}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.checked ? 'published' : 'draft',
                      }))
                    }
                    disabled={disabled || pending}
                  />
                  즉시 공개
                </label>
                <div className="flex items-center gap-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="secondary" disabled={pending}>
                      취소
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="submit"
                    className="gap-1.5"
                    disabled={
                      disabled ||
                      pending ||
                      !selectedSet ||
                      !form.title.trim() ||
                      !form.description.trim() ||
                      !form.answerSql.trim()
                    }
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {editingId ? '문제 수정' : '문제 추가'}
                  </Button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function EditorCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="rounded-md p-0">
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="text-base font-black text-text-primary">{title}</h2>
        <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

function Field({
  label,
  hint,
  action,
  children,
}: {
  label: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-black text-text-primary">{label}</span>
          {hint && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
        </span>
        {action}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  )
}
