import { NextRequest, NextResponse } from 'next/server'
import dynamicAI from '../../../../../api/src/services/dynamicAI'

// Run in Node runtime to allow OpenAI + database clients
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const message: string = body?.message || ''
    const sessionId: string | undefined = body?.sessionId
    const context: Record<string, any> = body?.context || {}
    const userId: string = (req.headers.get('user-id') as string) || 'anonymous'

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const result = await dynamicAI.processConversation(userId, message, sessionId, context)

    return NextResponse.json({
      success: true,
      data: {
        response: result.response,
        sessionId: result.sessionId,
        dynamicUI: result.dynamicUI,
        recommendations: result.recommendations || [],
        databaseQuery: result.databaseQuery
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'AI route error' }, { status: 500 })
  }
}
