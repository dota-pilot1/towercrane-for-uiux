export type ChatbotMonitoringSummary = {
  totalQuestions: number
  todayQuestions: number
  totalSessions: number
  activeUsers: number
}

export type ChatbotMonitoringUserRow = {
  userId: string
  name: string
  email: string
  questionCount: number
  sessionCount: number
  lastQuestionAt: string | null
}
