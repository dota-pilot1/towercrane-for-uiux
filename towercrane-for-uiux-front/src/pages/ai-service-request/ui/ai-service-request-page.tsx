import { useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'

type StageStatus = 'completed' | 'current' | 'pending'

type Stage = {
  id: string
  label: string
  description: string
  owner: string
  status: StageStatus
  actions: string[]
}

const stages: Stage[] = [
  {
    id: 'request',
    label: '신청 작성',
    description: '사용할 AI 서비스, 모델, 목적, 예상 사용량을 입력합니다.',
    owner: '신청자',
    status: 'completed',
    actions: ['신청서 보기'],
  },
  {
    id: 'manager',
    label: '팀장 승인',
    description: '업무 목적과 사용 범위를 확인하고 1차 승인합니다.',
    owner: '팀장',
    status: 'current',
    actions: ['승인', '반려', '보완 요청'],
  },
  {
    id: 'admin',
    label: 'AI 관리자 검토',
    description: '권한 범위, 보안 기준, 모델 정책을 검토합니다.',
    owner: 'AI 관리자',
    status: 'pending',
    actions: ['승인', '반려', '보완 요청'],
  },
  {
    id: 'grant',
    label: '권한 발급',
    description: '선택한 모델과 기능 범위에 맞춰 사용 권한을 부여합니다.',
    owner: '시스템',
    status: 'pending',
    actions: ['권한 발급'],
  },
  {
    id: 'active',
    label: '사용 가능',
    description: 'AI Chatbot 및 승인된 AI 기능을 사용할 수 있습니다.',
    owner: '사용자',
    status: 'pending',
    actions: ['사용 현황 보기'],
  },
]

const statusLabel: Record<StageStatus, string> = {
  completed: '완료',
  current: '진행 중',
  pending: '대기',
}

const statusClassName: Record<StageStatus, string> = {
  completed: 'border-brand-border bg-brand-glass text-brand-primary',
  current: 'border-surface-border bg-surface-raised text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
  pending: 'border-surface-border-soft bg-surface-muted text-text-muted',
}

function stageNodeStyle(stage: Stage): Node['style'] {
  const base = {
    borderRadius: 8,
    padding: '10px 14px',
    width: 150,
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center' as const,
    border: '1px solid color-mix(in srgb, var(--border) 65%, transparent)',
    background: 'var(--muted)',
    color: 'oklch(0.6 0 0)',
  }

  if (stage.status === 'completed') {
    return {
      ...base,
      border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
      background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
      color: 'var(--primary)',
    }
  }

  if (stage.status === 'current') {
    return {
      ...base,
      border: '1px solid var(--border)',
      background: 'var(--card)',
      color: 'var(--foreground)',
      boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
    }
  }

  return base
}

export function AiServiceRequestPage() {
  const [selectedStageId, setSelectedStageId] = useState('manager')
  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? stages[0]

  const nodes = useMemo<Node[]>(
    () =>
      stages.map((stage, index) => ({
        id: stage.id,
        position: { x: 70 + index * 190, y: index % 2 === 0 ? 120 : 220 },
        data: { label: stage.label },
        style: stageNodeStyle(stage),
      })),
    [],
  )

  const edges = useMemo<Edge[]>(
    () => [
      { id: 'request-manager', source: 'request', target: 'manager', animated: true },
      { id: 'manager-admin', source: 'manager', target: 'admin' },
      { id: 'admin-grant', source: 'admin', target: 'grant' },
      { id: 'grant-active', source: 'grant', target: 'active' },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-surface-raised px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-10 shrink-0">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-text-primary">AI 서비스 신청</h1>
            <p className="mt-1 text-xs text-text-secondary">
              AI Chatbot, LLM API, 지식채널 검색 권한을 신청하고 승인 흐름을 확인합니다.
            </p>
          </div>
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:bg-surface-muted">
          <ClipboardList className="size-4" />
          신규 신청
        </button>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-surface-border bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <FileCheck2 className="size-4 text-brand-primary" />
            신청 서비스
          </div>
          <p className="mt-3 text-lg font-black text-text-primary">사내 AI Chatbot</p>
          <p className="mt-1 text-xs text-text-muted">FAQ, 개발 자료, AI 자료 기반 질의응답</p>
        </div>
        <div className="rounded-md border border-surface-border bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <UserCheck className="size-4 text-brand-primary" />
            현재 담당
          </div>
          <p className="mt-3 text-lg font-black text-text-primary">팀장 승인</p>
          <p className="mt-1 text-xs text-text-muted">업무 목적과 사용 범위 검토 대기</p>
        </div>
        <div className="rounded-md border border-surface-border bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <KeyRound className="size-4 text-brand-primary" />
            요청 권한
          </div>
          <p className="mt-3 text-lg font-black text-text-primary">Chatbot · 자료 검색</p>
          <p className="mt-1 text-xs text-text-muted">월 20만 토큰 기준, 업무용 사용</p>
        </div>
      </section>

      <section className="grid min-h-[560px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-[420px] overflow-hidden rounded-md border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border-soft px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-text-primary">승인 Flow</h2>
              <p className="mt-0.5 text-[11px] text-text-muted">노드를 선택하면 단계별 처리 정보를 확인할 수 있습니다.</p>
            </div>
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-[11px] font-bold text-brand-primary">
              진행 중
            </span>
          </div>
          <div className="h-[500px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={(_, node) => setSelectedStageId(node.id)}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            </ReactFlow>
          </div>
        </div>

        <aside className="rounded-md border border-surface-border bg-surface-raised p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase text-text-muted">Selected Stage</p>
              <h2 className="mt-1 text-lg font-black text-text-primary">{selectedStage.label}</h2>
            </div>
            <span className={`rounded-sm border px-2 py-1 text-[11px] font-bold ${statusClassName[selectedStage.status]}`}>
              {statusLabel[selectedStage.status]}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-text-secondary">{selectedStage.description}</p>

          <dl className="mt-5 space-y-3 rounded-md border border-surface-border-soft bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-bold text-text-muted">담당</dt>
              <dd className="text-sm font-semibold text-text-primary">{selectedStage.owner}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-bold text-text-muted">신청자</dt>
              <dd className="text-sm font-semibold text-text-primary">Seed User</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-bold text-text-muted">보안 등급</dt>
              <dd className="text-sm font-semibold text-text-primary">내부 업무용</dd>
            </div>
          </dl>

          <div className="mt-5">
            <p className="text-xs font-bold text-text-secondary">가능한 액션</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStage.actions.map((action) => (
                <button
                  key={action}
                  className="rounded-sm border border-surface-border bg-background px-3 py-2 text-xs font-bold text-text-primary transition-colors hover:bg-surface-muted"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-surface-border-soft pt-4">
            <p className="text-xs font-bold text-text-secondary">처리 이력</p>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 text-brand-primary" />
                <div>
                  <p className="text-xs font-bold text-text-primary">신청서 제출 완료</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">Seed User · 오늘 16:20</p>
                </div>
              </div>
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 text-text-muted" />
                <div>
                  <p className="text-xs font-bold text-text-primary">팀장 승인 대기</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">현재 단계</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
