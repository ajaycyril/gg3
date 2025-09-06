import axios, { AxiosInstance } from 'axios'
import { 
  Gadget, 
  ApiResponse, 
  PaginatedResponse, 
  SearchFilters,
  Recommendation,
  User,
  UserPreferences,
  Feedback 
} from '@/lib/types'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('supabase.auth.token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = '/auth/signin'
        }
        return Promise.reject(error)
      }
    )
  }

  // Gadgets API
  async getGadgets(filters?: SearchFilters): Promise<PaginatedResponse<Gadget>> {
    const { data } = await this.client.get('/api/gadgets', { params: filters })
    return data
  }

  async getGadget(id: string): Promise<ApiResponse<Gadget>> {
    const { data } = await this.client.get(`/api/gadgets/${id}`)
    return data
  }

  async getBrands(): Promise<ApiResponse<string[]>> {
    const { data } = await this.client.get('/api/gadgets/meta/brands')
    return data
  }

  // Authentication API
  async signIn(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/signin', { email, password })
    return data
  }

  async signUp(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/signup', { email, password })
    return data
  }

  async sendMagicLink(email: string, redirectTo?: string) {
    const { data } = await this.client.post('/api/auth/magic-link', { email, redirectTo })
    return data
  }

  async signOut() {
    const { data } = await this.client.post('/api/auth/signout')
    return data
  }

  async getCurrentUser() {
    const { data } = await this.client.get('/api/auth/user')
    return data
  }

  // Recommendations API
  async createRecommendation(request: {
    prompt: string
    gadget_id?: string
    budget_range?: [number, number]
    preferred_brands?: string[]
    use_cases?: string[]
  }): Promise<ApiResponse<Recommendation>> {
    const { data } = await this.client.post('/api/recommendations', request)
    return data
  }

  async getRecommendations(limit = 10, offset = 0): Promise<PaginatedResponse<Recommendation>> {
    const { data } = await this.client.get('/api/recommendations', {
      params: { limit, offset }
    })
    return data
  }

  async getRecommendation(id: string): Promise<ApiResponse<Recommendation>> {
    const { data } = await this.client.get(`/api/recommendations/${id}`)
    return data
  }

  // User API
  async getUserProfile(): Promise<ApiResponse<User>> {
    const { data } = await this.client.get('/api/users/profile')
    return data
  }

  async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    const { data } = await this.client.put('/api/users/profile', updates)
    return data
  }

  async getUserPreferences(): Promise<ApiResponse<UserPreferences>> {
    const { data } = await this.client.get('/api/users/preferences')
    return data
  }

  async updateUserPreferences(preferences: UserPreferences): Promise<ApiResponse<UserPreferences>> {
    const { data } = await this.client.put('/api/users/preferences', preferences)
    return data
  }

  async saveGadget(gadgetId: string, action: 'save' | 'unsave') {
    const { data } = await this.client.post('/api/users/save-gadget', {
      gadget_id: gadgetId,
      action
    })
    return data
  }

  // Feedback API
  async submitFeedback(feedback: {
    recommendation_id?: string
    text?: string
    rating?: number
  }): Promise<ApiResponse<Feedback>> {
    const { data } = await this.client.post('/api/feedback', feedback)
    return data
  }

  async getFeedback(limit = 10, offset = 0): Promise<PaginatedResponse<Feedback>> {
    const { data } = await this.client.get('/api/feedback', {
      params: { limit, offset }
    })
    return data
  }

  // Health check
  async healthCheck() {
    const { data } = await this.client.get('/health')
    return data
  }
}

export const apiService = new ApiService()