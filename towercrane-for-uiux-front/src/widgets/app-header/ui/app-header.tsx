import { Fragment, useMemo, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { InlineAuthBar } from '../../../features/auth/ui/inline-auth-bar'
import { useLogout } from '../../../shared/api/auth'
import { useSessionStore } from '../../../shared/store/session-store'
import { useUiStore } from '../../../shared/store/ui-store'
import { HeaderPill } from '../../../shared/ui/header-pill'
import { ThemeSwitcher } from '../../../shared/ui/theme-switcher'
import { useMenus } from '../../../entities/menu/api/menu-api'
import { buildTree } from '../../../entities/menu/lib/build-tree'
import type { MenuItem } from '../../../entities/menu/model/types'

function getIcon(iconName: string | null): React.ElementType {
  if (!iconName) return LucideIcons.FileText;
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.FileText;
}

function NavDropdown({
  item,
  activeSection,
  handleNavigation
}: {
  item: MenuItem;
  activeSection: string;
  handleNavigation: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = getIcon(item.icon);

  const isActive = item.children.some((child) => child.sectionId === activeSection) || item.sectionId === activeSection;

  return (
    <div className="relative">
      <HeaderPill
        icon={Icon}
        variant={isActive ? 'active' : 'default'}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        labelClassName="hidden sm:inline"
        trailingIcon={
          <LucideIcons.ChevronDown
            className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        }
      >
        {item.name}
      </HeaderPill>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-44 origin-top-left animate-in zoom-in rounded-md border border-surface-border bg-surface-raised p-1.5 shadow-2xl duration-200 fade-in">
          {item.children.map((child) => {
            const ChildIcon = getIcon(child.icon);
            return (
              <button
                key={child.id}
                onClick={() => {
                  if (child.sectionId) handleNavigation(child.sectionId);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] transition-all ui-text-secondary hover:bg-surface-muted hover:ui-text-primary hover:scale-[1.02] active:scale-[0.98]"
              >
                <ChildIcon className="size-3.5" />
                {child.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const activeSection = useUiStore((state) => state.activeSection)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userEmail = useSessionStore((state) => state.userEmail)
  const userName = useSessionStore((state) => state.userName)
  const userRole = useSessionStore((state) => state.userRole)
  const clearSession = useSessionStore((state) => state.clearSession)
  const logoutMutation = useLogout()

  const { data: flatMenus = [] } = useMenus();

  const menuTree = useMemo(() => {
    return buildTree(flatMenus, userRole);
  }, [flatMenus, userRole]);

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
    <header className="sticky top-0 z-[100] mb-8 w-full border-b border-surface-border-soft bg-background/80 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="shrink-0 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
          {menuTree.map((item) => {
            if (item.children && item.children.length > 0) {
              return (
                <NavDropdown
                  key={item.id}
                  item={item}
                  activeSection={activeSection}
                  handleNavigation={handleNavigation}
                />
              );
            }

            const Icon = getIcon(item.icon);
            return (
              <Fragment key={item.id}>
                <HeaderPill
                  icon={Icon}
                  variant={activeSection === item.sectionId ? 'active' : 'default'}
                  onClick={() => item.sectionId && handleNavigation(item.sectionId)}
                  labelClassName="hidden sm:inline"
                >
                  {item.name}
                </HeaderPill>
                {item.sectionId === 'chatbot' ? (
                  <HeaderPill
                    icon={LucideIcons.MessagesSquare}
                    variant={activeSection === 'meeting' ? 'active' : 'default'}
                    onClick={() => handleNavigation('meeting')}
                    labelClassName="hidden sm:inline"
                  >
                    회의실
                  </HeaderPill>
                ) : null}
              </Fragment>
            );
          })}
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
                className="flex size-8 items-center justify-center rounded-sm border border-surface-border bg-surface-muted ui-text-secondary transition-all hover:bg-surface-strong hover:scale-[1.05] active:scale-[0.95]"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LucideIcons.LogOut className="size-3.5" />
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
