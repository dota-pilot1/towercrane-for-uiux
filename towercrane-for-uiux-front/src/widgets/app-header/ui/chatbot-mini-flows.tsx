import { ReactFlow, Background, BackgroundVariant, type Node, type Edge, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const B = { background: 'var(--brand-glass)', border: '1.5px solid var(--brand-border)', color: 'var(--brand-primary)', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700 }
const S = { background: 'var(--surface-raised)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', borderRadius: 8, padding: '6px 12px', fontSize: 11 }
const M = { background: 'var(--surface-muted)', border: '1px solid var(--surface-border-soft)', color: 'var(--text-secondary)', borderRadius: 8, padding: '6px 10px', fontSize: 10 }

const arrow = { type: MarkerType.ArrowClosed }
const ae = (id: string, s: string, t: string, animated = false) => ({
  id, source: s, target: t, animated,
  markerEnd: arrow,
  style: { stroke: animated ? 'var(--brand-primary)' : 'var(--surface-border)' },
})

const FLOWS: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  chatbot_basic: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'💬 사용자 입력' }, style:B },
      { id:'2', position:{ x:160,y:0  }, data:{ label:'🗄️ DB 저장' },     style:M },
      { id:'3', position:{ x:160,y:80 }, data:{ label:'🤖 GPT-4o-mini\nchat.completions' }, style:S },
      { id:'4', position:{ x:340,y:60 }, data:{ label:'✨ Markdown\n렌더링' },               style:S },
      { id:'5', position:{ x:500,y:60 }, data:{ label:'✅ 응답 완료' },    style:B },
    ],
    edges: [ae('e1-2','1','2'), ae('e1-3','1','3'), ae('e3-4','3','4',true), ae('e2-4','2','4'), ae('e4-5','4','5',true)],
  },

  chatbot_streaming: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'💬 전송' },                   style:B },
      { id:'2', position:{ x:150,y:60 }, data:{ label:'📡 SSE 연결\ntext/event-stream' }, style:S },
      { id:'3', position:{ x:310,y:0  }, data:{ label:'🤖 OpenAI\nstream:true' },    style:S },
      { id:'4', position:{ x:310,y:110 }, data:{ label:'📝 이전 대화\nbuildHistory()' }, style:M },
      { id:'5', position:{ x:480,y:60 }, data:{ label:'🔄 청크\n수신 반복' },          style:S },
      { id:'6', position:{ x:640,y:60 }, data:{ label:'✅ 실시간\n렌더링' },           style:B },
    ],
    edges: [ae('e1-2','1','2',true), ae('e2-3','2','3'), ae('e2-4','2','4'), ae('e3-5','3','5',true), ae('e5-6','5','6',true)],
  },

  chatbot_history: {
    nodes: [
      { id:'1', position:{ x:0,  y:60  }, data:{ label:'➕ 새 대화' },                style:B },
      { id:'2', position:{ x:160,y:0   }, data:{ label:'🗄️ 세션 생성\nrandomUUID' }, style:S },
      { id:'3', position:{ x:160,y:120 }, data:{ label:'💬 메시지\nDB 저장' },        style:M },
      { id:'4', position:{ x:330,y:60  }, data:{ label:'🔀 세션 전환' },              style:S },
      { id:'5', position:{ x:490,y:60  }, data:{ label:'📥 히스토리\n복원' },         style:S },
      { id:'6', position:{ x:640,y:60  }, data:{ label:'✅ 대화\n표시' },             style:B },
    ],
    edges: [ae('e1-2','1','2'), ae('e1-3','1','3'), ae('e2-4','2','4'), ae('e3-4','3','4'), ae('e4-5','4','5',true), ae('e5-6','5','6',true)],
  },

  chatbot_files: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'📎 파일 선택' },               style:B },
      { id:'2', position:{ x:160,y:0  }, data:{ label:'⚠️ 크기/개수\n검증' },         style:M },
      { id:'3', position:{ x:160,y:110}, data:{ label:'☁️ S3 업로드\nPresigned URL' }, style:S },
      { id:'4', position:{ x:330,y:60 }, data:{ label:'🖼️ image_url\npart 구성' },    style:S },
      { id:'5', position:{ x:490,y:60 }, data:{ label:'🤖 GPT-4o\nVision 분석' },     style:S },
      { id:'6', position:{ x:640,y:60 }, data:{ label:'✅ 분석 결과\n응답' },          style:B },
    ],
    edges: [ae('e1-2','1','2'), ae('e1-3','1','3',true), ae('e3-4','3','4'), ae('e2-4','2','4'), ae('e4-5','4','5',true), ae('e5-6','5','6',true)],
  },

  chatbot_basic_guide: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'📖 기본 채팅\n프로세스 가이드' }, style:B },
      { id:'2', position:{ x:200,y:60 }, data:{ label:'⚛️ React Flow\n인터랙티브 다이어그램' }, style:S },
      { id:'3', position:{ x:400,y:60 }, data:{ label:'🔍 드래그·확대\n상세 탐색 가능' }, style:M },
    ],
    edges: [ae('e1-2','1','2',true), ae('e2-3','2','3')],
  },

  chatbot_streaming_guide: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'📖 스트리밍\n프로세스 가이드' }, style:B },
      { id:'2', position:{ x:200,y:60 }, data:{ label:'⚛️ SSE 흐름\n시각화' },          style:S },
      { id:'3', position:{ x:400,y:60 }, data:{ label:'🔍 토큰 청크\n수신 과정' },       style:M },
    ],
    edges: [ae('e1-2','1','2',true), ae('e2-3','2','3')],
  },

  chatbot_history_guide: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'📖 히스토리\n프로세스 가이드' }, style:B },
      { id:'2', position:{ x:200,y:60 }, data:{ label:'⚛️ 세션 관리\n흐름 시각화' },   style:S },
      { id:'3', position:{ x:400,y:60 }, data:{ label:'🔍 DB 저장·\n복원 과정' },       style:M },
    ],
    edges: [ae('e1-2','1','2',true), ae('e2-3','2','3')],
  },

  chatbot_files_guide: {
    nodes: [
      { id:'1', position:{ x:0,  y:60 }, data:{ label:'📖 파일 첨부\n프로세스 가이드' }, style:B },
      { id:'2', position:{ x:200,y:60 }, data:{ label:'⚛️ S3 업로드\n+Vision 흐름' },  style:S },
      { id:'3', position:{ x:400,y:60 }, data:{ label:'🔍 멀티모달\n파이프라인' },       style:M },
    ],
    edges: [ae('e1-2','1','2',true), ae('e2-3','2','3')],
  },

}

const DEFAULT_FLOW = {
  nodes: [
    { id:'1', position:{ x:0,  y:60 }, data:{ label:'📂 메뉴 선택' }, style:B },
    { id:'2', position:{ x:200,y:60 }, data:{ label:'→ 페이지 이동' }, style:S },
  ],
  edges: [ae('e1-2','1','2',true)],
}

export function MiniFlow({ sectionId }: { sectionId: string | null | undefined }) {
  const flow = sectionId ? (FLOWS[sectionId] ?? DEFAULT_FLOW) : DEFAULT_FLOW
  return (
    <ReactFlow
      nodes={flow.nodes}
      edges={flow.edges}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={14} size={1} color="var(--surface-border-soft)" />
    </ReactFlow>
  )
}
