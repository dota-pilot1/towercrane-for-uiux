import { apiRequest } from '../../../shared/api/http'
import type {
  ChatbotMonitoringSummary,
  ChatbotMonitoringUserRow,
} from '../model/types'

export const chatbotMonitoringApi = {
  summary: () =>
    apiRequest<ChatbotMonitoringSummary>('/admin/chatbot-monitoring/summary'),

  users: () =>
    apiRequest<ChatbotMonitoringUserRow[]>('/admin/chatbot-monitoring/users'),
}
