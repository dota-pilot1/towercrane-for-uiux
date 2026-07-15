import { BookOpen, Building2, CalendarDays, CheckCircle2, Cpu, Languages, X } from 'lucide-react'
import { useToolDialogStore } from '../model/tool-dialog-store'

// self_introduce 툴 호출 결과 — GPT 모델 카드
export function ToolIntroDialog() {
  const { introOpen, introProfile, closeIntroDialog } = useToolDialogStore()

  if (!introOpen || !introProfile) return null

  const specs = [
    { icon: CalendarDays, label: '출시일', value: introProfile.released },
    { icon: BookOpen, label: '지식 기준일', value: introProfile.knowledgeCutoff },
    { icon: Cpu, label: '컨텍스트', value: introProfile.contextWindow },
    { icon: Languages, label: '지원 언어', value: introProfile.languages },
    { icon: Building2, label: '개발사', value: introProfile.developer },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="ui-panel rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        <div className="bg-brand-glass border-b border-brand-border px-6 py-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border shrink-0">
            <Cpu className="size-5 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-brand-primary">{introProfile.model}</p>
            <p className="text-xs ui-text-muted">by {introProfile.developer}</p>
          </div>
          <button onClick={closeIntroDialog} className="ui-icon-button p-1.5 rounded-lg">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <p className="text-sm ui-text-secondary leading-relaxed">{introProfile.description}</p>

          <div className="grid grid-cols-2 gap-2.5">
            {specs.map(({ icon: Icon, label, value }) => (
              <div key={label} className="ui-panel-soft rounded-xl p-3 flex items-start gap-2.5">
                <Icon className="size-3.5 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] ui-text-muted leading-none mb-1">{label}</p>
                  <p className="text-xs font-semibold ui-text-primary">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-bold ui-text-muted uppercase tracking-wide mb-2">주요 기능</p>
            <div className="flex flex-wrap gap-1.5">
              {introProfile.capabilities.map((cap) => (
                <span key={cap} className="inline-flex items-center gap-1 rounded-full bg-brand-glass border border-brand-border px-2.5 py-1 text-[11px] font-medium text-brand-primary">
                  <CheckCircle2 className="size-3" />
                  {cap}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={closeIntroDialog}
            className="w-full rounded-lg border border-brand-border bg-brand-glass py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
