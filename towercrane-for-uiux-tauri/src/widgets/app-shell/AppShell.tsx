import { useEffect, useState } from "react";
import {
  Bug,
  CheckSquare,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { User } from "../../entities/user";
import { useMeetingInbox } from "../../features/chat/useMeetingInbox";
import { sumUnread, useUnreadStore } from "../../features/chat/unread-store";
import Messenger from "../messenger/Messenger";
import ChatModule from "../chat/ChatModule";
import TodoModule from "../task/TodoModule";
import IssueModule from "../issue/IssueModule";
import DocsModule from "../docs/DocsModule";
import ApiDocModule from "../apidoc/ApiDocModule";
import HomePage from "../home/HomePage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../settings/SettingsPage";
import PageHeader from "../../shared/ui/PageHeader";
import WindowControls from "./WindowControls";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { getRailTheme } from "../../shared/lib/rail-themes";
import { useAppUpdate } from "../../shared/lib/useAppUpdate";

type Props = {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
};

type ModuleId = "messenger" | "chat" | "todo" | "issue" | "docs" | "apidoc";
type ViewId = "home" | "profile" | "settings" | ModuleId;

type ModuleDef = {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  ready: boolean;
};

const MODULES: ModuleDef[] = [
  { id: "messenger", label: "메신저", icon: MessageCircle, ready: true },
  { id: "chat", label: "채팅", icon: Users, ready: true },
  { id: "todo", label: "할일", icon: CheckSquare, ready: true },
  { id: "issue", label: "이슈", icon: Bug, ready: true },
  { id: "docs", label: "문서", icon: FileText, ready: true },
  { id: "apidoc", label: "Postman", icon: FlaskConical, ready: true },
];

function AppShell({ user, onUserUpdate, onLogout }: Props) {
  const [active, setActive] = useState<ViewId>("home");
  const activeModule = MODULES.find((m) => m.id === active);
  const railTheme = getRailTheme(useAppSettingsStore((s) => s.railTheme));

  // 전역 인박스 — 모든 방의 새 메시지를 수신해 배지/네이티브 알림 처리
  useMeetingInbox(user.id, user.name);
  const counts = useUnreadStore((s) => s.counts);
  const dmBadge = sumUnread(counts, "dm");
  const channelBadge = sumUnread(counts, "channel");

  // 실제 설치된 앱 버전 + 업데이트 확인 (Tauri). 브라우저 dev 등 Tauri 밖 환경에선 조용히 무시.
  const appUpdate = useAppUpdate();
  const appVersion = appUpdate.state.currentVersion;
  useEffect(() => {
    appUpdate.checkOnceOnStartup();
  }, [appUpdate.checkOnceOnStartup]);

  // 앱 시작 직후 배지가 바로 튀어나오지 않도록 10초 지연 후에만 레일에 업데이트 버튼 노출.
  const [showUpdateBadge, setShowUpdateBadge] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowUpdateBadge(true), 10_000);
    return () => clearTimeout(timer);
  }, []);
  const railUpdateVisible = showUpdateBadge && appUpdate.hasUpdate;

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* 앱 레벨 아이콘 레일 (전체 높이) */}
      <nav
        className="shrink-0 flex flex-col items-center text-white w-[72px]"
        style={{ backgroundImage: railTheme.gradient }}
      >
        {/* 로고 — 레일 최상단, 클릭 시 홈 */}
        <div className="w-full h-12 shrink-0 flex items-center justify-center border-b border-white/10">
          <button
            onClick={() => setActive("home")}
            title="홈"
            className={
              "flex items-center justify-center w-[44px] h-[44px] text-[22px] shadow-sm transition-all duration-300 ease-in-out " +
              (active === "home"
                ? "bg-white/30 ring-2 ring-white/40 rounded-[14px]"
                : "bg-white/15 hover:bg-white/25 rounded-[22px] hover:rounded-[14px]")
            }
          >
            🏗️
          </button>
        </div>

        {/* 모듈 버튼 */}
        <div className="flex-1 flex flex-col items-center gap-2 pt-2">
          {MODULES.map((m) => {
            const isActive = m.id === active;
            // 안읽음 배지 — 메신저=DM, 채팅=채널
            const badge =
              m.id === "messenger" ? dmBadge : m.id === "chat" ? channelBadge : null;
            const showBadge = !!badge && badge.unread > 0;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                title={m.ready ? m.label : `${m.label} (준비 중)`}
                className={
                  "group relative flex flex-col items-center justify-center gap-0.5 w-[52px] h-[52px] transition-all duration-300 ease-in-out " +
                  (isActive
                    ? "bg-white/25 text-primary-foreground rounded-[16px]"
                    : "text-white/80 hover:bg-white/15 hover:text-primary-foreground rounded-[26px] hover:rounded-[16px]")
                }
              >
                {/* 왼쪽 인디케이터 — active는 길게, hover는 짧게 (디스코드 방식) */}
                <span
                  className={
                    "absolute top-1/2 -translate-y-1/2 -left-2.5 w-1 rounded-r-full bg-white transition-all duration-300 ease-in-out " +
                    (isActive ? "h-7" : "h-0 group-hover:h-3")
                  }
                />
                <m.icon className="size-[21px] shrink-0" strokeWidth={2} />
                <span className="overflow-hidden max-h-3 opacity-100 text-[10px] font-semibold leading-none">
                  {m.label}
                </span>
                {/* 안읽음 배지 — 멘션 있으면 강조 링 */}
                {showBadge && (
                  <span
                    className={
                      "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums bg-red-500 text-white " +
                      (badge.mentions > 0 ? "ring-2 ring-white" : "")
                    }
                  >
                    {badge.unread > 99 ? "99+" : badge.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 사용자 / 로그아웃 */}
        <div className="w-full flex flex-col items-center gap-1.5 py-2.5 border-t border-white/10">
          {railUpdateVisible && (
            <button
              onClick={() => void appUpdate.installUpdate()}
              disabled={appUpdate.busy && appUpdate.state.status !== "downloading"}
              title={`새 버전 v${appUpdate.state.availableVersion} 설치`}
              className="flex items-center justify-center gap-1 w-[52px] h-8 rounded-lg bg-white/25 text-primary-foreground hover:bg-white/35 transition-all duration-300 ease-in-out"
            >
              {appUpdate.state.status === "downloading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="text-[9px] font-semibold leading-none">
                {appUpdate.state.status === "downloading"
                  ? `${appUpdate.state.progress}%`
                  : "업데이트"}
              </span>
            </button>
          )}
          <button
            onClick={() => setActive("settings")}
            title="설정"
            className={
              "w-[40px] h-[40px] flex items-center justify-center text-[17px] transition-all duration-200 " +
              (active === "settings"
                ? "bg-white/25 text-primary-foreground ring-1 ring-white/50 rounded-[14px]"
                : "text-white/80 hover:bg-white/15 hover:text-primary-foreground rounded-[20px] hover:rounded-[14px]")
            }
          >
            <Settings className="size-[18px]" strokeWidth={2} />
          </button>
          {appVersion && (
            <span
              title={`Towercrane v${appVersion}`}
              className="overflow-hidden max-h-3 opacity-100 text-[10px] font-semibold text-white/70 tabular-nums select-none"
            >
              v{appVersion}
            </span>
          )}
          <button
            onClick={() => setActive("profile")}
            title={`${user.name} · 프로필 수정`}
            className={
              "w-[44px] h-[44px] flex items-center justify-center text-[18px] font-bold uppercase overflow-hidden transition-all duration-200 " +
              (active === "profile"
                ? "text-text-primary bg-surface-raised ring-2 ring-white/60 rounded-[14px]"
                : "text-primary-foreground bg-white/20 hover:bg-white/30 rounded-[22px] hover:rounded-[14px]")
            }
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              user.name.charAt(0) || "🙂"
            )}
          </button>
          <button
            onClick={onLogout}
            title="로그아웃"
            className="flex items-center justify-center gap-1 w-[52px] py-1 text-[10px] font-semibold text-white/80 rounded-lg hover:text-primary-foreground hover:bg-white/15 transition-all duration-300 ease-in-out"
          >
            <LogOut className="size-[13px] shrink-0" strokeWidth={2} />
            <span className="overflow-hidden whitespace-nowrap max-w-[40px] opacity-100">
              로그아웃
            </span>
          </button>
        </div>
      </nav>

      {/* 활성 화면 */}
      <div className="flex-1 min-w-0 flex">
        {active === "home" ? (
          <HomePage user={user} modules={MODULES} onOpen={(id) => setActive(id as ViewId)} />
        ) : active === "profile" ? (
          <ProfilePage
            user={user}
            onUserUpdate={onUserUpdate}
            onLogout={onLogout}
            appUpdate={appUpdate}
          />
        ) : active === "settings" ? (
          <SettingsPage />
        ) : activeModule?.id === "messenger" ? (
          <Messenger user={user} />
        ) : activeModule?.id === "chat" ? (
          <ChatModule user={user} />
        ) : activeModule?.id === "todo" ? (
          <TodoModule user={user} />
        ) : activeModule?.id === "issue" ? (
          <IssueModule user={user} />
        ) : activeModule?.id === "docs" ? (
          <DocsModule />
        ) : activeModule?.id === "apidoc" ? (
          <ApiDocModule isAdmin={user.role === "admin"} />
        ) : (
          <PlaceholderModule
            label={activeModule?.label ?? ""}
            icon={activeModule?.icon ?? Package}
          />
        )}
      </div>

      {/* 창 버튼 — 항상 창 우상단, 메인 헤더 위 오버레이 */}
      <div className="absolute top-0 right-0 h-12 flex items-center pr-2 z-50 pointer-events-none">
        <WindowControls />
      </div>
    </div>
  );
}

function PlaceholderModule({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">{label}</span>
      </PageHeader>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-surface-muted text-center">
        <Icon className="size-10 text-text-muted" strokeWidth={1.5} />
        <span className="text-lg font-bold text-text-secondary">{label}</span>
        <span className="text-[13px] text-text-muted">준비 중인 모듈입니다.</span>
      </div>
    </div>
  );
}

export default AppShell;
