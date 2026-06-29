// senderId/userId로 아바타 배경색 고정 배정 (디스코드처럼 알록달록)
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

export function avatarColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
