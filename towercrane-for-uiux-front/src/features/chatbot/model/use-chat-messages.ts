import { useState, useRef, useEffect } from "react";

import type { KnowledgeChannel } from '../../../entities/knowledge-base/model/types'

export type KnowledgeSource = {
  chunkId: string
  documentId: string
  channel: KnowledgeChannel
  channelLabel: string
  chunkIndex: number
  headingPath: string | null
  chunkText: string
  title: string
  summary: string | null
  tags: string[]
  updatedAt: string
  score: number
  snippet: string
  documentUrl: string
}

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  fileUrls?: string[];
  sources?: KnowledgeSource[];
};

const MOCK_RESPONSES = [
  "안녕하세요! 무엇을 도와드릴까요?",
  "좋은 질문입니다. 조금 더 구체적으로 설명해 주시면 더 정확한 답변을 드릴 수 있어요.",
  "네, 이해했습니다. 해당 기능은 현재 개발 중이며 곧 추가될 예정입니다.",
  "그 부분에 대해서는 팀 내부 문서를 참고하시거나 담당자에게 문의해 주세요.",
  "도움이 됐으면 좋겠습니다! 다른 궁금한 점이 있으면 언제든 질문해 주세요.",
];

export function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "안녕하세요! 기본 채팅 실습 페이지입니다. 메시지를 보내보세요.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(
      () => {
        const reply =
          MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      },
      900 + Math.random() * 400,
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return { messages, input, setInput, isTyping, bottomRef, handleSend, handleKeyDown };
}
