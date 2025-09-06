import { Gadget, SearchFilters, PaginatedResponse, ApiResponse, Recommendation, User, UserPreferences, Feedback } from '@/lib/types'

const API_BASE = process.env.NODE_ENV === 'production' ? '' : ''

export const api = {
  async getGadgets(filters: SearchFilters = {}): Promise<PaginatedResponse<Gadget>> {
    const params = new URLSearchParams()
    
    if (filters.query) params.append('search', filters.query)
    if (filters.brands && filters.brands.length > 0) params.append('brand', filters.brands[0]) // Use first brand for now
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())

    const response = await fetch(`${API_BASE}/api/gadgets?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gadgets: ${response.statusText}`)
    }

    return response.json()
  },

  async getGadget(id: string): Promise<Gadget | null> {
    const response = await fetch(`${API_BASE}/api/gadgets/${id}`)
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gadget: ${response.statusText}`)
    }

    return response.json()
  },

  async getBrands(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/api/gadgets/brands`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch brands: ${response.statusText}`)
    }

    return response.json()
  },

  async getCategories(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/api/gadgets/categories`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }

    return response.json()
  },

  async signIn(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(`Failed to sign in: ${response.statusText}`)
    }

    return response.json()
  },

  async signUp(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(`Failed to sign up: ${response.statusText}`)
    }

    return response.json()
  },

  async sendMagicLink(email: string, redirectTo?: string) {
    const response = await fetch(`${API_BASE}/api/auth/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, redirectTo }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send magic link: ${response.statusText}`)
    }

    return response.json()
  },

  async signOut() {
    const response = await fetch(`${API_BASE}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to sign out: ${response.statusText}`)
    }

    return response.json()
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/api/auth/user`)

    if (!response.ok) {
      throw new Error(`Failed to fetch current user: ${response.statusText}`)
    }

    return response.json()
  },

  async createRecommendation(request: {
    prompt: string
    gadget_id?: string
    budget_range?: [number, number]
    preferred_brands?: string[]
    use_cases?: string[]
  }): Promise<ApiResponse<Recommendation>> {
    const response = await fetch(`${API_BASE}/api/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Failed to create recommendation: ${response.statusText}`)
    }

    return response.json()
  },

  async getRecommendations(limit = 10, offset = 0): Promise<PaginatedResponse<Recommendation>> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())

    const response = await fetch(`${API_BASE}/api/recommendations?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.statusText}`)
    }

    return response.json()
  },

  async getRecommendation(id: string): Promise<ApiResponse<Recommendation>> {
    const response = await fetch(`${API_BASE}/api/recommendations/${id}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendation: ${response.statusText}`)
    }

    return response.json()
  },

  async getUserProfile(): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE}/api/users/profile`)

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`)
    }

    return response.json()
  },

  async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error(`Failed to update user profile: ${response.statusText}`)
    }

    return response.json()
  },

  async getUserPreferences(): Promise<ApiResponse<UserPreferences>> {
    const response = await fetch(`${API_BASE}/api/users/preferences`)

    if (!response.ok) {
      throw new Error(`Failed to fetch user preferences: ${response.statusText}`)
    }

    return response.json()
  },

  async updateUserPreferences(preferences: UserPreferences): Promise<ApiResponse<UserPreferences>> {
    const response = await fetch(`${API_BASE}/api/users/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    })

    if (!response.ok) {
      throw new Error(`Failed to update user preferences: ${response.statusText}`)
    }

    return response.json()
  },

  async saveGadget(gadgetId: string, action: 'save' | 'unsave') {
    const response = await fetch(`${API_BASE}/api/users/save-gadget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gadget_id: gadgetId, action }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save gadget: ${response.statusText}`)
    }

    return response.json()
  },

  async submitFeedback(feedback: {
    recommendation_id?: string
    text?: string
    rating?: number
  }): Promise<ApiResponse<Feedback>> {
    const response = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    })

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`)
    }

    return response.json()
  },

  async getFeedback(limit = 10, offset = 0): Promise<PaginatedResponse<Feedback>> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())

    const response = await fetch(`${API_BASE}/api/feedback?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch feedback: ${response.statusText}`)
    }

    return response.json()
  },

  async healthCheck() {
    const response = await fetch(`${API_BASE}/health`)

    if (!response.ok) {
      throw new Error(`Failed to perform health check: ${response.statusText}`)
    }

    return response.json()
  }
}