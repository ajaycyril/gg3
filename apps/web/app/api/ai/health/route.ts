import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const deep = url.searchParams.get('deep') === '1' || url.searchParams.get('deep') === 'true'
  try {
    const hasKey = !!process.env.OPENAI_API_KEY
    if (!hasKey) {
      return NextResponse.json({ ok: false, openai: { configured: false, reason: 'OPENAI_API_KEY missing' } }, { status: 200 })
    }

    if (!deep) {
      // Shallow health: do not call external network. Confirms env only.
      return NextResponse.json({ ok: true, openai: { configured: true } }, { status: 200 })
    }

    // Deep health (optional): make a tiny call to verify key validity
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const resp = await client.chat.completions.create({
      model: process.env.MODEL_GPT || 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0
    })
    return NextResponse.json({ ok: true, openai: { configured: true, deep: true, id: resp.id } }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'health error' }, { status: 200 })
  }
}
