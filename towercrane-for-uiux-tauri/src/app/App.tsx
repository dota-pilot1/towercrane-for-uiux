import { useEffect, useState } from "react";
import Login from "../features/auth/Login";
import { getToken, logout as apiLogout, me, setToken, type User } from "../features/auth/api";
import AppShell from "../widgets/app-shell/AppShell";
import { checkForUpdates } from "../shared/update/checkForUpdates";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  // 앱 시작 시 새 버전 확인 (빌드된 앱에서만 동작, 그 외엔 무시)
  useEffect(() => {
    void checkForUpdates();
  }, []);

  // 앱 시작 시 저장된 토큰으로 세션 확인
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    me(token)
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  async function handleLogout() {
    const token = getToken();
    if (token) await apiLogout(token);
    setUser(null);
  }

  if (booting) {
    return (
      <div className="h-screen flex items-center justify-center text-[15px] text-slate-400">
        불러오는 중…
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={setUser} />;
  }

  return <AppShell user={user} onUserUpdate={setUser} onLogout={handleLogout} />;
}

export default App;
