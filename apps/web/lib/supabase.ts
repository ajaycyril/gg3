import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'
import { Gadget, SearchFilters, PaginatedResponse } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Direct Supabase service for fetching gadgets
export const supabaseService = {
  async getGadgets(filters: SearchFilters = {}): Promise<PaginatedResponse<Gadget>> {
    let query = supabase
      .from('gadgets')
      .select('*')

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.brand) {
      query = query.eq('brand', filters.brand)
    }

    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice)
    }

    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice)
    }

    if (filters.minRating) {
      query = query.gte('rating', filters.minRating)
    }

    // Apply sorting
    if (filters.sortBy) {
      const ascending = filters.sortOrder === 'asc'
      query = query.order(filters.sortBy, { ascending })
    } else {
      // Default sorting by created_at descending
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    const limit = filters.limit || 20
    const offset = filters.offset || 0
    
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching gadgets:', error)
      throw error
    }

    return {
      data: data || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    }
  },

  async getGadget(id: string): Promise<Gadget | null> {
    const { data, error } = await supabase
      .from('gadgets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching gadget:', error)
      throw error
    }

    return data
  },

  async getBrands(): Promise<string[]> {
    const { data, error } = await supabase
      .from('gadgets')
      .select('brand')
      .order('brand')

    if (error) {
      console.error('Error fetching brands:', error)
      throw error
    }

    // Get unique brands
    const uniqueBrands = [...new Set(data?.map(item => item.brand).filter(Boolean))] as string[]
    return uniqueBrands
  },

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('gadgets')
      .select('category')
      .order('category')

    if (error) {
      console.error('Error fetching categories:', error)
      throw error
    }

    // Get unique categories
    const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))] as string[]
    return uniqueCategories
  }
}