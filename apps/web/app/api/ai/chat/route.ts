import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const message: string = body?.message || ''
    const sessionId: string = body?.sessionId || crypto.randomUUID()
    const userId: string = (req.headers.get('user-id') as string) || 'anonymous'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Very lightweight recommendation fallback (serverless-safe)
    // Budget hint
    const num = Number((message.match(/\d{3,4}/)?.[0]) || '0')
    const isGaming = /gaming/i.test(message)
    const min = num ? Math.max(300, num - 300) : isGaming ? 800 : 300
    const max = num ? num + 300 : isGaming ? 2500 : 1500

    let query = supabase
      .from('gadgets')
      .select('*')
      .gte('price', min)
      .lte('price', max)
      .limit(8)

    const { data, error } = await query
    if (error) throw error

    // Simple scoring
    const recs = (data || []).map((g, idx) => ({
      laptop: g,
      rank: idx + 1,
      score: Math.max(0.5, 1 - (idx * 0.05)),
      reasoning: isGaming ? 'Good gaming value in your budget' : 'Matches your price range',
      highlights: isGaming ? ['Dedicated graphics likely'] : ['Portable and good value']
    }))

    const responseText = isGaming
      ? `Here are solid gaming picks around your budget (${min}-${max}).`
      : `Here are laptops that fit your budget (${min}-${max}).`

    return NextResponse.json({
      success: true,
      data: {
        response: responseText,
        sessionId,
        dynamicUI: [
          { type: 'quickaction', id: 'show_more', label: 'Show More Options', priority: 1 },
          { type: 'button', id: 'refine', label: 'Refine Search', priority: 2 }
        ],
        recommendations: recs
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'AI route error' }, { status: 500 })
  }
}

