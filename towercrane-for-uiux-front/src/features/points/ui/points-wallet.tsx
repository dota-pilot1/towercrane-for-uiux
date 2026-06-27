import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Wallet as WalletIcon,
} from 'lucide-react'
import { useMyPoints, useTopupPoints, type PointTransaction } from '../../../shared/api/points'

const PRESET_AMOUNTS = [5000, 10000, 30000, 50000, 100000]

function formatPoint(n: number) {
  return n.toLocaleString('ko-KR')
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const TYPE_LABELS: Record<PointTransaction['type'], string> = {
  topup: '충전',
  spend: '사용',
  refund: '환불',
  adjust: '조정',
}

export function PointsWallet() {
  const { data, isLoading } = useMyPoints()
  const topup = useTopupPoints()

  const balance = data?.balance ?? 0
  const transactions = data?.transactions ?? []

  return (
    <div className="space-y-4">
      {/* 잔액 카드 */}
      <div className="ui-panel-soft flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <WalletIcon className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
              보유 포인트
            </p>
            <p className="mt-0.5 text-2xl font-black text-text-primary">
              {isLoading ? '—' : formatPoint(balance)}
              <span className="ml-1 text-base font-bold text-text-secondary">P</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-text-muted">1P = 1원 · 모의 결제</p>
      </div>

      {/* 충전 */}
      <div className="ui-panel-soft p-5">
        <p className="text-sm font-black text-text-primary">포인트 충전</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          금액을 선택하면 즉시 충전됩니다. (현재는 모의 결제)
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={topup.isPending}
              onClick={() => topup.mutate(amount)}
              className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-3.5 py-2 text-sm font-bold text-text-primary transition-colors hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary disabled:opacity-50"
            >
              {topup.isPending ? <Loader2 className="size-3.5 animate-spin" /> : '+'}
              {formatPoint(amount)}P
            </button>
          ))}
        </div>
        {topup.isError ? (
          <p className="mt-2 text-xs font-semibold text-destructive">
            충전에 실패했습니다. 다시 시도해주세요.
          </p>
        ) : null}
      </div>

      {/* 거래 내역 */}
      <div className="ui-panel-soft p-5">
        <p className="mb-3 text-sm font-black text-text-primary">거래 내역</p>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <WalletIcon className="size-7 text-text-muted" />
            <p className="text-sm font-semibold text-text-secondary">
              아직 거래 내역이 없습니다.
            </p>
            <p className="text-xs text-text-muted">위에서 포인트를 충전해보세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border-soft">
            {transactions.map((tx) => {
              const isPlus = tx.amount > 0
              return (
                <li key={tx.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                      isPlus
                        ? 'bg-brand-glass text-brand-primary'
                        : 'bg-surface-muted text-text-secondary'
                    }`}
                  >
                    {isPlus ? (
                      <ArrowUpCircle className="size-4" />
                    ) : (
                      <ArrowDownCircle className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-primary">
                      {tx.memo || TYPE_LABELS[tx.type]}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {formatDateTime(tx.createdAt)} · 잔액 {formatPoint(tx.balanceAfter)}P
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-black ${
                      isPlus ? 'text-brand-primary' : 'text-text-secondary'
                    }`}
                  >
                    {isPlus ? '+' : ''}
                    {formatPoint(tx.amount)}P
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
