/**
 * Backfill embeddings for gadgets table into gadget_embeddings using OpenAI.
 * Usage: ts-node scripts/backfill-embeddings.ts (ensure env vars set)
 */
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Fetch gadgets lacking embeddings (simple example)
  const { data: gadgets, error } = await supabase
    .from('gadgets')
    .select('id, name, brand, specs')
    .limit(500)

  if (error) throw error
  if (!gadgets) return

  for (const g of gadgets) {
    try {
      const text = [g.name, g.brand, JSON.stringify(g.specs || {})].filter(Boolean).join(' ')
      const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
      const vector = emb.data[0].embedding
      // upsert
      const { error: upErr } = await supabase
        .from('gadget_embeddings')
        .upsert({ gadget_id: g.id, embedding: vector, updated_at: new Date().toISOString() })
      if (upErr) console.error('Upsert error for', g.id, upErr.message)
    } catch (e: any) {
      console.error('Embedding error for', g.id, e?.message)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

