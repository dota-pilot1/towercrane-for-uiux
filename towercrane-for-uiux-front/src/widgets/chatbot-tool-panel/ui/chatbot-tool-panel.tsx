import { Hammer, ListChecks, Zap } from 'lucide-react'
import { TOOL_CATALOG, type ToolCatalogEntry } from '../../../features/chatbot/model/tool-catalog'
import { ToolCallCard } from '../../../features/chatbot/ui/tool-call-card'
import type { ToolCallLog } from '../../../features/chatbot/model/use-files-chat'

export type ToolPanelTab = 'tools' | 'logs'

function ToolCatalogCard({ tool }: { tool: ToolCatalogEntry }) {
  const Icon = tool.icon
  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-brand-glass border border-brand-border shrink-0">
          <Icon className="size-3.5 text-brand-primary" />
        </div>
        <div>
          <p className="text-xs font-bold ui-text-primary">{tool.name}</p>
          <p className="text-[10px] ui-text-muted">{tool.summary}</p>
        </div>
        <span className="ml-auto text-[10px] rounded-full bg-brand-glass border border-brand-border text-brand-primary px-2 py-0.5">active</span>
      </div>
      <p className="text-[11px] ui-text-secondary leading-relaxed">{tool.description}</p>
      <div className="flex flex-wrap gap-1">
        {tool.examples.map((ex) => (
          <span key={ex} className="text-[10px] rounded bg-surface-raised border border-surface-border-soft ui-text-muted px-1.5 py-0.5">
            {ex}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 pt-1 border-t border-surface-border-soft">
        <Zap className="size-3 text-brand-primary" />
        <span className="text-[10px] ui-text-muted">{tool.footnote}</span>
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, icon: Icon, label, badge,
}: {
  active: boolean
  onClick: () => void
  icon: typeof ListChecks
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
        active
          ? 'bg-surface-raised border border-surface-border text-brand-primary shadow-sm scale-[1.01]'
          : 'text-text-secondary hover:text-text-primary border border-transparent hover:bg-surface-raised/40'
      }`}
    >
      <Icon className={`size-4 transition-colors ${active ? 'text-brand-primary' : 'text-text-muted'}`} />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`ml-1 rounded-full text-[10px] font-extrabold px-1.5 py-0.5 leading-none transition-colors duration-200 ${
          active ? 'bg-brand-primary text-primary-foreground' : 'bg-surface-border-soft text-text-secondary'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// 도구 호출 페이지 오른쪽 패널 — 사용 가능한 툴 카탈로그 / 호출 로그 탭
export function ChatbotToolPanel({
  tab, onTabChange, toolCalls,
}: {
  tab: ToolPanelTab
  onTabChange: (tab: ToolPanelTab) => void
  toolCalls: ToolCallLog[]
}) {
  return (
    <aside className="hidden min-h-0 w-[420px] shrink-0 flex-col rounded-lg border border-surface-border bg-surface-raised xl:flex">

      <div className="shrink-0 border-b border-surface-border bg-brand-glass p-2">
        <div className="grid grid-cols-2 gap-1 bg-surface-muted p-1 rounded-xl border border-surface-border-soft relative">
          <TabButton
            active={tab === 'tools'}
            onClick={() => onTabChange('tools')}
            icon={ListChecks}
            label="사용 가능한 툴"
          />
          <TabButton
            active={tab === 'logs'}
            onClick={() => onTabChange('logs')}
            icon={Hammer}
            label="호출 로그"
            badge={toolCalls.length}
          />
        </div>
      </div>

      {tab === 'tools' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {TOOL_CATALOG.map((tool) => (
            <ToolCatalogCard key={tool.name} tool={tool} />
          ))}
        </div>
      )}

      {tab === 'logs' && (
        toolCalls.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-6">
            <Hammer className="size-6 ui-text-muted" />
            <p className="text-sm font-semibold ui-text-secondary">아직 도구가 없습니다.</p>
            <p className="max-w-56 text-xs leading-5 ui-text-muted">
              질문을 보내면 AI가 호출한 도구 목록과 실행 결과가 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {toolCalls.map((call, i) => (
              <ToolCallCard key={i} call={call} />
            ))}
          </div>
        )
      )}
    </aside>
  )
}
