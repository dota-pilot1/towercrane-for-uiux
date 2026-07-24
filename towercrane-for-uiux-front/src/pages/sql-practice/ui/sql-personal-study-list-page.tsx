import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Database, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  useCreateSqlPersonalPracticeWorkspace,
  useDeleteSqlPersonalPracticeWorkspace,
  useSqlPersonalPracticeWorkspaces,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'

const LEVEL_LABEL = {
  beginner: '입문',
  basic: '초급',
  intermediate: '중급',
  advanced: '고급',
} as const

export function SqlPersonalStudyListPage() {
  const navigate = useNavigate()
  const workspacesQuery = useSqlPersonalPracticeWorkspaces()
  const createMutation = useCreateSqlPersonalPracticeWorkspace()
  const deleteMutation = useDeleteSqlPersonalPracticeWorkspace()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [learningGoal, setLearningGoal] = useState('')

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    const workspace = await createMutation.mutateAsync({
      title: title.trim(),
      learningGoal: learningGoal.trim() || null,
      description: '',
      topics: [],
      visibility: 'private',
    })
    setTitle('')
    setLearningGoal('')
    setCreating(false)
    navigate({ to: `/sql/personal/workspaces/${workspace.id}/edit` })
  }

  const handleDelete = async (workspaceId: string) => {
    if (!window.confirm('이 개인 스터디와 문제, 제출 기록을 모두 삭제할까요?')) return
    await deleteMutation.mutateAsync(workspaceId)
  }

  const workspaces = workspacesQuery.data ?? []

  return (
    <section className="space-y-4 pb-16">
      <div className="flex flex-col gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-10 shrink-0">
            <Database className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-text-primary">내 SQL 스터디</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              주제, 데이터셋, ERD, 문제를 한 단위로 만들고 관리합니다.
            </p>
          </div>
        </div>
        <Button className="gap-1.5" onClick={() => setCreating((value) => !value)}>
          <Plus className="size-4" />
          새 스터디 만들기
        </Button>
      </div>

      {creating && (
        <Card className="rounded-md p-5">
          <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]" onSubmit={handleCreate}>
            <label>
              <span className="mb-2 block text-sm font-black text-text-primary">스터디 주제</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 쇼핑몰 주문·결제 SQL"
                maxLength={80}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-text-primary">학습 목표</span>
              <Textarea
                value={learningGoal}
                onChange={(event) => setLearningGoal(event.target.value)}
                placeholder="예: JOIN과 집계로 주문 현황을 분석한다."
                rows={2}
              />
            </label>
            <Button type="submit" className="self-end gap-1.5" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              만들고 편집
            </Button>
          </form>
        </Card>
      )}

      {workspacesQuery.isLoading ? (
        <Card className="flex min-h-64 items-center justify-center rounded-md">
          <Loader2 className="size-5 animate-spin text-brand-primary" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="flex min-h-56 flex-col rounded-md p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-[11px] font-black text-brand-primary">
                      {workspace.level ? LEVEL_LABEL[workspace.level] : '난이도 미설정'}
                    </span>
                    <span className="text-[11px] font-bold text-text-muted">
                      {workspace.visibility}
                    </span>
                  </div>
                  <h2 className="mt-3 truncate text-base font-black text-text-primary">
                    {workspace.title}
                  </h2>
                </div>
                <button
                  type="button"
                  className="ui-icon-button-danger size-8 shrink-0"
                  onClick={() => handleDelete(workspace.id)}
                  disabled={deleteMutation.isPending}
                  aria-label="스터디 삭제"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-text-secondary">
                {workspace.learningGoal || workspace.description || '학습 목표를 설정해주세요.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {workspace.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-muted"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => navigate({ to: `/sql/personal/workspaces/${workspace.id}/edit` })}
                >
                  <Pencil className="size-4" />
                  편집
                </Button>
                <Button
                  className="gap-1.5"
                  onClick={() => navigate({ to: `/sql/personal/workspaces/${workspace.id}` })}
                >
                  <BookOpen className="size-4" />
                  학습 시작
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
