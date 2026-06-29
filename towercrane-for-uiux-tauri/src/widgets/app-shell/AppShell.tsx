import { useState } from "react";
import type { User } from "../../features/auth/api";
import Messenger from "../messenger/Messenger";
import HomePage from "../home/HomePage";
import ProfilePage from "../profile/ProfilePage";
import PageHeader from "../../shared/ui/PageHeader";
import WindowControls from "./WindowControls";

type Props = {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
};

type ModuleId = "messenger" | "chat" | "todo" | "issue" | "docs";
type ViewId = "home" | "profile" | ModuleId;

type ModuleDef = {
  id: ModuleId;
  label: string;
  icon: string;
  ready: boolean;
};

const MODULES: ModuleDef[] = [
  { id: "messenger", label: "메신저", icon: "💬", ready: true },
  { id: "chat", label: "채팅", icon: "👥", ready: false },
  { id: "todo", label: "할일", icon: "✅", ready: false },
  { id: "issue", label: "이슈", icon: "🐛", ready: false },
  { id: "docs", label: "문서", icon: "📄", ready: false },
];

function AppShell({ user, onUserUpdate, onLogout }: Props) {
  const [active, setActive] = useState<ViewId>("home");
  const activeModule = MODULES.find((m) => m.id === active);

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* 앱 레벨 아이콘 레일 (전체 높이) */}
      <nav className="w-[60px] shrink-0 flex flex-col items-center bg-gradient-to-b from-sky-400 to-sky-600 text-white">
        {/* 로고 — 레일 최상단, 클릭 시 홈 */}
        <div className="w-full h-12 shrink-0 flex items-center justify-center border-b border-white/10">
          <button
            onClick={() => setActive("home")}
            title="홈"
            className={
              "w-[34px] h-[34px] flex items-center justify-center text-[15px] rounded-[10px] border transition-colors " +
              (active === "home"
                ? "bg-white/25 border-white/50 ring-1 ring-white/50"
                : "bg-white/15 border-white/25 hover:bg-white/25")
            }
          >
            🏗️
          </button>
        </div>

        {/* 모듈 버튼 */}
        <div className="flex-1 flex flex-col items-center gap-1.5 pt-1.5">
          {MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                title={m.ready ? m.label : `${m.label} (준비 중)`}
                className={
                  "relative w-[44px] h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-[12px] transition-colors " +
                  (isActive
                    ? "bg-white/25 text-white"
                    : "text-sky-50/80 hover:bg-white/15 hover:text-white")
                }
              >
                {isActive && (
                  <span className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-white" />
                )}
                <span className="text-[17px] leading-none">{m.icon}</span>
                <span className="text-[9px] font-semibold leading-none">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* 사용자 / 로그아웃 */}
        <div className="w-full flex flex-col items-center gap-1.5 py-2.5 border-t border-white/10">
          <button
            onClick={() => setActive("profile")}
            title={`${user.name} · 프로필 수정`}
            className={
              "w-[34px] h-[34px] flex items-center justify-center text-[15px] font-bold uppercase rounded-[10px] overflow-hidden transition-colors " +
              (active === "profile"
                ? "text-sky-600 bg-white ring-2 ring-white/60"
                : "text-white bg-white/20 hover:bg-white/30")
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
            className="w-[44px] py-1 text-[10px] font-semibold text-sky-50/80 rounded-lg hover:text-white hover:bg-white/15"
          >
            로그아웃
          </button>
        </div>
      </nav>

      {/* 활성 화면 */}
      <div className="flex-1 min-w-0 flex">
        {active === "home" ? (
          <HomePage user={user} modules={MODULES} onOpen={(id) => setActive(id as ViewId)} />
        ) : active === "profile" ? (
          <ProfilePage user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} />
        ) : activeModule?.id === "messenger" ? (
          <Messenger user={user} />
        ) : (
          <PlaceholderModule
            label={activeModule?.label ?? ""}
            icon={activeModule?.icon ?? "📦"}
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

function PlaceholderModule({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-slate-900">{label}</span>
      </PageHeader>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50 text-center">
        <span className="text-4xl">{icon}</span>
        <span className="text-lg font-bold text-slate-700">{label}</span>
        <span className="text-[13px] text-slate-400">준비 중인 모듈입니다.</span>
      </div>
    </div>
  );
}

export default AppShell;
