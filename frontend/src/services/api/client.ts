import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { getSessionId } from '@/utils/storage'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add session ID header
apiClient.interceptors.request.use(
  (config) => {
    const sessionId = getSessionId()
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to unwrap data and handle errors
apiClient.interceptors.response.use(
  (response) => {
    // The backend wraps responses in { success: true, data: {...} }
    // Unwrap the data property for convenience
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data
    }
    return response
  },
  (error: AxiosError) => {
    // Extract error message from response
    const responseData = error.response?.data as { message?: string; data?: { message?: string } } | undefined
    const message =
      responseData?.message ||
      responseData?.data?.message ||
      error.message ||
      'An unexpected error occurred'

    // Create a more informative error
    const enhancedError = new Error(message) as Error & {
      statusCode?: number
      originalError?: AxiosError
    }
    enhancedError.statusCode = error.response?.status
    enhancedError.originalError = error

    return Promise.reject(enhancedError)
  }
)

export default apiClient
