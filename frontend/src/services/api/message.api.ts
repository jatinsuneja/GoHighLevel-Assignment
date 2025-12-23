import apiClient from './client'
import type {
  Message,
  SendMessageRequest,
  GetMessagesQuery,
  PaginatedMessages,
  AddReactionRequest,
  ReactionResponse,
  DeleteMessageResponse,
} from '@/types'

const BASE_PATH = '/messages'

export const messageApi = {
  /**
   * Send a new message
   */
  async send(data: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<Message>(BASE_PATH, data)
    return response.data
  },

  /**
   * Get paginated messages for a room
   */
  async getMessages(query: GetMessagesQuery): Promise<PaginatedMessages> {
    const params = new URLSearchParams()
    params.append('roomId', query.roomId)
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.before) params.append('before', query.before)
    if (query.after) params.append('after', query.after)

    const response = await apiClient.get<PaginatedMessages>(
      `${BASE_PATH}?${params.toString()}`
    )
    return response.data
  },

  /**
   * Get a single message by ID
   */
  async getById(messageId: string): Promise<Message> {
    const response = await apiClient.get<Message>(`${BASE_PATH}/${messageId}`)
    return response.data
  },

  /**
   * Delete a message (soft delete)
   */
  async delete(messageId: string): Promise<DeleteMessageResponse> {
    const response = await apiClient.delete<DeleteMessageResponse>(
      `${BASE_PATH}/${messageId}`
    )
    return response.data
  },

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    data: AddReactionRequest
  ): Promise<ReactionResponse> {
    const response = await apiClient.post<ReactionResponse>(
      `${BASE_PATH}/${messageId}/reactions`,
      data
    )
    return response.data
  },

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    reactionType: string
  ): Promise<ReactionResponse> {
    const response = await apiClient.delete<ReactionResponse>(
      `${BASE_PATH}/${messageId}/reactions/${reactionType}`
    )
    return response.data
  },
}

export default messageApi
