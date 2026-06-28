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
      onClick={() => onSelect?.(member)}
      className="w-full flex items-center gap-2 py-1.5 pl-2 pr-2 rounded-lg text-left hover:bg-slate-100"
    >
      <span className="w-7 h-7 shrink-0 flex items-center justify-center text-[12px] font-bold text-white bg-emerald-500 rounded-full">
        {member.name.charAt(0)}
      </span>
      <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
        <span className="text-[13px] font-medium text-slate-800 truncate">{member.name}</span>
        {member.position && (
          <span className="text-[11px] text-slate-400 shrink-0">{member.position}</span>
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
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-left hover:bg-slate-100"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <span className="text-slate-400 text-[10px] w-3">{open ? "▾" : "▸"}</span>
        <span className="text-[13px] font-semibold text-slate-900">{node.name}</span>
        <span className="text-[11px] text-slate-400">{count}</span>
      </button>

      {open && (
        <div style={{ paddingLeft: depth * 12 }}>
          {node.children.map((child) => (
            <DeptNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectMember={onSelectMember}
            />
          ))}
          <div style={{ paddingLeft: 16 }}>
            {node.members.map((m) => (
              <MemberRow key={m.id} member={m} onSelect={onSelectMember} />
            ))}
          </div>
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
    <div className="flex-1 overflow-y-auto px-2 py-1">
      {nodes.map((node) => (
        <DeptNode key={node.id} node={node} depth={0} onSelectMember={onSelectMember} />
      ))}
    </div>
  );
}

export default OrgTree;
