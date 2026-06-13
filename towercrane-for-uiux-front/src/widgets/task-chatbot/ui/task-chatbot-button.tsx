import { useState } from 'react'
import { Bot, X } from 'lucide-react'
import { TaskChatbotPanel } from './task-chatbot-panel'

export function TaskChatbotButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group fixed bottom-8 right-8 z-50 flex size-14 items-center justify-center rounded-full bg-brand-primary text-text-on-brand shadow-xl ring-4 ring-brand-primary/15 transition-all duration-300 hover:scale-110 hover:ring-brand-primary/25 active:scale-90"
        aria-label={isOpen ? '업무 비서 하이봇 닫기' : '업무 비서 하이봇 열기'}
      >
        {/* 닫혀 있을 땐 로봇, 열려 있을 땐 X 로 전환 */}
        {isOpen ? (
          <X className="size-6 transition-transform duration-300" />
        ) : (
          <Bot className="size-7 transition-transform duration-300 group-hover:-rotate-6" />
        )}
        {/* 미니 알림 점 (살아있는 느낌) */}
        {!isOpen && (
          <span className="absolute right-1 top-1 size-2.5 rounded-full bg-status-online ring-2 ring-brand-primary" />
        )}
      </button>
      {isOpen && <TaskChatbotPanel onClose={() => setIsOpen(false)} />}
    </>
  )
}
