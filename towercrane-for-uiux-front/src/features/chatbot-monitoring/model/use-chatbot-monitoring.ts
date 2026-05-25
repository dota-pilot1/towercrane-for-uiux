import { useQuery } from '@tanstack/react-query'
import { chatbotMonitoringApi } from '../../../entities/chatbot-monitoring/api/chatbot-monitoring-api'

export const chatbotMonitoringQueryKeys = {
  summary: () => ['chatbot-monitoring', 'summary'] as const,
  users: () => ['chatbot-monitoring', 'users'] as const,
}

export function useChatbotMonitoringSummary() {
  return useQuery({
    queryKey: chatbotMonitoringQueryKeys.summary(),
    queryFn: chatbotMonitoringApi.summary,
  })
}

export function useChatbotMonitoringUsers() {
  return useQuery({
    queryKey: chatbotMonitoringQueryKeys.users(),
    queryFn: chatbotMonitoringApi.users,
  })
}
