import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration not available' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabase
      .from('gadgets')
      .select('specs')

    if (error) throw error

    // Extract categories from specs jsonb field
    const categories = new Set<string>()
    data?.forEach(item => {
      if (item.specs && typeof item.specs === 'object' && 'category' in item.specs) {
        const category = (item.specs as any).category
        if (typeof category === 'string') {
          categories.add(category)
        }
      }
    })

    const uniqueCategories = Array.from(categories).sort()
    
    return NextResponse.json(uniqueCategories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}