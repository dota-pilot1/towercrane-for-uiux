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
import { Paperclip } from 'lucide-react'

const S = {
  brand:   { background: 'var(--color-brand-glass)',                                              border: '1.5px solid var(--color-brand-border)',                           color: 'var(--color-brand-primary)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700 },
  surface: { background: 'var(--card)',                                                            border: '1px solid var(--border)',                                         color: 'var(--foreground)',           borderRadius: 10, padding: '10px 18px', fontSize: 13 },
  muted:   { background: 'var(--muted)',                                                           border: '1px solid var(--border)',                                         color: 'var(--muted-foreground)',     borderRadius: 10, padding: '10px 16px', fontSize: 12 },
  warn:    { background: 'color-mix(in srgb, oklch(0.8 0.15 85) 12%, var(--card))',               border: '1px solid color-mix(in srgb, oklch(0.7 0.15 85) 35%, transparent)', color: 'oklch(0.45 0.12 75)',        borderRadius: 10, padding: '10px 16px', fontSize: 12 },
}

// 메인 파이프라인 (y=140): 파일선택 → S3업로드 → Content구성 → GPT Vision → 응답 → 완료
// 위(y=0):  클라이언트 검증, 이미지 판별
// 아래(y=290): CDN URL, fileUrls DB 저장
const nodes = [
  { id:'1', position:{ x:0,    y:140 }, data:{ label:'📎 파일 선택\n(이미지 / 문서)' },                      style:S.brand   },
  { id:'2', position:{ x:220,  y:140 }, data:{ label:'☁️ S3 업로드\nPUT presigned URL' },                   style:S.surface },
  { id:'3', position:{ x:460,  y:140 }, data:{ label:'📦 Content 구성\nbuildUserContent()\nimage_url + text' }, style:S.surface },
  { id:'4', position:{ x:700,  y:140 }, data:{ label:'🤖 GPT-4o-mini\nVision 자동 선택\nhasImage → gpt-4o' }, style:S.surface },
  { id:'5', position:{ x:940,  y:140 }, data:{ label:'💬 멀티모달 응답\n이미지 내용 설명' },                  style:S.surface },
  { id:'6', position:{ x:1160, y:140 }, data:{ label:'✅ 응답 완료' },                                        style:S.brand   },

  // 위: 검증, 이미지 판별
  { id:'7', position:{ x:180,  y:0   }, data:{ label:'⚠️ 클라이언트 검증\n최대 5개 · 10MB 제한' },           style:S.warn    },
  { id:'8', position:{ x:450,  y:0   }, data:{ label:'🖼️ 이미지 판별\n/\\.(jpg|png|gif|webp)/i' },           style:S.muted   },

  // 아래: CDN URL, DB 저장
  { id:'9', position:{ x:220,  y:300 }, data:{ label:'🔗 CDN URL 반환\npublic S3 URL' },                     style:S.muted   },
  { id:'10',position:{ x:940,  y:300 }, data:{ label:'🗄️ fileUrls JSON 저장\nchatMessagesTable' },           style:S.muted   },
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
  { id:'e3-4', source:'3', target:'4', ...mk(brand, true) },
  { id:'e4-5', source:'4', target:'5', ...mk(brand, true) },
  { id:'e5-6', source:'5', target:'6', ...mk(brand, true) },

  // 위: 검증(파일선택→검증), 이미지판별(S3→판별→Content)
  { id:'e1-7', source:'1', target:'7', ...mk() },
  { id:'e2-8', source:'2', target:'8', ...mk() },
  { id:'e8-3', source:'8', target:'3', ...mk() },

  // 아래: S3 → CDN URL → Content, GPT → DB 저장 → 완료
  { id:'e2-9', source:'2', target:'9', ...mk() },
  { id:'e9-3', source:'9', target:'3', ...mk() },
  { id:'e4-10',source:'4', target:'10',...mk() },
  { id:'e10-6',source:'10',target:'6', ...mk() },
]

export function ChatbotFilesGuidePage() {
  const [n, , onNC] = useNodesState(nodes)
  const [e, , onEC] = useEdgesState(edges)
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5"><Paperclip className="size-5" /></div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">파일 첨부 — 내부 프로세스</h1>
          <p className="text-xs ui-text-secondary">S3 업로드 → GPT-4o Vision 멀티모달 분석 흐름</p>
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
