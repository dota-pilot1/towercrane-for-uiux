import { ClipboardList, Wrench, type LucideIcon } from 'lucide-react'

/**
 * 도구 호출 페이지 오른쪽 패널에 소개하는 툴 목록.
 * 서버의 SELF_INTRODUCE_TOOL / GET_MY_TASKS_TOOL(chatbot.service.ts)과 짝을 이룬다 —
 * 서버에 툴을 추가하면 여기에도 한 항목 추가해야 화면에 노출된다.
 */
export type ToolCatalogEntry = {
  name: string
  icon: LucideIcon
  summary: string
  description: string
  examples: string[]
  footnote: string
}

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  {
    name: 'self_introduce',
    icon: Wrench,
    summary: 'GPT 자기소개 툴',
    description:
      '사용자가 GPT 자기소개를 요청할 때 발동합니다. 모델 정보·기능·스펙을 카드 다이얼로그로 표시합니다.',
    examples: ['자기소개해줘', '넌 누구야', 'who are you', '너에 대해 알려줘'],
    footnote: '파라미터 없음 · 다이얼로그 전용',
  },
  {
    name: 'get_my_tasks',
    icon: ClipboardList,
    summary: '담당 업무 조회 툴',
    description:
      '현재 로그인한 사용자가 담당자로 지정된 업무 목록을 DB에서 조회합니다. 업무명·타입·우선순위·상태·마감일을 테이블로 표시합니다.',
    examples: ['내 업무 보여줘', '내 할일 알려줘', '담당 업무 조회', '나한테 배정된 업무'],
    footnote: '파라미터 없음 · DB 조회 · 테이블 다이얼로그',
  },
]
