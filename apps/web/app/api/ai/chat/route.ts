import { NextRequest, NextResponse } from 'next/server'
import dynamicAI from '@api/services/dynamicAI'
import { createClient } from '@supabase/supabase-js'

// Run in Node runtime to allow OpenAI + database clients
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const message: string = body?.message || ''
    const sessionId: string | undefined = body?.sessionId
    const context: Record<string, any> = body?.context || {}
    const userId: string = (req.headers.get('user-id') as string) || 'anonymous'

    // Try full dynamic AI first
    let openaiUsed = false
    const result = await (async () => {
      const r = await dynamicAI.processConversation(userId, message, sessionId, context)
      openaiUsed = true
      return r
    })()

    return NextResponse.json({
      success: true,
      data: {
        response: result.response,
        sessionId: result.sessionId,
        dynamicUI: result.dynamicUI,
        recommendations: result.recommendations || [],
        databaseQuery: result.databaseQuery
      },
      meta: { openai: openaiUsed, model: result.modelUsed || process.env.MODEL_GPT || 'gpt-4o' }
    })
  } catch (err: any) {
    // Optional fallback only when explicitly enabled
    if (process.env.AI_FALLBACK !== '1') {
      return NextResponse.json({ success: false, error: err?.message || 'AI route error' }, { status: 500 })
    }
    try {
      const msg = (await req.json().catch(() => ({ message: '' })))?.message || ''
      const num = Number((msg.match(/\d{3,4}/)?.[0]) || '0')
      const isGaming = /gaming/i.test(msg)
      const min = num ? Math.max(300, num - 300) : isGaming ? 800 : 300
      const max = num ? num + 300 : isGaming ? 2500 : 1500

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseAnon) throw err

      const supabase = createClient(supabaseUrl, supabaseAnon, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data } = await supabase
        .from('gadgets')
        .select('*')
        .gte('price', min)
        .lte('price', max)
        .limit(8)

      const recs = (data || []).map((g, idx) => ({
        laptop: g,
        rank: idx + 1,
        score: Math.max(0.5, 1 - idx * 0.05),
        reasoning: isGaming ? 'Good gaming value in your budget' : 'Matches your price range',
        highlights: isGaming ? ['Dedicated graphics likely'] : ['Portable and good value']
      }))

      return NextResponse.json({
        success: true,
        data: {
          response: isGaming
            ? `OpenAI unavailable. Here are solid gaming picks around your budget (${min}-${max}).`
            : `OpenAI unavailable. Here are laptops that fit your budget (${min}-${max}).`,
          sessionId: crypto.randomUUID(),
          dynamicUI: [
            { type: 'quickaction', id: 'show_more', label: 'Show More Options', priority: 1 },
            { type: 'button', id: 'refine', label: 'Refine Search', priority: 2 }
          ],
          recommendations: recs
        },
        meta: { openai: false }
      })
    } catch (_fallbackError) {
      return NextResponse.json({ success: false, error: err?.message || 'AI route error' }, { status: 500 })
    }
  }
}
