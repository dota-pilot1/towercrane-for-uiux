import type { MeetingRoom } from "./api";

type Props = {
  channels: MeetingRoom[];
  activeChannelId: string | null;
  error: string | null;
  canCreate: boolean;
  onSelect: (channelId: string) => void;
  onCreateClick: () => void;
};

function ChannelList({
  channels,
  activeChannelId,
  error,
  canCreate,
  onSelect,
  onCreateClick,
}: Props) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 섹션 헤더 + 채널 만들기 — 본문 채널 툴바(h-9 border-b)와 높이·보더 정렬 */}
      <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-slate-200">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          채널
        </span>
        {canCreate && (
          <button
            onClick={onCreateClick}
            title="채널 만들기"
            aria-label="채널 만들기"
            className="w-6 h-6 flex items-center justify-center text-slate-400 rounded-md hover:text-emerald-600 hover:bg-emerald-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-2">
        {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}

        {channels.length === 0 && !error && (
          <div className="px-3 py-4 text-[13px] text-slate-400 leading-relaxed">
            아직 채널이 없습니다.
            {canCreate ? (
              <>
                <br />
                상단 ＋ 버튼으로 첫 채널을 만들어 보세요.
              </>
            ) : null}
          </div>
        )}

        {channels.map((c) => {
          const active = c.id === activeChannelId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={
                "w-full flex items-center gap-1.5 px-2.5 py-2 rounded-[8px] text-left " +
                (active ? "bg-emerald-50" : "hover:bg-slate-100")
              }
            >
              <span
                className={
                  "text-[15px] font-bold leading-none " +
                  (active ? "text-emerald-600" : "text-slate-400")
                }
              >
                #
              </span>
              <span
                className={
                  "flex-1 min-w-0 truncate text-sm " +
                  (active ? "font-semibold text-slate-900" : "text-slate-600")
                }
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default ChannelList;
