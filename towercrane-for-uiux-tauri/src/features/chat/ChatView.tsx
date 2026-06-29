import { useEffect, useRef, useState } from "react";
import { getToken } from "../../shared/api/client";
import {
  clearChannelMessages,
  getRoomMessages,
  sendMeetingMessage,
  type MeetingMessage,
  type MeetingRoom,
} from "./api";
import { useMeetingSocket } from "./useMeetingSocket";
import PageHeader from "../../shared/ui/PageHeader";

type Props = {
  room: MeetingRoom;
  currentUserId: string;
  onLeave: () => void;
  canClear?: boolean;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  h = h % 12 || 12;
  return `${ampm} ${h}:${m}`;
}

// 디스코드식 그룹 메시지의 거터에 표시할 짧은 시간 (예: 9:18)
function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// 같은 사람의 연속 메시지를 묶는 기준 (5분 이내)
const GROUP_WINDOW_MS = 5 * 60 * 1000;

// senderId로 아바타 배경색 고정 배정 (디스코드처럼 알록달록)
const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
];

function avatarColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function LeaveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ChatView({ room, currentUserId, onLeave, canClear = false }: Props) {
  const isDm = room.roomType === "DM";
  const subtitle = isDm ? (room.dmCounterpart?.email ?? "1:1 대화") : (room.description ?? "채널");
  const showToolbar = !isDm && canClear;

  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = (m: MeetingMessage) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  useMeetingSocket(room.id, appendMessage, () => setMessages([]));

  async function handleClear() {
    const token = getToken();
    if (!token || clearing) return;
    setClearing(true);
    try {
      await clearChannelMessages(token, room.id);
      setMessages([]);
      setClearConfirming(false);
    } catch {
      // 실패 시 그대로 둠
    } finally {
      setClearing(false);
    }
  }

  // 방 변경 시 메시지 로드
  useEffect(() => {
    setConfirming(false);
    setClearConfirming(false);
    const token = getToken();
    if (!token) return;
    setLoading(true);
    getRoomMessages(token, room.id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [room.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    const token = getToken();
    if (!token) return;
    setSending(true);
    try {
      const saved = await sendMeetingMessage(token, room.id, text);
      appendMessage(saved);
      setDraft("");
    } catch {
      // 전송 실패 시 입력 유지
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader>
        <span className="w-[30px] h-[30px] flex items-center justify-center text-[14px] font-bold text-white bg-emerald-500 rounded-[9px]">
          {isDm ? room.name.charAt(0) : "#"}
        </span>
        <div className="flex flex-col leading-tight">
          <strong className="text-[14px] text-slate-900">{room.name}</strong>
          <span className="text-[11px] text-slate-400">{subtitle}</span>
        </div>

        {/* 대화방 나가기 — DM 전용. 채널 나가기는 2단계(멤버십)에서. 1차 클릭 → 취소/나가기 확인 */}
        <div data-actions className="ml-3 flex items-center gap-1.5">
          {!isDm ? null : confirming ? (
            <>
              <span className="text-[12px] text-slate-500">나가시겠어요?</span>
              <button
                onClick={() => setConfirming(false)}
                className="px-2.5 h-7 rounded-md text-[12px] font-semibold text-slate-600 hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={onLeave}
                title="양쪽 모두에서 대화가 삭제됩니다"
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600"
              >
                <LeaveIcon />
                나가기
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              title="대화방 나가기 (양쪽 모두 삭제)"
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50"
            >
              <LeaveIcon />
              나가기
            </button>
          )}
        </div>
      </PageHeader>

      {/* 디스코드식 얇은 채널 툴바 — 우측 정렬 액션. 윈도우 버튼과 안 겹치게 별도 줄. */}
      {showToolbar && (
        <div className="h-9 shrink-0 flex items-center justify-end gap-1.5 px-4 bg-white border-b border-slate-200">
          {clearConfirming ? (
            <>
              <span className="text-[12px] text-slate-500">이 채널 메시지를 모두 비울까요?</span>
              <button
                onClick={() => setClearConfirming(false)}
                disabled={clearing}
                className="px-2.5 h-6 rounded-md text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                title="채널의 모든 메시지가 삭제됩니다"
                className="flex items-center gap-1 px-2.5 h-6 rounded-md text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-slate-300"
              >
                <TrashIcon />
                {clearing ? "비우는 중…" : "비우기"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setClearConfirming(true)}
              title="채널 메시지 비우기 (관리자)"
              aria-label="채널 메시지 비우기"
              className="flex items-center gap-1 px-2 h-6 rounded-md text-[12px] font-medium text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <TrashIcon />
              비우기
            </button>
          )}
        </div>
      )}

      <div
        className={
          "flex-1 overflow-y-auto " +
          (isDm ? "p-[18px] flex flex-col gap-3" : "py-2.5")
        }
      >
        {loading ? (
          <div className={isDm ? "m-auto text-[13px] text-slate-400" : "px-4 py-6 text-[13px] text-slate-400"}>
            불러오는 중…
          </div>
        ) : messages.length === 0 ? (
          <div className={isDm ? "m-auto text-[13px] text-slate-400" : "px-4 py-6 text-[13px] text-slate-400"}>
            첫 메시지를 보내보세요.
          </div>
        ) : isDm ? (
          // DM: 카톡식 말풍선 (내 메시지 오른쪽)
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={
                  "flex flex-col max-w-[70%] " +
                  (mine ? "self-end items-end" : "self-start items-start")
                }
              >
                {!mine && (
                  <span className="mb-0.5 text-[11px] text-slate-400">{m.senderName}</span>
                )}
                <div
                  className={
                    "px-3.5 py-2.5 text-sm leading-snug rounded-2xl whitespace-pre-wrap break-words " +
                    (mine
                      ? "bg-emerald-500 text-white rounded-br-sm"
                      : "bg-white border border-slate-200 rounded-bl-sm")
                  }
                >
                  {m.content}
                </div>
                <span className="mt-1 text-[10px] text-slate-400">{formatTime(m.createdAt)}</span>
              </div>
            );
          })
        ) : (
          // 채널: 디스코드식 평평한 왼쪽 정렬 + 연속 그룹핑
          messages.map((m, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const grouped =
              !!prev &&
              prev.senderId === m.senderId &&
              new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                GROUP_WINDOW_MS;
            return (
              <div
                key={m.id}
                className={
                  "group flex gap-3 px-4 hover:bg-slate-50 " + (grouped ? "py-0.5" : "mt-3 py-0.5")
                }
              >
                <div className="w-9 shrink-0 flex justify-center">
                  {grouped ? (
                    <span className="pt-0.5 text-[10px] leading-none text-slate-400 opacity-0 group-hover:opacity-100">
                      {formatTimeShort(m.createdAt)}
                    </span>
                  ) : (
                    <span
                      className={
                        "w-9 h-9 flex items-center justify-center text-[14px] font-bold text-white rounded-full " +
                        avatarColor(m.senderId)
                      }
                    >
                      {m.senderName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">{m.senderName}</span>
                      <span className="text-[11px] text-slate-400">{formatTime(m.createdAt)}</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 px-4 py-3 bg-white border-t border-slate-200"
      >
        <input
          placeholder="메시지를 입력하세요"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-100 border border-transparent rounded-[10px] outline-none focus:border-emerald-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="px-[18px] text-sm font-semibold text-white bg-emerald-500 rounded-[10px] hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </form>
    </>
  );
}

export default ChatView;
