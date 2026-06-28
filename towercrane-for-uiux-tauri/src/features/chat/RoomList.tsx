import type { MeetingRoom } from "./api";

type Props = {
  rooms: MeetingRoom[];
  activeRoomId: string | null;
  error: string | null;
  onSelect: (roomId: string) => void;
};

function RoomList({ rooms, activeRoomId, error, onSelect }: Props) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-2">
      {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}

      {rooms.length === 0 && !error && (
        <div className="px-3 py-4 text-[13px] text-slate-400 leading-relaxed">
          아직 대화가 없습니다.
          <br />
          조직도 탭에서 구성원을 클릭해 시작하세요.
        </div>
      )}

      {rooms.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={
            "w-full flex items-center gap-2.5 p-2.5 rounded-[10px] text-left " +
            (r.id === activeRoomId ? "bg-emerald-50" : "hover:bg-slate-100")
          }
        >
          <span className="w-[38px] h-[38px] shrink-0 flex items-center justify-center text-[15px] font-bold text-white bg-emerald-500 rounded-full">
            {r.name.charAt(0)}
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-slate-900 truncate">{r.name}</span>
            <span className="text-xs text-slate-500 truncate">
              {r.dmCounterpart?.email ?? "1:1 대화"}
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}

export default RoomList;
