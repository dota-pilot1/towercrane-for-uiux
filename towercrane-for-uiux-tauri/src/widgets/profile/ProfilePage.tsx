import { useRef, useState } from "react";
import {
  changePassword,
  getToken,
  updateProfileImage,
  uploadProfileImage,
  type User,
} from "../../features/auth/api";
import PageHeader from "../../shared/ui/PageHeader";

type Props = {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
};

function ProfilePage({ user, onUserUpdate, onLogout }: Props) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-slate-900">프로필</span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-[560px] flex flex-col gap-4 px-6 py-7">
          <IdentityCard user={user} onUserUpdate={onUserUpdate} />
          <PasswordCard />
          <button
            onClick={onLogout}
            className="self-start mt-1 px-4 py-2 text-[13px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ user, size }: { user: User; size: number }) {
  if (user.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt={user.name}
        style={{ width: size, height: size }}
        className="rounded-2xl object-cover border border-slate-200"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex items-center justify-center font-bold uppercase text-white bg-emerald-500 rounded-2xl"
    >
      {user.name.charAt(0) || "🙂"}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 p-5 bg-white border border-slate-200 rounded-2xl">
      <h2 className="text-[13px] font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Notice({ kind, text }: { kind: "ok" | "error"; text: string }) {
  return (
    <div
      className={
        "px-3 py-2.5 text-[13px] rounded-xl whitespace-pre-line border " +
        (kind === "ok"
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-red-700 bg-red-50 border-red-200")
      }
    >
      {text}
    </div>
  );
}

const inputClass =
  "px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white";

function IdentityCard({
  user,
  onUserUpdate,
}: {
  user: User;
  onUserUpdate: (user: User) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<User>) {
    const token = getToken();
    if (!token || busy) return;
    setError(null);
    setBusy(true);
    try {
      onUserUpdate(await work());
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const token = getToken();
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    void run(() => uploadProfileImage(token, file));
  }

  return (
    <section className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
      {/* 아바타 클릭 → 파일 선택 업로드 */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="클릭해서 프로필 사진 변경"
        className="group relative shrink-0 rounded-2xl overflow-hidden disabled:cursor-wait"
      >
        <Avatar user={user} size={72} />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white bg-black/45 opacity-0 group-hover:opacity-100 group-disabled:opacity-100 transition-opacity">
          {busy ? "업로드…" : "변경"}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900 truncate">{user.name}</span>
          <span
            className={
              "px-2 py-0.5 text-[11px] font-semibold rounded-full " +
              (user.role === "admin"
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-slate-600 bg-slate-100 border border-slate-200")
            }
          >
            {user.role === "admin" ? "관리자" : "일반"}
          </span>
        </div>
        <span className="text-[13px] text-slate-500 truncate">{user.email}</span>
        {error ? (
          <span className="text-[12px] text-red-600">{error}</span>
        ) : (
          user.profileImageUrl && (
            <button
              onClick={() => run(() => updateProfileImage(getToken()!, null))}
              disabled={busy}
              className="self-start text-[12px] text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              기본 이미지로
            </button>
          )
        )}
      </div>
    </section>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length > 0 && next.length >= 8 && next === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || saving || !valid) return;
    setError(null);
    setDone(false);
    setSaving(true);
    try {
      await changePassword(token, current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="비밀번호 변경">
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <input
          type="password"
          placeholder="현재 비밀번호"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="새 비밀번호 (8자 이상)"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        {mismatch && <Notice kind="error" text="새 비밀번호가 일치하지 않습니다." />}
        {error && <Notice kind="error" text={error} />}
        {done && <Notice kind="ok" text="비밀번호를 변경했습니다." />}
        <button
          type="submit"
          disabled={saving || !valid}
          className="self-start px-4 py-2 text-[13px] font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
    </Card>
  );
}

export default ProfilePage;
