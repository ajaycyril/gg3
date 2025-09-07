import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { recommendation_id = null, text = null, rating = null } = body
    const userId = (req.headers.get('user-id') as string) || '00000000-0000-0000-0000-000000000000'
    const { data, error } = await admin().from('feedback').insert({ user_id: userId, recommendation_id, text, rating }).select('*').single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'feedback failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const { data, error, count } = await admin().from('feedback').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) throw error
    return NextResponse.json({ success: true, data, pagination: { total: count || 0, limit, offset } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'feedback list failed' }, { status: 500 })
  }
}

