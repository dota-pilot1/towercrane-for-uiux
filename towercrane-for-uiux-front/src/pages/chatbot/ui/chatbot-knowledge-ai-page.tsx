import { useCallback } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Sparkles, Play } from 'lucide-react'

const initialNodes = [
  {
    id: 'n1',
    type: 'input',
    position: { x: 50, y: 150 },
    data: { label: '📄 문서 업로드 (Upload)' },
    style: {
      background: 'var(--brand-glass)',
      border: '1px solid var(--brand-border)',
      color: 'var(--brand-primary)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontWeight: 700,
    },
  },
  {
    id: 'n2',
    position: { x: 230, y: 80 },
    data: { label: '✂️ 텍스트 청킹 (Chunking)' },
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      color: 'var(--text-primary)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontWeight: 600,
    },
  },
  {
    id: 'n3',
    position: { x: 230, y: 220 },
    data: { label: '🧠 벡터 임베딩 (Embedding)' },
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      color: 'var(--text-primary)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontWeight: 600,
    },
  },
  {
    id: 'n4',
    position: { x: 430, y: 150 },
    data: { label: '🗄️ 청크 DB & 벡터 저장' },
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      color: 'var(--text-primary)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontWeight: 600,
    },
  },
  {
    id: 'n5',
    type: 'output',
    position: { x: 630, y: 150 },
    data: { label: '🤖 RAG 챗봇 답변 생성' },
    style: {
      background: 'var(--brand-glass)',
      border: '1px solid var(--brand-border)',
      color: 'var(--brand-primary)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontWeight: 700,
    },
  },
]

const initialEdges = [
  { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: 'var(--brand-primary)' } },
  { id: 'e1-3', source: 'n1', target: 'n3', animated: true, style: { stroke: 'var(--brand-primary)' } },
  { id: 'e2-4', source: 'n2', target: 'n4' },
  { id: 'e3-4', source: 'n3', target: 'n4' },
  { id: 'e4-5', source: 'n4', target: 'n5', animated: true, style: { stroke: 'var(--brand-primary)' } },
]

export function ChatbotKnowledgeAiPage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((prev) => addEdge(connection, prev)),
    [setEdges],
  )

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="ui-icon-button-brand rounded-md p-2.5">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold ui-text-primary">AI 지식 파이프라인</h2>
            <p className="text-xs ui-text-secondary">RAG 지식 가공 및 실시간 검색 데이터 흐름 시각화</p>
          </div>
        </div>
        <span className="rounded-sm border border-brand-border bg-brand-glass px-2.5 py-1 text-[11px] font-bold text-brand-primary flex items-center gap-1">
          <Play className="size-3 fill-current" />
          동작 시뮬레이션 활성
        </span>
      </div>

      {/* React Flow 캔버스 영역 */}
      <div className="flex-1 overflow-hidden rounded-lg border border-[var(--surface-border-soft)] bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodesDraggable={true}
          elementsSelectable={true}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>

      <p className="text-[10px] ui-text-muted text-center shrink-0">
        노드를 마우스로 드래그하여 배치 구조를 바꾸거나 새로운 연결선을 연결해 볼 수 있습니다.
      </p>
    </div>
  )
}
