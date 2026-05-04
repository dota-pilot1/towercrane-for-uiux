import { InlineAuthBar } from '../../../features/auth/ui/inline-auth-bar'
import { Card } from '../../../shared/ui/card'

export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[1180px] items-center px-4 py-10">
      <Card className="grid w-full overflow-hidden rounded-lg p-0 shadow-2xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden min-h-[560px] overflow-hidden border-r border-surface-border-soft bg-surface-muted lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--brand-glass),transparent_34%),linear-gradient(135deg,var(--surface-raised),var(--surface-muted))]" />
          <div className="relative flex h-full flex-col justify-between p-10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                <span className="text-sm font-black tracking-tighter">TC</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-primary">
                  Towercrane
                </p>
                <p className="text-sm font-black text-text-primary">Prototype Console</p>
              </div>
            </div>

            <div className="max-w-[520px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-brand-primary">
                Prototype Registry
              </p>
              <h1 className="mt-4 text-5xl font-black leading-tight text-text-primary">
                아이디어를 프로토타입으로 공유하고 발전시킵니다.
              </h1>
              <p className="mt-5 max-w-[420px] text-sm leading-7 text-text-secondary">
                화면, 기능 흐름, 서비스 컨셉, 문서 초안까지 초기 버전을 모아 함께 검토하고 다음 단계로 이어갑니다.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">
                    Prototype Board
                  </span>
                  <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                    Share
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Concept', 'Flow', 'Spec'].map((item) => (
                    <div key={item} className="rounded-sm border border-surface-border-soft bg-surface-muted px-3 py-2">
                      <p className="text-xs font-semibold text-text-secondary">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[560px] items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[520px]">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-text-primary">로그인</h2>
              <p className="mt-2 text-sm text-text-secondary">
                상단 입력 대신 이 페이지에서 로그인과 회원가입을 진행합니다.
              </p>
            </div>
            <InlineAuthBar embedded />
          </div>
        </section>
      </Card>
    </main>
  )
}
