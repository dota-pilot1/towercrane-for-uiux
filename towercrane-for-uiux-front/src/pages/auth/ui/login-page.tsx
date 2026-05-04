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
                팀의 UI 실험과 문서를 한 곳에서 관리합니다.
              </h1>
              <p className="mt-5 max-w-[420px] text-sm leading-7 text-text-secondary">
                이메일 인증으로 계정을 만들고, 프로토타입과 회의실, 문서 작업 공간에 바로 접근합니다.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Prototype', 'README', 'Meeting'].map((item) => (
                <div key={item} className="rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3">
                  <p className="text-xs font-semibold text-text-secondary">{item}</p>
                </div>
              ))}
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
