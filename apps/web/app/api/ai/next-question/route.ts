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

function entropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  return counts.reduce((h, c) => {
    if (!c) return h
    const p = c / total
    return h - p * Math.log2(p)
  }, 0)
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

    // Candidates
    const { data: rows, error } = await applyFilters(supabase.from('gadgets').select('price,brand').not('price','is',null), filters).limit(2000)
    if (error) throw error
    const n = rows?.length || 0
    if (n === 0) {
      return NextResponse.json({ success: true, data: { question: null, reason: 'no-candidates' } })
    }
    if (n <= 5) {
      return NextResponse.json({ success: true, data: { question: null, reason: 'ready-to-recommend' } })
    }

    // Evaluate candidate questions: price bucket vs brand
    // Price: split by median
    const prices = (rows || []).map(r => r.price as number).filter(v => typeof v === 'number').sort((a,b)=>a-b)
    const median = prices.length ? prices[Math.floor(prices.length/2)] : 0
    const left = prices.filter(p => p <= median).length
    const right = prices.filter(p => p > median).length
    const priceGain = entropy([n]) - entropy([left, right])

    // Brand: top K brands distribution
    const counts: Record<string, number> = {}
    for (const r of rows || []) {
      const b = (r.brand || '').trim()
      if (!b) continue
      counts[b] = (counts[b] || 0) + 1
    }
    const brandPairs = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)
    const brandGain = brandPairs.length > 0 ? (entropy([n]) - entropy(brandPairs.map(([,c])=>c))) : 0

    if (priceGain >= brandGain) {
      // Ask for price choice around the median
      const low = Math.max(100, Math.floor(median*0.8))
      const high = Math.ceil(median*1.2)
      return NextResponse.json({ success: true, data: {
        question: {
          type: 'price_range',
          text: `What budget range fits you better?`,
          options: [
            { label: `Up to $${median}`, value: { price_max: median } },
            { label: `$${median} and above`, value: { price_min: median } },
            { label: `$${low} - $${high}`, value: { price_min: low, price_max: high } }
          ]
        },
        meta: { candidates: n, median, priceGain, brandGain }
      }}, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' }})
    } else {
      // Ask for brand preference from top brands
      return NextResponse.json({ success: true, data: {
        question: {
          type: 'brand_select',
          text: 'Any preferred brands?',
          options: brandPairs.map(([brand]) => ({ label: brand, value: { brands: [brand] } }))
        },
        meta: { candidates: n, topBrands: brandPairs.map(([b,c])=>({brand:b,count:c})), priceGain, brandGain }
      }}, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' }})
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'next-question error' }, { status: 500 })
  }
}
