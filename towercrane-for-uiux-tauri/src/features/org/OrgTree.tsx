import { useState } from "react";
import type { OrgMember, OrgNode } from "./api";

type Props = {
  nodes: OrgNode[];
  loading: boolean;
  error: string | null;
  onSelectMember?: (member: OrgMember) => void;
};

function MemberRow({
  member,
  onSelect,
}: {
  member: OrgMember;
  onSelect?: (m: OrgMember) => void;
}) {
  return (
    <button
      onDoubleClick={() => onSelect?.(member)}
      title="더블클릭으로 대화 시작"
      className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left select-none hover:bg-slate-100 transition-colors"
    >
      <span className="w-8 h-8 shrink-0 flex items-center justify-center text-[12px] font-bold text-white bg-emerald-500 rounded-[9px]">
        {member.name.charAt(0)}
      </span>
      <span className="flex-1 min-w-0 flex flex-col leading-tight">
        <span className="text-[13px] font-semibold text-slate-800 truncate">{member.name}</span>
        {member.position && (
          <span className="text-[11px] text-slate-400 truncate">{member.position}</span>
        )}
      </span>
    </button>
  );
}

function DeptNode({
  node,
  depth,
  onSelectMember,
}: {
  node: OrgNode;
  depth: number;
  onSelectMember?: (m: OrgMember) => void;
}) {
  const [open, setOpen] = useState(true);
  const count =
    node.members.length +
    node.children.reduce((sum, c) => sum + c.members.length, 0);

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-left hover:bg-slate-100 transition-colors"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={
            "shrink-0 text-slate-400 transition-transform duration-150 " +
            (open ? "rotate-90" : "")
          }
        >
          <path d="M3 1.5 L7 5 L3 8.5 Z" />
        </svg>
        <span className="flex-1 min-w-0 text-[13px] font-bold text-slate-900 truncate">
          {node.name}
        </span>
        <span className="shrink-0 min-w-[20px] px-1.5 py-px text-center text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full">
          {count}
        </span>
      </button>

      {open && (
        <div className="ml-[14px] pl-2 border-l border-slate-200">
          {node.children.map((child) => (
            <DeptNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectMember={onSelectMember}
            />
          ))}
          {node.members.map((m) => (
            <MemberRow key={m.id} member={m} onSelect={onSelectMember} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgTree({ nodes, loading, error, onSelectMember }: Props) {
  if (loading) {
    return <div className="px-3 py-4 text-[13px] text-slate-400">불러오는 중…</div>;
  }
  if (error) {
    return <div className="px-3 py-4 text-[13px] text-red-600">{error}</div>;
  }
  if (nodes.length === 0) {
    return <div className="px-3 py-4 text-[13px] text-slate-400">조직도가 비어 있습니다.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {nodes.map((node) => (
        <DeptNode key={node.id} node={node} depth={0} onSelectMember={onSelectMember} />
      ))}
    </div>
  );
}

export default OrgTree;
