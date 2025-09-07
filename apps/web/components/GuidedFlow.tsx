'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

interface GuidedFlowProps {
  onRecommendations: (recs: any[]) => void
  onDone?: () => void
}

export default function GuidedFlow({ onRecommendations, onDone }: GuidedFlowProps) {
  const [step, setStep] = useState(0)
  const [purpose, setPurpose] = useState<string | null>(null)
  const [budget, setBudget] = useState<{ min: number; max: number }>({ min: 800, max: 2500 })
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveRecs, setLiveRecs] = useState<any[]>([])

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

  const next = () => setStep((s) => Math.min(s + 1, 3))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const toggleBrand = (b: string) => {
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
  }

  const fetchRecs = async () => {
    try {
      setLoading(true)
      const prefs: any = {
        budget_range: [budget.min, budget.max],
        preferred_brands: brands,
        use_cases: purpose ? [purpose] : []
      }
      const res = await api.getAIRecommendations(prefs, {})
      if ((res as any)?.data) onRecommendations((res as any).data)
      onDone?.()
    } finally {
      setLoading(false)
    }
  }

  // Live recommendations: update as the user selects signals
  useEffect(() => {
    let t: any
    const ready = purpose || brands.length > 0 || (budget.min && budget.max)
    if (!ready) return
    t = setTimeout(async () => {
      try {
        setLiveLoading(true)
        const prefs: any = {
          budget_range: [budget.min, budget.max],
          preferred_brands: brands,
          use_cases: purpose ? [purpose] : []
        }
        const res = await api.getAIRecommendations(prefs, {})
        let data = (res as any)?.data || []
        // Fallback: if AI returns empty, pull gadgets and map to rec shape
        if (!data.length) {
          try {
            const g = await api.getGadgets({ limit: 20, brands: brands.length ? [brands[0]] : undefined })
            const gadgets = (g as any)?.data || []
            // Client-side price filter fallback
            const filtered = gadgets.filter((x: any) => !x.price || (x.price >= budget.min && x.price <= budget.max))
            data = filtered.slice(0, 8).map((x: any, idx: number) => ({
              laptop: x,
              rank: idx + 1,
              score: Math.max(0.5, 1 - idx * 0.07),
              reasoning: purpose ? `Good for ${purpose}` : 'Matches your filters',
              highlights: brands.length ? [`Brand ${brands[0]}`] : ['Good value'],
              valueScore: 0.6,
              similarityScore: 0.6,
              recencyScore: 0.5
            }))
          } catch {}
        }
        setLiveRecs(data)
        // Continuously inform parent so the grid updates live
        onRecommendations(data)
      } finally {
        setLiveLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose, budget.min, budget.max, brands.join(',')])

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white/80 backdrop-blur">
        <h2 className="text-lg font-semibold">Find Your Laptop</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Answer a few quick questions and get tailored picks</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 className="font-medium mb-3">What will you mainly use the laptop for?</h3>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { k: 'gaming', label: '🎮 Gaming' },
                  { k: 'work', label: '💼 Work' },
                  { k: 'creative', label: '🎨 Creative' },
                  { k: 'student', label: '🎓 Student' }
                ].map((p) => (
                  <motion.button key={p.k} variants={item} onClick={() => { setPurpose(p.k); next(); }} className={`border rounded-md p-3 text-left hover:bg-[hsl(var(--muted))] ${purpose === p.k ? 'border-[hsl(var(--ring))]' : 'border-[hsl(var(--border))]'}`}>
                    {p.label}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 className="font-medium mb-3">What&rsquo;s your budget?</h3>
              <div className="space-y-3">
                {/* Quick presets advance immediately */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { min: 500, max: 800, label: '$500–$800' },
                    { min: 800, max: 1200, label: '$800–$1200' },
                    { min: 1200, max: 2000, label: '$1200–$2000' },
                    { min: 2000, max: 3000, label: '$2000–$3000' }
                  ].map(p => (
                    <Button key={p.label} variant="outline" size="sm" onClick={() => { setBudget({ min: p.min, max: p.max }); next(); }}>{p.label}</Button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-[hsl(var(--muted-foreground))]">Min</label>
                    <input type="range" min={300} max={5000} step={50} value={budget.min} onChange={(e) => setBudget({ ...budget, min: parseInt(e.target.value) })} onMouseUp={next} onTouchEnd={next} className="w-full" />
                  </div>
                  <div className="w-20 text-right">${budget.min}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-[hsl(var(--muted-foreground))]">Max</label>
                    <input type="range" min={300} max={5000} step={50} value={budget.max} onChange={(e) => setBudget({ ...budget, max: parseInt(e.target.value) })} onMouseUp={next} onTouchEnd={next} className="w-full" />
                  </div>
                  <div className="w-20 text-right">${budget.max}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={next}>Next</Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 className="font-medium mb-3">Any preferred brands?</h3>
              <motion.div variants={container} initial="hidden" animate="show" className="flex flex-wrap gap-2">
                {['Apple','Dell','HP','Lenovo','ASUS','Acer','MSI','Alienware'].map((b) => (
                  <motion.button key={b} variants={item} onClick={() => { setBrands([b]); next(); }} className={`px-3 py-1 rounded-full border ${brands.includes(b) ? 'bg-[hsl(var(--ring))] text-white border-[hsl(var(--ring))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>
                    {b}
                  </motion.button>
                ))}
              </motion.div>
              <div className="mt-4 flex gap-2 items-center">
                <Button variant="outline" onClick={back}>Back</Button>
                <button className="text-xs text-[hsl(var(--muted-foreground))] underline" onClick={next}>Skip</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 className="font-medium mb-3">Summary</h3>
              <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-1">
                <li>Purpose: <span className="text-foreground font-medium">{purpose}</span></li>
                <li>Budget: <span className="text-foreground font-medium">${budget.min} – ${budget.max}</span></li>
                <li>Brands: <span className="text-foreground font-medium">{brands.length ? brands.join(', ') : 'Any'}</span></li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={fetchRecs} loading={loading}>Show All</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live matches panel */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Live Matches</h4>
            {liveLoading && <span className="text-xs text-[hsl(var(--muted-foreground))]">Updating…</span>}
          </div>
          {liveRecs.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Adjust your choices to see matches.</p>
          ) : (
            <div className="space-y-3">
              {liveRecs.slice(0, 5).map((r, i) => (
                <div key={i} className="border border-[hsl(var(--border))] rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{r.laptop?.name} <span className="text-[hsl(var(--muted-foreground))]">({r.laptop?.brand})</span></div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{r.reasoning}</div>
                  </div>
                  <div className="text-sm font-semibold">{r.laptop?.price ? `$${r.laptop.price}` : 'TBA'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
