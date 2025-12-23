import apiClient from './client'
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  RoomResponse,
} from '@/types'

const BASE_PATH = '/rooms'

export const roomApi = {
  /**
   * Create a new chat room
   */
  async create(data: CreateRoomRequest): Promise<CreateRoomResponse> {
    const response = await apiClient.post<CreateRoomResponse>(
      `${BASE_PATH}/create`,
      data
    )
    return response.data
  },

  /**
   * Join an existing room by room code
   */
  async join(data: JoinRoomRequest): Promise<RoomResponse> {
    const response = await apiClient.post<RoomResponse>(
      `${BASE_PATH}/join`,
      data
    )
    return response.data
  },

  /**
   * Leave a room
   */
  async leave(roomId: string): Promise<RoomResponse> {
    const response = await apiClient.post<RoomResponse>(
      `${BASE_PATH}/${roomId}/leave`
    )
    return response.data
  },

  /**
   * Close a room permanently
   */
  async close(roomId: string): Promise<RoomResponse> {
    const response = await apiClient.post<RoomResponse>(
      `${BASE_PATH}/${roomId}/close`
    )
    return response.data
  },

  /**
   * Get room details by room ID
   */
  async getById(roomId: string): Promise<RoomResponse> {
    const response = await apiClient.get<RoomResponse>(`${BASE_PATH}/${roomId}`)
    return response.data
  },

  /**
   * Get room details by room code
   */
  async getByCode(roomCode: string): Promise<RoomResponse> {
    const response = await apiClient.get<RoomResponse>(
      `${BASE_PATH}/code/${roomCode}`
    )
    return response.data
  },
}

export default roomApi
