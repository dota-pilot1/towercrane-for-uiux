import { useState } from "react";
import { login, type User } from "./api";

type Props = {
  onSuccess: (user: User) => void;
};

function Login({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
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
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
          />
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
