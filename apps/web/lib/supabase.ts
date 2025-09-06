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
    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,brand.ilike.%${filters.query}%`)
    }

    if (filters.brands && filters.brands.length > 0) {
      query = query.in('brand', filters.brands)
    }

    if (filters.price_min) {
      query = query.gte('price', filters.price_min)
    }

    if (filters.price_max) {
      query = query.lte('price', filters.price_max)
    }

    if (filters.rating_min) {
      query = query.gte('rating', filters.rating_min)
    }

    // Apply sorting
    if (filters.sort_by) {
      const ascending = filters.sort_by.includes('_asc')
      const sortField = filters.sort_by.replace('_asc', '').replace('_desc', '')
      query = query.order(sortField, { ascending })
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

    if (error) {
      console.error('Error fetching brands:', error)
      throw error
    }

    // Get unique brands, filter out null values
    const uniqueBrands = Array.from(new Set(
      (data as Array<{ brand: string | null }>)
        ?.map(item => item.brand)
        .filter((brand): brand is string => Boolean(brand))
    )).sort()
    return uniqueBrands
  },

  async getCategories(): Promise<string[]> {
    // Since there's no category field in the database schema,
    // we'll extract categories from the specs jsonb field or return empty array
    const { data, error } = await supabase
      .from('gadgets')
      .select('specs')

    if (error) {
      console.error('Error fetching categories:', error)
      throw error
    }

    // Extract categories from specs if they exist
    const categories = new Set<string>()
    ;(data as Array<{ specs: any }>)?.forEach(item => {
      if (item.specs && typeof item.specs === 'object' && 'category' in item.specs) {
        const category = (item.specs as any).category
        if (typeof category === 'string') {
          categories.add(category)
        }
      }
    })

    return Array.from(categories).sort()
  }
}