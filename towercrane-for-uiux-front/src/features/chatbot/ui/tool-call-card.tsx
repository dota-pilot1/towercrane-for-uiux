import { Wrench } from 'lucide-react'
import type { ToolCallLog } from '../model/use-files-chat'

// 도구 호출 로그 한 건 — 이름 / 입력 파라미터 / 결과
export function ToolCallCard({ call }: { call: ToolCallLog }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-glass p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Wrench className="size-3.5 text-brand-primary shrink-0" />
        <span className="text-xs font-bold text-brand-primary">{call.name}</span>
        <span className="ml-auto text-[10px] ui-text-muted border border-surface-border-soft rounded px-1.5 py-0.5">done</span>
      </div>
      <div>
        <p className="text-[10px] ui-text-muted mb-1">입력</p>
        <pre className="text-[11px] ui-text-secondary bg-surface-muted rounded p-2 overflow-x-auto">
          {JSON.stringify(call.input, null, 2)}
        </pre>
      </div>
      <div>
        <p className="text-[10px] ui-text-muted mb-1">결과</p>
        <pre className="text-[11px] text-brand-primary bg-surface-muted rounded p-2 overflow-x-auto">
          {JSON.stringify(call.result, null, 2)}
        </pre>
      </div>
    </div>
  )
}
