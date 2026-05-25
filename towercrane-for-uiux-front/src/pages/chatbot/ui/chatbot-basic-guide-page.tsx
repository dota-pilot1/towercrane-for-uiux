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
import { Bot } from 'lucide-react'

const S = {
  brand:   { background: 'var(--color-brand-glass)',  border: '1.5px solid var(--color-brand-border)', color: 'var(--color-brand-primary)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700 },
  surface: { background: 'var(--card)',                border: '1px solid var(--border)',               color: 'var(--foreground)',           borderRadius: 10, padding: '10px 18px', fontSize: 13 },
  muted:   { background: 'var(--muted)',               border: '1px solid var(--border)',               color: 'var(--muted-foreground)',     borderRadius: 10, padding: '10px 16px', fontSize: 12 },
}

// 메인 파이프라인 (y=140): 입력 → DB저장 → GPT호출 → 렌더링 → 완료
// 위(y=0): 세션 소유권 확인
// 아래(y=290): System Prompt, 응답 DB 저장
const nodes = [
  { id:'1', position:{ x:0,   y:140 }, data:{ label:'💬 사용자 메시지 입력' },                     style:S.brand   },
  { id:'2', position:{ x:220, y:140 }, data:{ label:'🗄️ DB: 메시지 저장\ninsertMessage()' },       style:S.surface },
  { id:'3', position:{ x:460, y:140 }, data:{ label:'🤖 GPT-4o-mini 호출\nchat.completions.create()' }, style:S.surface },
  { id:'4', position:{ x:700, y:140 }, data:{ label:'✨ Markdown 렌더링\nsyntax highlight' },       style:S.surface },
  { id:'5', position:{ x:920, y:140 }, data:{ label:'✅ 응답 완료\ndata: [DONE]' },                 style:S.brand   },

  // 위: 세션 소유권 확인
  { id:'6', position:{ x:210, y:0   }, data:{ label:'📋 세션 소유권 확인\nassertOwnership()' },     style:S.muted   },

  // 아래: System Prompt / 응답 저장
  { id:'7', position:{ x:210, y:300 }, data:{ label:'📝 System Prompt 설정' },                      style:S.muted   },
  { id:'8', position:{ x:700, y:300 }, data:{ label:'🗄️ 응답 DB 저장\ninsertMessage(assistant)' }, style:S.muted   },
]

const arrow = { type: MarkerType.ArrowClosed }
const brand = 'var(--color-brand-primary)'
const mk = (stroke = 'var(--border)', animated = false, label?: string) => ({
  markerEnd: arrow, animated, label,
  style: { stroke },
  labelStyle: { fontSize: 11, fill: 'var(--muted-foreground)' },
  labelBgStyle: { fill: 'var(--card)', fillOpacity: 0.9 },
})

const edges = [
  // 메인 파이프라인
  { id:'e1-2', source:'1', target:'2', ...mk(brand, true) },
  { id:'e2-3', source:'2', target:'3', ...mk(brand, true) },
  { id:'e3-4', source:'3', target:'4', ...mk(brand, true, 'stream') },
  { id:'e4-5', source:'4', target:'5', ...mk(brand, true) },

  // 위: 소유권 확인 → GPT
  { id:'e1-6', source:'1', target:'6', ...mk() },
  { id:'e6-3', source:'6', target:'3', ...mk() },

  // 아래: System Prompt → GPT, GPT → 응답 저장 → 완료
  { id:'e1-7', source:'1', target:'7', ...mk() },
  { id:'e7-3', source:'7', target:'3', ...mk() },
  { id:'e3-8', source:'3', target:'8', ...mk() },
  { id:'e8-5', source:'8', target:'5', ...mk() },
]

export function ChatbotBasicGuidePage() {
  const [n, , onNC] = useNodesState(nodes)
  const [e, , onEC] = useEdgesState(edges)
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5"><Bot className="size-5" /></div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">기본 채팅 — 내부 프로세스</h1>
          <p className="text-xs ui-text-secondary">GPT-4o-mini 기반 채팅의 요청~응답 전체 흐름</p>
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
