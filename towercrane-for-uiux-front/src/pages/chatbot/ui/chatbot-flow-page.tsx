import { useCallback } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GitFork } from 'lucide-react'

const initialNodes = [
  {
    id: '1',
    position: { x: 80, y: 200 },
    data: { label: '사용자 입력' },
    style: {
      background: 'var(--brand-glass)',
      border: '1px solid var(--brand-border)',
      color: 'var(--brand-primary)',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
    },
  },
  {
    id: '2',
    position: { x: 300, y: 100 },
    data: { label: '의도 분류\n(Intent Classification)' },
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      color: 'var(--text-primary)',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 13,
      whiteSpace: 'pre',
    },
  },
  {
    id: '3',
    position: { x: 300, y: 300 },
    data: { label: '컨텍스트 검색\n(RAG)' },
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      color: 'var(--text-primary)',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 13,
      whiteSpace: 'pre',
    },
  },
  {
    id: '4',
    position: { x: 540, y: 200 },
    data: { label: 'LLM 호출\n(Claude API)' },
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--brand-border)',
      color: 'var(--text-primary)',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 13,
      whiteSpace: 'pre',
    },
  },
  {
    id: '5',
    position: { x: 760, y: 200 },
    data: { label: '응답 출력' },
    style: {
      background: 'var(--brand-glass)',
      border: '1px solid var(--brand-border)',
      color: 'var(--brand-primary)',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
    },
  },
]

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5', animated: true },
]

export function ChatbotFlowPage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((prev) => addEdge(connection, prev)),
    [setEdges],
  )

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <GitFork className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">React Flow</h1>
          <p className="text-xs ui-text-secondary">AI 워크플로우 노드 시각화 · 드래그로 연결 추가 가능</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-[var(--surface-border-soft)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>

      <p className="mt-2 text-[11px] ui-text-muted text-center">
        노드를 드래그해 위치를 바꾸고, 핸들을 드래그해 새 연결을 추가할 수 있습니다.
      </p>
    </div>
  )
}
