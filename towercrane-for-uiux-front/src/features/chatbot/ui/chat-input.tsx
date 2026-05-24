import { Send } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
};

export function ChatInput({ value, onChange, onSend, onKeyDown, disabled }: Props) {
  return (
    <div className="flex items-end gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
        rows={3}
        className="min-h-[4.5rem] flex-1 resize-none rounded-lg border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm leading-relaxed outline-none focus:border-brand-border focus:ring-2 focus:ring-brand-border/10 transition-all ui-text-primary placeholder:text-text-muted"
      />
      <button
        onClick={onSend}
        disabled={disabled}
        className="ui-icon-button-brand self-stretch flex items-center gap-1.5 rounded-xl px-4 text-sm font-medium disabled:opacity-40 transition-opacity"
      >
        <Send className="size-4" />
        <span>전송</span>
      </button>
    </div>
  );
}
