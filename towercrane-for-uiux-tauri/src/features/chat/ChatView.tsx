import { useEffect, useRef, useState } from "react";
import { getToken } from "../../shared/api/client";
import {
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
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  h = h % 12 || 12;
  return `${ampm} ${h}:${m}`;
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

function ChatView({ room, currentUserId, onLeave }: Props) {
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = (m: MeetingMessage) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  useMeetingSocket(room.id, appendMessage);

  // 방 변경 시 메시지 로드
  useEffect(() => {
    setConfirming(false);
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
          {room.name.charAt(0)}
        </span>
        <div className="flex flex-col leading-tight">
          <strong className="text-[14px] text-slate-900">{room.name}</strong>
          <span className="text-[11px] text-slate-400">
            {room.dmCounterpart?.email ?? "1:1 대화"}
          </span>
        </div>

        {/* 대화방 나가기 — 이름 오른쪽. 1차 클릭 → 취소/나가기 확인 */}
        <div data-actions className="ml-3 flex items-center gap-1.5">
          {confirming ? (
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

      <div className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3">
        {loading ? (
          <div className="m-auto text-[13px] text-slate-400">불러오는 중…</div>
        ) : messages.length === 0 ? (
          <div className="m-auto text-[13px] text-slate-400">첫 메시지를 보내보세요.</div>
        ) : (
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
