import { useState } from 'react'
import { ChevronDown, FileText, LogOut, ShieldCheck, UserCog } from 'lucide-react'
import { InlineAuthBar } from '../../../features/auth/ui/inline-auth-bar'
import { useLogout } from '../../../shared/api/auth'
import { adminItems, navigationItems } from '../../../shared/config/navigation'
import { useSessionStore } from '../../../shared/store/session-store'
import { useUiStore } from '../../../shared/store/ui-store'
import { HeaderPill } from '../../../shared/ui/header-pill'
import { ThemeSwitcher } from '../../../shared/ui/theme-switcher'

export function AppHeader() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const activeSection = useUiStore((state) => state.activeSection)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userEmail = useSessionStore((state) => state.userEmail)
  const userName = useSessionStore((state) => state.userName)
  const userRole = useSessionStore((state) => state.userRole)
  const clearSession = useSessionStore((state) => state.clearSession)
  const logoutMutation = useLogout()

  const handleNavigation = (id: string) => {
    setActiveSection(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } finally {
      clearSession()
    }
    setActiveSection('prototype')
  }

  return (
    <header className="glass-panel relative z-[100] mb-3 rounded-sm px-4 py-1.5">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="shrink-0 text-left"
          onClick={() => handleNavigation('prototype')}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <span className="text-[13px] font-black tracking-tighter">TC</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
                Towercrane
              </p>
              <p className="text-[14px] font-black leading-none text-foreground">
                Prototype Console
              </p>
            </div>
          </div>
        </button>

        <nav className="flex items-center justify-center gap-1.5 flex-1 min-w-0">
          {navigationItems.map((item) => (
            <HeaderPill
              key={item.id}
              icon={item.icon}
              variant={activeSection === item.id ? 'active' : 'default'}
              onClick={() => handleNavigation(item.id)}
              labelClassName="hidden sm:inline"
            >
              {item.label}
            </HeaderPill>
          ))}

          {userRole === 'admin' && (
            <div className="relative">
              <HeaderPill
                icon={ShieldCheck}
                variant={
                  activeSection === 'users' || activeSection === 'readme_admin' ? 'active' : 'default'
                }
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                onBlur={() => setTimeout(() => setIsAdminOpen(false), 200)}
                labelClassName="hidden sm:inline"
                trailingIcon={
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`}
                  />
                }
              >
                Admin
              </HeaderPill>

              {isAdminOpen && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-40 origin-top-left animate-in zoom-in rounded-sm border border-[var(--surface-border)] bg-[var(--surface-strong)] p-1 shadow-xl backdrop-blur-xl duration-200 fade-in">
                  {adminItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNavigation(item.id)
                        setIsAdminOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px] transition-colors ui-text-secondary hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      {item.id === 'users' ? (
                        <UserCog className="size-3.5" />
                      ) : (
                        <FileText className="size-3.5" />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center justify-end gap-3 shrink-0">
          <ThemeSwitcher />
          {isAuthenticated ? (
            <>
              <HeaderPill as="span" variant="static">
                {userName || userEmail}
              </HeaderPill>
              <button
                onClick={handleLogout}
                className="flex size-8 items-center justify-center rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)]"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LogOut className="size-3.5" />
              </button>
            </>
          ) : (
            <InlineAuthBar />
          )}
        </div>
      </div>
    </header>
  )
}
