import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  RotateCcw,
  Wallet as WalletIcon,
} from 'lucide-react'
import {
  useMyPoints,
  usePortonePayTopup,
  useRefundTopup,
  type PointTopup,
  type PointTransaction,
} from '../../../shared/api/points'

const TOPUP_STATUS_LABELS: Record<PointTopup['status'], string> = {
  pending: '대기',
  paid: '충전 완료',
  cancelling: '취소 처리 중',
  cancelled: '취소됨',
  failed: '실패',
}

// 지인 소액 테스트 단계 — 1,000원 이내로만 충전 허용
const PRESET_AMOUNTS = [100, 500, 1000]

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
  const topup = usePortonePayTopup()
  const refund = useRefundTopup()

  const balance = data?.balance ?? 0
  const transactions = data?.transactions ?? []
  const topups = data?.topups ?? []

  const handleRefund = (item: PointTopup) => {
    if (balance < item.points) {
      alert('이미 사용한 포인트가 있어 전액 환불할 수 없습니다.')
      return
    }
    if (
      !window.confirm(
        `${formatPoint(item.points)}P 충전을 취소하시겠어요?\n결제하신 ${formatPoint(item.amountKrw)}원이 카카오페이로 환불됩니다.`,
      )
    ) {
      return
    }
    refund.mutate(item.id)
  }

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
        <p className="text-xs text-text-muted">1P = 1원 · 카카오페이</p>
      </div>

      {/* 충전 */}
      <div className="ui-panel-soft p-5">
        <p className="text-sm font-black text-text-primary">포인트 충전</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          금액을 선택하면 카카오페이 결제창이 열립니다. (테스트 단계 · 1,000원 이내)
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
            {topup.error?.message ?? '충전에 실패했습니다. 다시 시도해주세요.'}
          </p>
        ) : null}
        {topup.isSuccess ? (
          <p className="mt-2 text-xs font-semibold text-brand-primary">
            충전이 완료되었습니다.
          </p>
        ) : null}
      </div>

      {/* 충전 내역 (취소/환불) */}
      {topups.length > 0 ? (
        <div className="ui-panel-soft p-5">
          <p className="mb-1 text-sm font-black text-text-primary">충전 내역</p>
          <p className="mb-3 text-xs text-text-secondary">
            충전한 포인트를 아직 쓰지 않았다면 전액 취소(환불)할 수 있습니다.
          </p>
          {refund.isError ? (
            <p className="mb-2 text-xs font-semibold text-destructive">
              {refund.error?.message ?? '취소에 실패했습니다.'}
            </p>
          ) : null}
          <ul className="divide-y divide-surface-border-soft">
            {topups.map((item) => {
              const isPaid = item.status === 'paid'
              const isPortone = item.provider === 'portone'
              const canRefund = isPaid && isPortone && balance >= item.points
              const isRefunding = refund.isPending && refund.variables === item.id
              return (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-primary">
                      {formatPoint(item.points)}P 충전
                      <span className="ml-1.5 text-xs font-semibold text-text-muted">
                        ({formatPoint(item.amountKrw)}원)
                      </span>
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {formatDateTime(item.createdAt)} ·{' '}
                      <span
                        className={
                          item.status === 'cancelled'
                            ? 'text-text-secondary'
                            : isPaid
                              ? 'text-brand-primary'
                              : 'text-text-muted'
                        }
                      >
                        {TOPUP_STATUS_LABELS[item.status]}
                      </span>
                      {isPortone ? '' : ' · 모의'}
                    </p>
                  </div>
                  {canRefund ? (
                    <button
                      type="button"
                      disabled={refund.isPending}
                      onClick={() => handleRefund(item)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      {isRefunding ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      취소
                    </button>
                  ) : isPaid && isPortone ? (
                    <span className="shrink-0 text-[11px] text-text-muted">
                      포인트 사용됨
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

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
