import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import mlRecommender from '@api/services/mlRecommender'

export const runtime = 'nodejs'

function admin() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const userId = (req.headers.get('user-id') as string) || '00000000-0000-0000-0000-000000000000'
    const { prompt = '', budget_range = [500, 2000], preferred_brands = [], use_cases = [] } = await req.json().catch(() => ({}))
    const userQuery = {
      purpose: use_cases,
      budget: { min: budget_range[0], max: budget_range[1] },
      brands: preferred_brands,
      specs: {},
      priorities: [],
      text: prompt || use_cases.join(' ')
    }
    const recs = await mlRecommender.getRecommendations(userQuery as any, userId, crypto.randomUUID())

    // Persist top 5 to recommendations table
    const top = recs.slice(0, 5)
    const { data, error } = await admin()
      .from('recommendations')
      .insert({ user_id: userId, prompt, result: { items: top } as any })
      .select('id')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: { id: data.id, items: top } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'create recommendations failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const { data, error, count } = await admin()
      .from('recommendations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return NextResponse.json({ success: true, data, pagination: { total: count || 0, limit, offset } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'list recommendations failed' }, { status: 500 })
  }
}
