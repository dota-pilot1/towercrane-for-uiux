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
import { History } from 'lucide-react'

const S = {
  brand:   { background: 'var(--color-brand-glass)',  border: '1.5px solid var(--color-brand-border)', color: 'var(--color-brand-primary)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700 },
  surface: { background: 'var(--card)',                border: '1px solid var(--border)',               color: 'var(--foreground)',           borderRadius: 10, padding: '10px 18px', fontSize: 13 },
  muted:   { background: 'var(--muted)',               border: '1px solid var(--border)',               color: 'var(--muted-foreground)',     borderRadius: 10, padding: '10px 16px', fontSize: 12 },
  label:   { background: 'transparent', border: 'none', color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, padding: '0 8px' },
}

// 3개 수평 레인으로 분리
// 레인 1 (y=40):  세션 생성
// 레인 2 (y=180): 대화 저장
// 레인 3 (y=330): 세션 전환·복원
const nodes = [
  // 레인 라벨
  { id:'l1', position:{ x:-90, y:48  }, data:{ label:'세션 생성' }, style:S.label, draggable:false },
  { id:'l2', position:{ x:-90, y:188 }, data:{ label:'대화 저장' }, style:S.label, draggable:false },
  { id:'l3', position:{ x:-90, y:338 }, data:{ label:'세션 전환' }, style:S.label, draggable:false },

  // 레인 1: 세션 생성
  { id:'1', position:{ x:0,   y:40  }, data:{ label:'➕ 새 대화 버튼 클릭' },                           style:S.brand   },
  { id:'2', position:{ x:220, y:40  }, data:{ label:'🗄️ POST /chatbot/sessions\ncreateSession() · UUID' }, style:S.surface },
  { id:'3', position:{ x:480, y:40  }, data:{ label:'📋 세션 목록 업데이트\nlistSessions()' },            style:S.muted   },

  // 레인 2: 대화 저장
  { id:'4', position:{ x:0,   y:180 }, data:{ label:'💬 메시지 전송' },                                   style:S.brand   },
  { id:'5', position:{ x:220, y:180 }, data:{ label:'🏷️ 제목 자동 설정\ntouchSession() · 20자 truncate' }, style:S.surface },
  { id:'6', position:{ x:460, y:180 }, data:{ label:'🤖 GPT 호출\n+ buildHistory()' },                    style:S.surface },
  { id:'7', position:{ x:700, y:180 }, data:{ label:'🗄️ 응답 DB 저장\nchatMessagesTable' },               style:S.muted   },
  { id:'8', position:{ x:920, y:180 }, data:{ label:'⚙️ 세션 관리\n이름 변경 / 삭제' },                   style:S.muted   },

  // 레인 3: 세션 전환·복원
  { id:'9',  position:{ x:0,   y:330 }, data:{ label:'🔀 다른 세션 선택' },                               style:S.brand   },
  { id:'10', position:{ x:220, y:330 }, data:{ label:'📥 GET /sessions/:id/messages\nlistMessages()' },   style:S.surface },
  { id:'11', position:{ x:480, y:330 }, data:{ label:'🔄 대화 목록 복원\nfileUrls JSON 파싱' },            style:S.surface },
  { id:'12', position:{ x:720, y:330 }, data:{ label:'✅ 이전 대화 화면 표시' },                           style:S.brand   },
]

const arrow = { type: MarkerType.ArrowClosed }
const brand = 'var(--color-brand-primary)'
const mk = (stroke = 'var(--border)', animated = false) => ({ markerEnd: arrow, animated, style: { stroke } })

const edges = [
  // 레인 1
  { id:'e1-2',  source:'1',  target:'2',  ...mk(brand, true) },
  { id:'e2-3',  source:'2',  target:'3',  ...mk() },

  // 레인 2
  { id:'e4-5',  source:'4',  target:'5',  ...mk(brand, true) },
  { id:'e5-6',  source:'5',  target:'6',  ...mk() },
  { id:'e6-7',  source:'6',  target:'7',  ...mk() },
  { id:'e7-8',  source:'7',  target:'8',  ...mk() },

  // 레인 3
  { id:'e9-10', source:'9',  target:'10', ...mk(brand, true) },
  { id:'e10-11',source:'10', target:'11', ...mk() },
  { id:'e11-12',source:'11', target:'12', ...mk(brand, true) },
]

export function ChatbotHistoryGuidePage() {
  const [n, , onNC] = useNodesState(nodes)
  const [e, , onEC] = useEdgesState(edges)
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5"><History className="size-5" /></div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">히스토리 관리 — 내부 프로세스</h1>
          <p className="text-xs ui-text-secondary">세션 생성 · 대화 저장 · 히스토리 복원 전체 흐름</p>
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
