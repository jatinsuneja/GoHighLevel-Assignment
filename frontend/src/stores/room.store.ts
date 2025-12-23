import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoomResponse, Participant } from '@/types'
import { roomApi } from '@/services/api'

export const useRoomStore = defineStore('room', () => {
  // State
  const currentRoom = ref<RoomResponse | null>(null)
  const participants = ref<Participant[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const roomId = computed(() => currentRoom.value?.roomId || null)
  const roomCode = computed(() => currentRoom.value?.roomCode || null)
  const isRoomActive = computed(() => currentRoom.value?.status === 'active')
  const isInRoom = computed(() => !!currentRoom.value)

  const otherParticipant = computed(() => {
    if (!currentRoom.value) return null
    // Find the other participant (not the current user)
    // This will be set properly when we have the userId from session
    return participants.value.find((p) => p.isActive) || null
  })

  const activeParticipants = computed(() => participants.value.filter((p) => p.isActive))

  // Actions
  async function createRoom(displayName: string): Promise<string> {
    isLoading.value = true
    error.value = null
    try {
      const response = await roomApi.create({ displayName })
      return response.roomCode
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function joinRoom(roomCode: string, displayName: string): Promise<RoomResponse> {
    isLoading.value = true
    error.value = null
    try {
      const response = await roomApi.join({ roomCode, displayName })
      currentRoom.value = response
      participants.value = response.participants
      return response
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRoom(roomId: string): Promise<RoomResponse> {
    isLoading.value = true
    error.value = null
    try {
      const response = await roomApi.getById(roomId)
      currentRoom.value = response
      participants.value = response.participants
      return response
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRoomByCode(code: string): Promise<RoomResponse> {
    isLoading.value = true
    error.value = null
    try {
      const response = await roomApi.getByCode(code)
      currentRoom.value = response
      participants.value = response.participants
      return response
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function leaveRoom(): Promise<void> {
    if (!currentRoom.value) return

    const roomIdToLeave = currentRoom.value.roomId

    isLoading.value = true
    error.value = null
    try {
      // Emit socket leave_room event first (before clearing room state)
      // This is imported lazily to avoid circular dependencies
      const { getSocket } = await import('@/services/socket')
      const socket = getSocket()
      if (socket.connected) {
        socket.emit('leave_room', { roomId: roomIdToLeave })
      }

      // Then call REST API
      await roomApi.leave(roomIdToLeave)
      clearRoom()
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function setRoom(room: RoomResponse) {
    currentRoom.value = room
    participants.value = room.participants
  }

  function updateParticipants(newParticipants: Participant[]) {
    participants.value = newParticipants
  }

  function addParticipant(participant: Participant) {
    const exists = participants.value.find((p) => p.userId === participant.userId)
    if (!exists) {
      participants.value.push(participant)
    } else {
      // Update existing participant
      Object.assign(exists, participant)
    }
  }

  function removeParticipant(userId: string) {
    const participant = participants.value.find((p) => p.userId === userId)
    if (participant) {
      participant.isActive = false
    }
  }

  function setRoomClosed() {
    if (currentRoom.value) {
      currentRoom.value.status = 'closed'
      currentRoom.value.closedAt = new Date().toISOString()
    }
  }

  function clearRoom() {
    currentRoom.value = null
    participants.value = []
    error.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    currentRoom,
    participants,
    isLoading,
    error,
    // Getters
    roomId,
    roomCode,
    isRoomActive,
    isInRoom,
    otherParticipant,
    activeParticipants,
    // Actions
    createRoom,
    joinRoom,
    fetchRoom,
    fetchRoomByCode,
    leaveRoom,
    setRoom,
    updateParticipants,
    addParticipant,
    removeParticipant,
    setRoomClosed,
    clearRoom,
    clearError,
  }
})
