import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const hasKey = !!process.env.OPENAI_API_KEY
    if (!hasKey) {
      return NextResponse.json({ ok: false, openai: { configured: false } }, { status: 200 })
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    // Cheap capability check (no token usage)
    const res = await client.models.list()
    return NextResponse.json({ ok: true, openai: { configured: true, models: res.data?.length || 0 } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'health error' }, { status: 200 })
  }
}

