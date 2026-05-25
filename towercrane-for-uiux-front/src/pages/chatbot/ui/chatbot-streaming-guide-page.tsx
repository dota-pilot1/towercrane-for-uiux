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
import { Zap } from 'lucide-react'

const S = {
  brand:   { background: 'var(--color-brand-glass)',  border: '1.5px solid var(--color-brand-border)', color: 'var(--color-brand-primary)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700 },
  surface: { background: 'var(--card)',                border: '1px solid var(--border)',               color: 'var(--foreground)',           borderRadius: 10, padding: '10px 18px', fontSize: 13 },
  muted:   { background: 'var(--muted)',               border: '1px solid var(--border)',               color: 'var(--muted-foreground)',     borderRadius: 10, padding: '10px 16px', fontSize: 12 },
}

// 메인 파이프라인 (y=140): 전송 → SSE연결 → OpenAI(stream) → 청크수신 → 렌더링 → 완료
// 위(y=0): DB 메시지 저장
// 아래(y=290): 히스토리 buildHistory(), 스트림 종료 [DONE]
const nodes = [
  { id:'1', position:{ x:0,   y:140 }, data:{ label:'💬 사용자 입력 전송' },                                style:S.brand   },
  { id:'2', position:{ x:220, y:140 }, data:{ label:'📡 SSE 연결 수립\nPOST /chatbot/stream\ntext/event-stream' }, style:S.surface },
  { id:'3', position:{ x:480, y:140 }, data:{ label:'🤖 OpenAI API\nchat.completions.create()\nstream: true' },    style:S.surface },
  { id:'4', position:{ x:720, y:140 }, data:{ label:'🔄 청크 수신 반복\nfor await (chunk)\ndelta.content' },       style:S.surface },
  { id:'5', position:{ x:960, y:140 }, data:{ label:'✨ 실시간 렌더링\n토큰 누적 표시' },                          style:S.surface },
  { id:'6', position:{ x:1180,y:140 }, data:{ label:'✅ 완료\n응답 DB 저장' },                                     style:S.brand   },

  // 위: DB 저장 (SSE 연결 시점)
  { id:'7', position:{ x:210, y:0   }, data:{ label:'🗄️ DB: 메시지 저장\ninsertMessage(user)' },                  style:S.muted   },

  // 아래: 히스토리 로드, [DONE] 종료
  { id:'8', position:{ x:480, y:300 }, data:{ label:'📝 이전 대화 로드\nbuildHistory()' },                         style:S.muted   },
  { id:'9', position:{ x:960, y:300 }, data:{ label:'🏁 스트림 종료\ndata: [DONE] · res.end()' },                  style:S.muted   },
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
  { id:'e3-4', source:'3', target:'4', ...mk(brand, true, 'stream 시작') },
  { id:'e4-5', source:'4', target:'5', ...mk(brand, true) },
  { id:'e5-6', source:'5', target:'6', ...mk(brand, true) },

  // 위: SSE 연결 → DB 저장
  { id:'e2-7', source:'2', target:'7', ...mk() },

  // 아래: SSE 연결 → 히스토리 → OpenAI
  { id:'e2-8', source:'2', target:'8', ...mk() },
  { id:'e8-3', source:'8', target:'3', ...mk() },

  // 아래: 청크수신 → [DONE] → 완료
  { id:'e4-9', source:'4', target:'9', ...mk() },
  { id:'e9-6', source:'9', target:'6', ...mk() },
]

export function ChatbotStreamingGuidePage() {
  const [n, , onNC] = useNodesState(nodes)
  const [e, , onEC] = useEdgesState(edges)
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5"><Zap className="size-5" /></div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">스트리밍 응답 — 내부 프로세스</h1>
          <p className="text-xs ui-text-secondary">SSE(Server-Sent Events) 기반 실시간 토큰 스트리밍 흐름</p>
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
