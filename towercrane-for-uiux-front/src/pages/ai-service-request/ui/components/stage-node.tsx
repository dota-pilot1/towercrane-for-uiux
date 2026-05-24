import { Handle, Position } from '@xyflow/react'
import {
  ClipboardList,
  UserCheck,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'

export type StageNodeStatus = 'completed' | 'current' | 'pending' | 'rejected'

export interface StageNodeProps {
  data: {
    label: string
    owner: string
    status: StageNodeStatus
    stageId: string
    isSelected?: boolean
  }
}

const iconMap = {
  request: ClipboardList,
  manager: UserCheck,
  admin: ShieldCheck,
  grant: KeyRound,
  active: CheckCircle2,
}

export function StageNode({ data }: StageNodeProps) {
  const { label, owner, status, stageId, isSelected } = data

  // Determine icon based on stageId
  const IconComponent = iconMap[stageId as keyof typeof iconMap] || HelpCircle

  // Status mapping to semantic styles
  let statusStyles = ''
  let iconColor = ''

  switch (status) {
    case 'completed':
      statusStyles = 'border-brand-border bg-brand-glass text-brand-primary'
      iconColor = 'text-brand-primary'
      break
    case 'current':
      // Progress pulse indicator using standard surface raised
      statusStyles = 'border-brand-border bg-surface-raised text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-2 ring-brand-border/20'
      iconColor = 'text-brand-primary animate-pulse'
      break
    case 'rejected':
      statusStyles = 'border-destructive bg-danger-glass text-destructive'
      iconColor = 'text-destructive'
      break
    case 'pending':
    default:
      statusStyles = 'border-surface-border-soft bg-surface-muted text-text-muted'
      iconColor = 'text-text-muted'
      break
  }

  // Active border if selected
  const activeBorder = isSelected 
    ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-background' 
    : ''

  return (
    <div 
      className={`relative flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all duration-300 ${statusStyles} ${activeBorder} w-[170px] min-h-[60px]`}
    >
      {/* Target Handle (Left) */}
      {stageId !== 'request' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: 'var(--surface-border)', width: 6, height: 6 }}
        />
      )}

      {/* Icon Area */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background/40">
        {status === 'rejected' ? (
          <AlertCircle className="size-4 text-destructive" />
        ) : (
          <IconComponent className={`size-4 ${iconColor}`} />
        )}
      </div>

      {/* Content Area */}
      <div className="min-w-0 text-left">
        <h4 className="truncate text-[11px] font-bold text-text-primary leading-tight">
          {label}
        </h4>
        <p className="mt-0.5 text-[9px] text-text-muted font-medium">
          {owner}
        </p>
      </div>

      {/* Source Handle (Right) */}
      {stageId !== 'active' && status !== 'rejected' && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: 'var(--surface-border)', width: 6, height: 6 }}
        />
      )}
    </div>
  )
}
