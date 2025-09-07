'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

interface BottomBarProps {
  recommendationsCount: number
  laptopsCount: number
  mode: 'basic' | 'detailed' | 'expert'
  onChangeMode: (mode: 'basic' | 'detailed' | 'expert') => void
  onCompare: () => void
  onClearFilters: () => void
  onToggleFilters: () => void
}

export default function BottomBar({
  recommendationsCount,
  laptopsCount,
  mode,
  onChangeMode,
  onCompare,
  onClearFilters,
  onToggleFilters,
}: BottomBarProps) {
  return (
    <div className="sticky bottom-0 z-40 bg-white border-t border-[hsl(var(--border))] py-2 md:py-3 [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-3 md:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">{laptopsCount} Laptops</span>
          <span className="px-2 py-1 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">{recommendationsCount} Recs</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToggleFilters}>Show/Hide Filters</Button>
          <Button variant="outline" size="sm" onClick={onClearFilters}>Clear Filters</Button>
          <Button size="sm" onClick={onCompare}>Compare Top 3</Button>
          <div className="hidden md:flex items-center gap-1 ml-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Mode:</span>
            {(['basic','detailed','expert'] as const).map(m => (
              <button
                key={m}
                onClick={() => onChangeMode(m)}
                className={`px-2 py-1 text-xs rounded border ${mode===m ? 'bg-[hsl(var(--ring))] text-white border-[hsl(var(--ring))]' : 'bg-white hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))]'}
                `}
                aria-pressed={mode===m}
              >
                {m === 'basic' ? 'Simple' : m.charAt(0).toUpperCase()+m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

