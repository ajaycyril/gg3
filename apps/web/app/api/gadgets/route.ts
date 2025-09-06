import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// V0 Edge Runtime configuration
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // V0 edge-optimized environment check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration not available' },
        { status: 500 }
      )
    }

    // V0-optimized Supabase client for edge runtime
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'x-application-name': 'gadgetguru-v0-edge'
          }
        }
      }
    )

    // Parse query parameters with V0 optimization
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // V0 limit
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    console.log('V0 Edge: Fetching gadgets with params:', { search, category, brand, limit, offset })

    // V0-optimized query with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout for edge

    let query = supabase
      .from('gadgets')
      .select('*', { count: 'estimated' })
      .abortSignal(controller.signal)

    // Apply filters with V0 optimization
    if (search) {
      const searchTerm = search.trim().toLowerCase()
      if (searchTerm.length > 0) {
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
      }
    }
    // Note: Category filtering removed as column doesn't exist in schema
    // Categories can be extracted from specs JSONB field if needed
    if (brand) query = query.eq('brand', brand)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    clearTimeout(timeout)

    console.log('V0 Edge: Supabase query result:', { 
      dataCount: data?.length || 0, 
      totalCount: count, 
      error: error?.message 
    })

    if (error) {
      console.error('V0 Edge: Supabase error:', error)
      throw error
    }

    // V0-optimized response with caching headers
    return NextResponse.json({
      data: data || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
      meta: {
        runtime: 'edge',
        timestamp: new Date().toISOString(),
        cached: false
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
        'X-Runtime': 'edge'
      }
    })
  } catch (error) {
    console.error('V0 Edge: API Route error:', error)
    
    // V0-optimized error response
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          code: 'TIMEOUT',
          runtime: 'edge'
        },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch gadgets',
        details: error instanceof Error ? error.message : 'Unknown error',
        runtime: 'edge'
      },
      { status: 500 }
    )
  }
}