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
  AlertCircle,
  XCircle,
  Undo2,
  ArrowRight,
} from 'lucide-react'
import { StageNode, type StageNodeStatus } from './components/stage-node'

type Stage = {
  id: string
  label: string
  description: string
  owner: string
  status: StageNodeStatus
  actions: string[]
}

const initialStages: Stage[] = [
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

type HistoryItem = {
  id: string
  title: string
  time: string
  actor: string
  status: 'completed' | 'current' | 'rejected' | 'pending'
}

const initialHistory: HistoryItem[] = [
  {
    id: 'h1',
    title: '신청서 제출 완료',
    time: '오늘 16:20',
    actor: 'Seed User',
    status: 'completed',
  },
  {
    id: 'h2',
    title: '팀장 승인 대기',
    time: '진행 중',
    actor: '팀장',
    status: 'current',
  },
]

const statusLabel: Record<StageNodeStatus, string> = {
  completed: '완료',
  current: '진행 중',
  pending: '대기',
  rejected: '반려',
}

const statusClassName: Record<StageNodeStatus, string> = {
  completed: 'border-brand-border bg-brand-glass text-brand-primary',
  current: 'border-surface-border bg-surface-raised text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.08)] ring-2 ring-brand-border/20',
  pending: 'border-surface-border-soft bg-surface-muted text-text-muted',
  rejected: 'border-destructive/30 bg-danger-glass text-destructive font-bold',
}

export function AiServiceRequestPage() {
  const [stagesState, setStagesState] = useState<Stage[]>(initialStages)
  const [selectedStageId, setSelectedStageId] = useState('manager')
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory)

  const selectedStage = useMemo(
    () => stagesState.find((stage) => stage.id === selectedStageId) ?? stagesState[0],
    [stagesState, selectedStageId]
  )

  // React Flow custom node mappings
  const nodeTypes = useMemo(() => ({
    stageNode: StageNode
  }), [])

  // Dynamic stages to React Flow nodes mapping
  const nodes = useMemo<Node[]>(
    () =>
      stagesState.map((stage, index) => ({
        id: stage.id,
        type: 'stageNode',
        // Alternating layout for organic and structured visual appearance
        position: { x: 40 + index * 185, y: index % 2 === 0 ? 120 : 220 },
        data: {
          label: stage.label,
          owner: stage.owner,
          status: stage.status,
          stageId: stage.id,
          isSelected: stage.id === selectedStageId
        },
      })),
    [stagesState, selectedStageId],
  )

  const edges = useMemo<Edge[]>(
    () => [
      {
        id: 'request-manager',
        source: 'request',
        target: 'manager',
        animated: stagesState[0].status === 'completed',
        style: {
          stroke: stagesState[0].status === 'completed' ? 'var(--brand-primary)' : 'var(--surface-border)',
          strokeWidth: 2,
        },
      },
      {
        id: 'manager-admin',
        source: 'manager',
        target: 'admin',
        animated: stagesState[1].status === 'completed',
        style: {
          stroke: stagesState[1].status === 'completed' ? 'var(--brand-primary)' : 'var(--surface-border)',
          strokeWidth: 2,
        },
      },
      {
        id: 'admin-grant',
        source: 'admin',
        target: 'grant',
        animated: stagesState[2].status === 'completed',
        style: {
          stroke: stagesState[2].status === 'completed' ? 'var(--brand-primary)' : 'var(--surface-border)',
          strokeWidth: 2,
        },
      },
      {
        id: 'grant-active',
        source: 'grant',
        target: 'active',
        animated: stagesState[3].status === 'completed',
        style: {
          stroke: stagesState[3].status === 'completed' ? 'var(--brand-primary)' : 'var(--surface-border)',
          strokeWidth: 2,
        },
      },
    ],
    [stagesState],
  )

  // Handle stage action execution (State Machine transitions)
  const handleStageAction = (stageId: string, action: string) => {
    const timeString = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    setStagesState((prevStages) => {
      const updated = [...prevStages]
      const index = updated.findIndex((s) => s.id === stageId)
      if (index === -1) return prevStages

      if (action === '승인' || action === '권한 발급') {
        // Complete current stage
        updated[index] = { ...updated[index], status: 'completed' }
        
        // Transition next stage to current
        if (index + 1 < updated.length) {
          const nextStage = updated[index + 1]
          updated[index + 1] = { ...nextStage, status: 'current' }
          setSelectedStageId(nextStage.id)

          // Update timeline history
          setHistory((prev) => {
            // Mark former current history as completed
            const cleared = prev.map((h) => 
              h.status === 'current' ? { ...h, status: 'completed' as const, time: `오늘 ${timeString}` } : h
            )
            return [
              ...cleared,
              {
                id: `h-${Date.now()}`,
                title: `${nextStage.label} 대기`,
                time: '진행 중',
                actor: nextStage.owner,
                status: 'current',
              },
            ]
          })
        } else {
          // Last stage active
          setHistory((prev) => {
            const cleared = prev.map((h) => 
              h.status === 'current' ? { ...h, status: 'completed' as const, time: `오늘 ${timeString}` } : h
            )
            return [
              ...cleared,
              {
                id: `h-${Date.now()}`,
                title: 'AI 서비스 사용 가능',
                time: `오늘 ${timeString}`,
                actor: '시스템',
                status: 'completed',
              },
            ]
          })
        }
      } else if (action === '반려') {
        // Set state to rejected
        updated[index] = { ...updated[index], status: 'rejected' }
        
        // Set rest of future stages to pending
        for (let i = index + 1; i < updated.length; i++) {
          updated[i] = { ...updated[i], status: 'pending' }
        }

        // Add rejected item to timeline history
        setHistory((prev) => {
          const cleared = prev.map((h) => 
            h.status === 'current' ? { ...h, status: 'completed' as const, time: `오늘 ${timeString}` } : h
          )
          return [
            ...cleared,
            {
              id: `h-${Date.now()}`,
              title: `${updated[index].label} 반려 처리`,
              time: `오늘 ${timeString}`,
              actor: updated[index].owner,
              status: 'rejected',
            },
          ]
        })
      } else if (action === '보완 요청') {
        // Rollback current stage to pending
        updated[index] = { ...updated[index], status: 'pending' }
        
        // Set first stage (request) back to current
        updated[0] = { ...updated[0], status: 'current' }
        setSelectedStageId(updated[0].id)

        // Add request modification item to timeline history
        setHistory((prev) => {
          const cleared = prev.map((h) => 
            h.status === 'current' ? { ...h, status: 'completed' as const, time: `오늘 ${timeString}` } : h
          )
          return [
            ...cleared,
            {
              id: `h-${Date.now()}`,
              title: `${updated[index].label} 보완 요청`,
              time: `오늘 ${timeString}`,
              actor: updated[index].owner,
              status: 'rejected',
            },
            {
              id: `h-${Date.now()}-req`,
              title: '신청서 서류 보완 대기',
              time: '진행 중',
              actor: '신청자',
              status: 'current',
            },
          ]
        })
      }

      return updated
    })
  }

  // Action reset (e.g., when clicking "신규 신청" or starting over)
  const handleResetFlow = () => {
    setStagesState(initialStages)
    setSelectedStageId('manager')
    setHistory(initialHistory)
  }

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
        <button 
          onClick={handleResetFlow}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95"
        >
          <ClipboardList className="size-4" />
          초기화 / 신규 신청
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
            현재 담당 단계
          </div>
          <p className="mt-3 text-lg font-black text-text-primary">
            {stagesState.find((s) => s.status === 'current')?.label || '심사 완료'}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {stagesState.find((s) => s.status === 'current')?.description || '신청 건 처리가 완료되었습니다.'}
          </p>
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
            <span className={`rounded-sm border px-2 py-1 text-[11px] font-bold ${
              stagesState.some((s) => s.status === 'rejected') 
                ? 'border-destructive bg-danger-glass text-destructive' 
                : stagesState[stagesState.length - 1].status === 'completed' 
                  ? 'border-brand-border bg-brand-glass text-brand-primary' 
                  : 'border-brand-border bg-brand-glass text-brand-primary animate-pulse'
            }`}>
              {stagesState.some((s) => s.status === 'rejected') 
                ? '반려 종료' 
                : stagesState[stagesState.length - 1].status === 'completed' 
                  ? '사용 승인' 
                  : '진행 중'}
            </span>
          </div>
          <div className="h-[500px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
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

        <aside className="rounded-md border border-surface-border bg-surface-raised p-4 flex flex-col justify-between">
          <div>
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
                {selectedStage.status === 'current' ? (
                  selectedStage.actions.map((action) => {
                    const isApprove = action === '승인' || action === '권한 발급'
                    const isReject = action === '반려'
                    
                    let buttonClass = 'border-surface-border bg-background hover:bg-surface-muted text-text-primary'
                    if (isApprove) {
                      buttonClass = 'border-brand-border bg-brand-glass hover:bg-brand-glass/80 text-brand-primary shadow-sm'
                    } else if (isReject) {
                      buttonClass = 'border-destructive/30 bg-danger-glass hover:bg-destructive/10 text-destructive'
                    }

                    return (
                      <button
                        key={action}
                        onClick={() => handleStageAction(selectedStage.id, action)}
                        className={`inline-flex items-center gap-1 rounded-sm border px-3 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${buttonClass}`}
                      >
                        {isApprove && <CheckCircle2 className="size-3.5" />}
                        {isReject && <XCircle className="size-3.5" />}
                        {action === '보완 요청' && <Undo2 className="size-3.5" />}
                        {action}
                      </button>
                    )
                  })
                ) : (
                  <p className="text-xs text-text-muted italic py-1">현재 활성화된 단계가 아니므로 액션을 취할 수 없습니다.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-surface-border-soft pt-4">
            <p className="text-xs font-bold text-text-secondary">처리 이력</p>
            <div className="mt-3 space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {history.map((item, idx) => {
                const isRejected = item.status === 'rejected'
                const isCurrent = item.status === 'current'
                return (
                  <div key={item.id} className="flex gap-2.5">
                    <div className="mt-0.5 flex flex-col items-center">
                      <div className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                        isRejected 
                          ? 'bg-destructive/10 text-destructive' 
                          : isCurrent 
                            ? 'bg-brand-primary/10 text-brand-primary animate-pulse' 
                            : 'bg-brand-primary text-background'
                      }`}>
                        {isRejected ? '!' : isCurrent ? '●' : '✓'}
                      </div>
                      {idx < history.length - 1 && (
                        <div className="h-full w-0.5 bg-surface-border-soft mt-1" />
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isRejected ? 'text-destructive' : 'text-text-primary'}`}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        {item.actor} · {item.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

