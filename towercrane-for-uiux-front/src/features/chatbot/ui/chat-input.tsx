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
    <div className="mt-3 flex gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
        rows={2}
        className="ui-input flex-1 resize-none rounded-lg px-4 py-3 text-sm"
      />
      <button
        onClick={onSend}
        disabled={disabled}
        className="ui-icon-button-brand flex items-center gap-2 self-end rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40"
      >
        <Send className="size-4" />
      </button>
    </div>
  );
}
