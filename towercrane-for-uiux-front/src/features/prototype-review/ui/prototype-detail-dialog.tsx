import * as Dialog from '@radix-ui/react-dialog'
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Info,
  Link as LinkIcon,
  MessageSquare,
  Star,
  StickyNote,
  X,
} from 'lucide-react'
import type { PrototypeListItem } from '../../../shared/api/catalog'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { ReviewForm } from './review-form'
import { ReviewList } from './review-list'
import { ReviewStats } from './review-stats'

type Props = {
  prototype: PrototypeListItem
}

export function PrototypeDetailDialog({ prototype }: Props) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          size="icon"
          tone="default"
          title="상세 보기"
          aria-label="상세 보기"
        >
          <Info className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="glass-panel fixed left-1/2 top-1/2 w-[min(1100px,calc(100vw-2rem))] h-[min(720px,calc(100vh-4rem))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] overflow-hidden z-50 flex flex-col"
        >
          {/* Header with gradient accent */}
          <div className="relative shrink-0 border-b border-[var(--surface-border)] bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent px-6 py-4">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-emerald-400/20 to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500/80 border border-emerald-500/20 shrink-0">
                  <Info className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mb-0.5">
                    Prototype Detail
                  </div>
                  <Dialog.Title className="ui-text-primary truncate text-lg font-bold">
                    {prototype.title}
                  </Dialog.Title>
                </div>
              </div>
              <Dialog.Close asChild>
                <Button size="icon" tone="default" className="size-8 rounded-lg shrink-0" aria-label="닫기">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(440px,520px)_minmax(0,1fr)] flex-1 min-h-0">
            {/* META */}
            <div className="overflow-y-auto border-b border-[var(--surface-border)] p-6 md:border-b-0 md:border-r">
              <MetaPanel prototype={prototype} />
            </div>

            {/* REVIEWS */}
            <div className="flex flex-col gap-4 overflow-y-auto bg-gradient-to-b from-[var(--surface-muted)]/30 to-transparent p-6">
              <div className="flex items-center gap-1.5 ui-text-muted">
                <MessageSquare className="size-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  Reviews & Ratings
                </span>
              </div>
              <ReviewList
                prototypeId={prototype.id}
                headerAction={
                  <ReviewForm
                    prototypeId={prototype.id}
                    disabled={!isAuthenticated}
                    inlineTrigger
                  />
                }
              />
              <ReviewStats prototypeId={prototype.id} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MetaPanel({ prototype }: { prototype: PrototypeListItem }) {
  return (
    <div className="space-y-5">
      {/* Hero accent strip + summary */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent p-5">
        <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-emerald-400/60 via-emerald-400/20 to-transparent" />
        <div className="flex items-center gap-2 mb-2">
          <FileText className="size-3.5 text-emerald-500/70" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
            Summary
          </span>
        </div>
        <p className="ui-text-primary text-sm leading-relaxed whitespace-pre-wrap">
          {prototype.summary}
        </p>
      </section>

      {/* Quick stats grid */}
      <section className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Star className="size-3.5 fill-amber-400 text-amber-400" />}
          label="Rating"
          value={
            prototype.reviewCount > 0
              ? `${prototype.avgRating.toFixed(1)} / 10`
              : '—'
          }
          hint={`${prototype.reviewCount} reviews`}
        />
        <StatCard
          icon={<StatusDot status={prototype.status} />}
          label="Status"
          value={prototype.status.toUpperCase()}
          hint={prototype.visibility}
        />
      </section>

      {/* Tags */}
      {prototype.tags.length > 0 ? (
        <section>
          <SectionHeader icon={<Hash className="size-3.5" />} label="Tags" />
          <div className="flex flex-wrap gap-1.5">
            {prototype.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] ui-text-secondary hover:border-emerald-500/30 hover:text-emerald-600 transition-colors cursor-default"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Links */}
      <section>
        <SectionHeader icon={<LinkIcon className="size-3.5" />} label="Links" />
        <div className="space-y-1.5">
          <LinkRow kind="github" href={prototype.repoUrl} />
          {prototype.demoUrl ? (
            <LinkRow kind="demo" href={prototype.demoUrl} />
          ) : null}
          {prototype.figmaUrl ? (
            <LinkRow kind="figma" href={prototype.figmaUrl} />
          ) : null}
        </div>
      </section>

      {/* Notes */}
      {prototype.notes ? (
        <section>
          <SectionHeader
            icon={<StickyNote className="size-3.5" />}
            label="Notes"
          />
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
            <p className="ui-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {prototype.notes}
            </p>
          </div>
        </section>
      ) : null}

      {/* Timeline */}
      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
        <SectionHeader
          icon={<CalendarClock className="size-3.5" />}
          label="Timeline"
        />
        <ul className="space-y-2">
          <TimelineRow label="생성" date={prototype.createdAt} color="emerald" />
          <TimelineRow label="수정" date={prototype.updatedAt} color="sky" />
        </ul>
      </section>
    </div>
  )
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 ui-text-muted">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 transition-colors hover:border-emerald-500/20">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest ui-text-muted">
          {label}
        </span>
      </div>
      <div className="ui-text-primary text-base font-semibold tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[11px] ui-text-muted">{hint}</div>
      ) : null}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = {
    draft: 'bg-slate-400',
    building: 'bg-amber-400',
    ready: 'bg-emerald-400',
  }
  return (
    <span className="relative inline-flex size-2.5">
      <span
        className={`absolute inset-0 rounded-full ${
          color[status] ?? color.draft
        } opacity-75 animate-ping`}
      />
      <span
        className={`relative inline-flex size-2.5 rounded-full ${
          color[status] ?? color.draft
        }`}
      />
    </span>
  )
}

const LINK_META: Record<
  'github' | 'demo' | 'figma',
  { label: string; accent: string; icon: React.ReactNode }
> = {
  github: {
    label: 'GitHub',
    accent: 'hover:border-slate-500/40 hover:bg-slate-500/10',
    icon: (
      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
      </svg>
    ),
  },
  demo: {
    label: 'Demo',
    accent: 'hover:border-emerald-500/40 hover:bg-emerald-500/10',
    icon: <Globe className="size-3.5" />,
  },
  figma: {
    label: 'Figma',
    accent: 'hover:border-pink-500/40 hover:bg-pink-500/10',
    icon: (
      <svg
        className="size-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
        <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
        <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
        <path d="M12 9h3.5a3.5 3.5 0 1 1 0 7H12V9z" />
        <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
      </svg>
    ),
  },
}

function LinkRow({
  kind,
  href,
}: {
  kind: 'github' | 'demo' | 'figma'
  href: string
}) {
  const meta = LINK_META[kind]
  const host = href.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 transition-all group ${meta.accent}`}
    >
      <div className="flex size-8 items-center justify-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-strong)] ui-text-secondary group-hover:border-current">
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest ui-text-muted">
          {meta.label}
        </div>
        <div className="truncate text-[12px] ui-text-primary font-mono">
          {host}
        </div>
      </div>
      <ExternalLink className="size-3.5 ui-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  )
}

function TimelineRow({
  label,
  date,
  color,
}: {
  label: string
  date: string
  color: 'emerald' | 'sky'
}) {
  const dotColor =
    color === 'emerald' ? 'bg-emerald-400' : 'bg-sky-400'
  return (
    <li className="flex items-center gap-2 text-[12px]">
      <span className={`size-1.5 rounded-full ${dotColor}`} />
      <span className="ui-text-muted w-8">{label}</span>
      <span className="ui-text-secondary font-mono tabular-nums">
        {new Date(date).toLocaleDateString()}
      </span>
    </li>
  )
}
