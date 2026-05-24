import { useState, useRef, useEffect } from "react";
import type { Message } from "./use-chat-messages";

export type Session = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};

let sessionCounter = 1;

function makeSession(): Session {
  return {
    id: Date.now().toString(),
    title: `새 대화 ${sessionCounter++}`,
    messages: [],
    createdAt: new Date(),
  };
}

export function useHistoryChat() {
  const initialSession = makeSession();
  const [sessions, setSessions] = useState<Session[]>([initialSession]);
  const [activeId, setActiveId] = useState<string>(initialSession.id);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeId)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages, isStreaming]);

  function addSession() {
    const s = makeSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setInput("");
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fresh = makeSession();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  }

  function switchSession(id: string) {
    setActiveId(id);
    setInput("");
  }

  function renameSession(id: string, title: string) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const currentActiveId = activeId;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const assistantMsgId = (Date.now() + 1).toString();

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentActiveId) return s;
        return {
          ...s,
          messages: [...s.messages, userMsg, assistantMsg],
          title:
            s.messages.length === 0
              ? text.slice(0, 20) + (text.length > 20 ? "…" : "")
              : s.title,
        };
      }),
    );
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("http://localhost:3000/api/chatbot/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            setIsStreaming(false);
            return;
          }
          try {
            const { text: chunk } = JSON.parse(payload) as { text: string };
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== currentActiveId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + chunk }
                      : m,
                  ),
                };
              }),
            );
          } catch {
            // 빈 줄 등 파싱 불가 라인 무시
          }
        }
      }
    } catch (err) {
      console.error("스트리밍 오류:", err);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return {
    sessions,
    activeSession,
    activeId,
    input,
    setInput,
    isStreaming,
    bottomRef,
    addSession,
    deleteSession,
    switchSession,
    renameSession,
    handleSend: () => void handleSend(),
    handleKeyDown,
  };
}
