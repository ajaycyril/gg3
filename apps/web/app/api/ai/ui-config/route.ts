import { NextRequest, NextResponse } from 'next/server'
import dynamicAI from '@api/services/dynamicAI'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const userId = (req.headers.get('user-id') as string) || 'anonymous'
    const contextStr = req.nextUrl.searchParams.get('context')
    const context = contextStr ? JSON.parse(contextStr) : {}
    const cfg = await dynamicAI.getAdaptiveUIConfig(userId, context)
    return NextResponse.json({ success: true, data: cfg })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'config error' }, { status: 500 })
  }
}
