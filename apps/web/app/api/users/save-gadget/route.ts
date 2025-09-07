import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() { return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function POST(req: NextRequest) {
  try {
    const { gadget_id, action } = await req.json().catch(() => ({}))
    const userId = (req.headers.get('user-id') as string) || ''
    if (!userId || !gadget_id || !['save', 'unsave'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    // Store in users.preferences.saved_gadgets array
    const client = admin()
    const { data: userRow, error: getErr } = await client.from('users').select('preferences').eq('id', userId).single()
    if (getErr) throw getErr
    const prefs = (userRow?.preferences || {}) as any
    const saved: string[] = Array.isArray(prefs.saved_gadgets) ? prefs.saved_gadgets : []
    const next = action === 'save' ? Array.from(new Set([...saved, gadget_id])) : saved.filter(id => id !== gadget_id)
    const { error: updErr } = await client.from('users').update({ preferences: { ...prefs, saved_gadgets: next } }).eq('id', userId)
    if (updErr) throw updErr
    return NextResponse.json({ success: true, data: { saved_gadgets: next } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'save gadget failed' }, { status: 500 })
  }
}

