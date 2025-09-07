import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() { return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET(req: NextRequest) {
  try {
    const userId = (req.headers.get('user-id') as string) || ''
    if (!userId) return NextResponse.json({ error: 'user-id header required' }, { status: 400 })
    const { data, error } = await admin().from('users').select('*').eq('id', userId).single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'profile fetch failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = (req.headers.get('user-id') as string) || ''
    if (!userId) return NextResponse.json({ error: 'user-id header required' }, { status: 400 })
    const updates = await req.json().catch(() => ({}))
    const { data, error } = await admin().from('users').update(updates).eq('id', userId).select('*').single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'profile update failed' }, { status: 500 })
  }
}

