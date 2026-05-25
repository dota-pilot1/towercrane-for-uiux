import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Search } from 'lucide-react'

const S = {
  brand:   { background: 'var(--color-brand-glass)',    border: '1.5px solid var(--color-brand-border)',      color: 'var(--color-brand-primary)',  borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700 },
  surface: { background: 'var(--card)', border: '1px solid var(--border)',      color: 'var(--foreground)',   borderRadius: 10, padding: '10px 18px', fontSize: 13 },
  muted:   { background: 'var(--muted)',  border: '1px solid var(--border)', color: 'var(--muted-foreground)', borderRadius: 10, padding: '10px 16px', fontSize: 12 },
  accent:  { background: 'color-mix(in srgb, var(--primary) 8%, var(--card))', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', color: 'var(--color-brand-primary)', borderRadius: 10, padding: '10px 16px', fontSize: 12 },
}

// 메인 파이프라인 (y=140) — 왼쪽 → 오른쪽
const nodes = [
  { id:'1',  position:{ x:0,    y:140 }, data:{ label:'❓ 사용자 질문 입력' },                                style:S.brand },
  { id:'2',  position:{ x:220,  y:140 }, data:{ label:'🔤 텍스트 임베딩\ntext-embedding-3-small' },          style:S.surface },
  { id:'3',  position:{ x:440,  y:140 }, data:{ label:'🔍 벡터 검색\n코사인 유사도 · Top-K' },               style:S.surface },
  { id:'4',  position:{ x:660,  y:140 }, data:{ label:'📝 Context 구성\n시스템 프롬프트 +\n검색 청크 삽입' }, style:S.surface },
  { id:'5',  position:{ x:880,  y:140 }, data:{ label:'🤖 GPT-4o-mini\nRAG 기반 답변\n스트리밍' },           style:S.surface },
  { id:'6',  position:{ x:1090, y:140 }, data:{ label:'✅ 응답 + 출처\n동시 표시' },                         style:S.brand },

  // 위: 채널 선택 (보조)
  { id:'7',  position:{ x:210,  y:0   }, data:{ label:'🔘 채널 선택\n공지 / FAQ / 전체' },                   style:S.muted },

  // 아래: 청크 데이터 → 검색 근거 패널 (보조)
  { id:'8',  position:{ x:440,  y:300 }, data:{ label:'📋 청크 데이터\ntitle · snippet · score' },           style:S.muted },
  { id:'9',  position:{ x:660,  y:300 }, data:{ label:'🔗 검색 근거 패널\nscore · snippet · 원문 링크' },     style:S.accent },
]

const arrow = { type: MarkerType.ArrowClosed }
const mk = (stroke = 'var(--border)', animated = false, label?: string) => ({
  markerEnd: arrow, animated, label,
  style: { stroke },
  labelStyle: { fontSize: 11, fill: 'var(--muted-foreground)' },
  labelBgStyle: { fill: 'var(--card)', fillOpacity: 0.85 },
})

const brand = 'var(--color-brand-primary)'

const edges = [
  // 메인 파이프라인
  { id:'e1-2',  source:'1', target:'2', ...mk(brand, true) },
  { id:'e2-3',  source:'2', target:'3', ...mk(brand, true) },
  { id:'e3-4',  source:'3', target:'4', ...mk(brand, true, 'Top-K chunks') },
  { id:'e4-5',  source:'4', target:'5', ...mk(brand, true) },
  { id:'e5-6',  source:'5', target:'6', ...mk(brand, true) },

  // 채널 선택 보조 경로
  { id:'e1-7',  source:'1', target:'7', ...mk() },
  { id:'e7-3',  source:'7', target:'3', ...mk() },

  // 청크 데이터 → 검색 근거 패널 → 응답
  { id:'e3-8',  source:'3', target:'8', ...mk() },
  { id:'e8-9',  source:'8', target:'9', ...mk() },
  { id:'e9-6',  source:'9', target:'6', ...mk() },
]

export function ChatbotKnowledgeGuidePage() {
  const [n, , onNC] = useNodesState(nodes)
  const [e, , onEC] = useEdgesState(edges)
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5"><Search className="size-5" /></div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">지식 검색 챗봇 — 내부 프로세스</h1>
          <p className="text-xs ui-text-secondary">임베딩 → 벡터 검색 → RAG 기반 GPT 답변 생성 전체 흐름</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border border-surface-border">
        <ReactFlow nodes={n} edges={e} onNodesChange={onNC} onEdgesChange={onEC} fitView fitViewOptions={{ padding: 0.25 }}>
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  )
}
