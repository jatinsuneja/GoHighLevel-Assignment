import apiClient from './client'
import type {
  ChatHistoryResponse,
  GetHistoryQuery,
  ArchiveChatResponse,
  DeleteChatResponse,
} from '@/types'

const BASE_PATH = '/history'

export const historyApi = {
  /**
   * Get chat history for the current user
   */
  async getHistory(query?: GetHistoryQuery): Promise<ChatHistoryResponse> {
    const params = new URLSearchParams()
    if (query?.includeArchived)
      params.append('includeArchived', query.includeArchived.toString())
    if (query?.archivedOnly)
      params.append('archivedOnly', query.archivedOnly.toString())

    const url = params.toString() ? `${BASE_PATH}?${params.toString()}` : BASE_PATH
    const response = await apiClient.get<ChatHistoryResponse>(url)
    return response.data
  },

  /**
   * Archive a chat
   */
  async archive(roomId: string): Promise<ArchiveChatResponse> {
    const response = await apiClient.post<ArchiveChatResponse>(
      `${BASE_PATH}/${roomId}/archive`
    )
    return response.data
  },

  /**
   * Unarchive a chat
   */
  async unarchive(roomId: string): Promise<ArchiveChatResponse> {
    const response = await apiClient.post<ArchiveChatResponse>(
      `${BASE_PATH}/${roomId}/unarchive`
    )
    return response.data
  },

  /**
   * Delete a chat from history
   */
  async delete(roomId: string): Promise<DeleteChatResponse> {
    const response = await apiClient.delete<DeleteChatResponse>(
      `${BASE_PATH}/${roomId}`
    )
    return response.data
  },
}

export default historyApi
