import type { ReactNode } from "react";

// 모든 페이지 공통 상단 헤더 — 높이/보더/드래그 영역을 한 곳에서 결정해 페이지 간 정렬·테마 드리프트 방지.
// 우상단 창 버튼(AppShell의 absolute 오버레이)을 가리지 않도록 내용은 왼쪽 정렬.
function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header
      data-tauri-drag-region
      className="flex items-center gap-2.5 px-4 h-12 shrink-0 bg-slate-100 border-b border-slate-200 select-none [&>*:not(button):not([data-actions])]:pointer-events-none"
    >
      {children}
    </header>
  );
}

export default PageHeader;
