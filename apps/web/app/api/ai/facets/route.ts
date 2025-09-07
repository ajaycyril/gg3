import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

type Filters = {
  price_min?: number
  price_max?: number
  brands?: string[]
}

function applyFilters(q: any, f: Filters) {
  if (typeof f.price_min === 'number') q = q.gte('price', f.price_min)
  if (typeof f.price_max === 'number') q = q.lte('price', f.price_max)
  if (Array.isArray(f.brands) && f.brands.length > 0) q = q.in('brand', f.brands)
  return q
}

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseAnon, { auth: { autoRefreshToken: false, persistSession: false } })

    const filtersParam = req.nextUrl.searchParams.get('filters')
    const filters: Filters = filtersParam ? JSON.parse(filtersParam) : {}

    // Pull candidate prices and brands with current filters (bounded)
    let base = applyFilters(supabase.from('gadgets').select('price,brand').not('price','is',null), filters)
    const { data: rows, error } = await base.limit(1000) // cap to keep edge fast
    if (error) throw error

    // Compute price histogram (dynamic buckets)
    const prices = (rows || []).map(r => r.price as number).filter(n => typeof n === 'number')
    const min = prices.length ? Math.min(...prices) : 0
    const max = prices.length ? Math.max(...prices) : 0
    const bucketCount = 6
    const buckets: { min: number; max: number; count: number }[] = []
    if (prices.length > 0) {
      const step = Math.max(50, Math.ceil((max - min) / bucketCount))
      for (let i = 0; i < bucketCount; i++) {
        const bmin = min + i * step
        const bmax = i === bucketCount - 1 ? max : bmin + step
        const count = prices.filter(p => p >= bmin && p <= bmax).length
        buckets.push({ min: Math.floor(bmin), max: Math.ceil(bmax), count })
      }
    }

    // Brand facet
    const brandCounts: Record<string, number> = {}
    for (const r of rows || []) {
      const b = (r.brand || '').trim()
      if (!b) continue
      brandCounts[b] = (brandCounts[b] || 0) + 1
    }
    const brands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([brand, count]) => ({ brand, count }))

    return NextResponse.json({
      success: true,
      data: {
        candidates: rows?.length || 0,
        price: { min, max, buckets },
        brands
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
      }
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'facets error' }, { status: 500 })
  }
}
