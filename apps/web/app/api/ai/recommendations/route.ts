import { NextRequest, NextResponse } from 'next/server'
import dynamicAI from '@api/services/dynamicAI'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const userId = (req.headers.get('user-id') as string) || 'anonymous'
    const { preferences = {}, context = {} } = await req.json().catch(() => ({}))
    const recs = await dynamicAI.generateAdaptiveRecommendationsForUser(userId, preferences, context)
    return NextResponse.json({ success: true, data: recs })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'recommendations error' }, { status: 500 })
  }
}
