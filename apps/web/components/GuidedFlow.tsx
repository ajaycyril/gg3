'use client'

import React, { useState } from 'react'
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
                  <motion.button key={p.k} variants={item} onClick={() => setPurpose(p.k)} className={`border rounded-md p-3 text-left hover:bg-[hsl(var(--muted))] ${purpose === p.k ? 'border-[hsl(var(--ring))]' : 'border-[hsl(var(--border))]'}`}>
                    {p.label}
                  </motion.button>
                ))}
              </motion.div>
              <div className="mt-4 flex gap-2">
                <Button onClick={next} disabled={!purpose}>Next</Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 className="font-medium mb-3">What&rsquo;s your budget?</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-[hsl(var(--muted-foreground))]">Min</label>
                    <input type="range" min={300} max={5000} step={50} value={budget.min} onChange={(e) => setBudget({ ...budget, min: parseInt(e.target.value) })} className="w-full" />
                  </div>
                  <div className="w-20 text-right">${budget.min}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-[hsl(var(--muted-foreground))]">Max</label>
                    <input type="range" min={300} max={5000} step={50} value={budget.max} onChange={(e) => setBudget({ ...budget, max: parseInt(e.target.value) })} className="w-full" />
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
                  <motion.button key={b} variants={item} onClick={() => toggleBrand(b)} className={`px-3 py-1 rounded-full border ${brands.includes(b) ? 'bg-[hsl(var(--ring))] text-white border-[hsl(var(--ring))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>
                    {b}
                  </motion.button>
                ))}
              </motion.div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={next}>Next</Button>
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
                <Button onClick={fetchRecs} loading={loading}>Get Recommendations</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

