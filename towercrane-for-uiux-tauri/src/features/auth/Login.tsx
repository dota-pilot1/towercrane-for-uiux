import { useState } from "react";
import { login, type User } from "./api";

type Props = {
  onSuccess: (user: User) => void;
};

const REMEMBER_KEY = "towercrane.rememberedCredentials";

type Remembered = { email: string; password: string };

function loadRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Remembered>;
    if (typeof parsed.email === "string" && typeof parsed.password === "string") {
      return { email: parsed.email, password: parsed.password };
    }
  } catch {
    // 손상된 값은 무시
  }
  return null;
}

function Login({ onSuccess }: Props) {
  const remembered = loadRemembered();
  const [email, setEmail] = useState(remembered?.email ?? "");
  const [password, setPassword] = useState(remembered?.password ?? "");
  const [remember, setRemember] = useState(remembered !== null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const result = await login(trimmedEmail, password);
      if (remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ email: trimmedEmail, password }),
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-emerald-500">
      <form
        className="w-[340px] flex flex-col gap-3.5 p-8 bg-white rounded-2xl shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col items-center gap-1.5 mb-1.5">
          <span className="w-13 h-13 flex items-center justify-center text-2xl bg-emerald-50 border border-emerald-200 rounded-2xl">
            💬
          </span>
          <h1 className="mt-1.5 text-lg font-bold text-slate-900">Towercrane Messenger</h1>
          <p className="text-[13px] text-slate-500">업무용 메신저에 로그인하세요</p>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
          <span>이메일</span>
          <input
            type="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
          <span>비밀번호</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-3 pr-11 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 rounded-lg hover:text-slate-600 hover:bg-slate-100"
            >
              {showPassword ? (
                // eye-off
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                // eye
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
          <span>아이디·비밀번호 기억하기</span>
        </label>

        {error && (
          <div className="px-3 py-2.5 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl whitespace-pre-line">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 py-2.5 text-[15px] font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}

export default Login;
