'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Laptop {
  id: string
  name: string
  brand: string
  model: string
  price_usd: number
  rating_overall: number
  specs: {
    processor: any
    memory: any
    storage: any
    display: any
    graphics: any
  }
  performance_scores?: any
  use_cases?: any
  pros?: string[]
  cons?: string[]
  ai_reasoning?: string
  personalized_highlights?: string[]
}

interface UIConfiguration {
  layout: {
    view_mode: 'grid' | 'list' | 'cards'
    density: 'compact' | 'normal' | 'spacious'
    sidebar_visible: boolean
  }
  content: {
    spec_detail_level: 'basic' | 'detailed' | 'expert'
    show_benchmarks: boolean
    show_technical_details: boolean
  }
  filters: {
    visible_filters: string[]
    advanced_filters_visible: boolean
    filter_complexity: 'simple' | 'intermediate' | 'advanced'
  }
}

interface DynamicLaptopGridProps {
  laptops: Laptop[]
  uiConfig?: UIConfiguration
  onLaptopSelect?: (laptop: Laptop) => void
  recommendations?: any[]
}

export default function DynamicLaptopGrid({ 
  laptops, 
  uiConfig, 
  onLaptopSelect, 
  recommendations = [] 
}: DynamicLaptopGridProps) {
  const [displayedLaptops, setDisplayedLaptops] = useState<Laptop[]>(laptops)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [sortBy, setSortBy] = useState<string>('relevance')
  const [viewMode, setViewMode] = useState<string>('grid')

  // Update display when config changes
  useEffect(() => {
    if (uiConfig) {
      setViewMode(uiConfig.layout.view_mode)
      applyFiltersAndSort()
    }
  }, [uiConfig, laptops, filters, sortBy])

  const applyFiltersAndSort = () => {
    let filtered = [...laptops]

    // Apply active filters
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'budget':
          filtered = filtered.filter(laptop => 
            laptop.price_usd >= value.min && laptop.price_usd <= value.max
          )
          break
        case 'brand':
          if (value.length > 0) {
            filtered = filtered.filter(laptop => value.includes(laptop.brand))
          }
          break
        case 'use_case':
          filtered = filtered.filter(laptop => 
            laptop.use_cases && laptop.use_cases[value] > 0.5
          )
          break
      }
    })

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price_usd - b.price_usd)
        break
      case 'price_high':
        filtered.sort((a, b) => b.price_usd - a.price_usd)
        break
      case 'rating':
        filtered.sort((a, b) => (b.rating_overall || 0) - (a.rating_overall || 0))
        break
      case 'relevance':
      default:
        // Keep original order or sort by recommendation score
        if (recommendations.length > 0) {
          const recMap = new Map(recommendations.map(r => [r.laptop_id, r.overall_score]))
          filtered.sort((a, b) => (recMap.get(b.id) || 0) - (recMap.get(a.id) || 0))
        }
        break
    }

    setDisplayedLaptops(filtered)
  }

  const getSpecsDisplay = (laptop: Laptop) => {
    if (!uiConfig) return getBasicSpecs(laptop)

    switch (uiConfig.content.spec_detail_level) {
      case 'expert':
        return getExpertSpecs(laptop)
      case 'detailed':
        return getDetailedSpecs(laptop)
      default:
        return getBasicSpecs(laptop)
    }
  }

  const getBasicSpecs = (laptop: Laptop) => ({
    processor: `${laptop.specs.processor?.brand} ${laptop.specs.processor?.model}`,
    memory: `${laptop.specs.memory?.capacity_gb}GB RAM`,
    storage: `${laptop.specs.storage?.capacity_gb}GB ${laptop.specs.storage?.type}`,
    display: `${laptop.specs.display?.size_inches}" ${laptop.specs.display?.resolution}`,
  })

  const getDetailedSpecs = (laptop: Laptop) => ({
    ...getBasicSpecs(laptop),
    graphics: laptop.specs.graphics?.dedicated 
      ? `${laptop.specs.graphics.model} (${laptop.specs.graphics.vram_gb}GB)`
      : 'Integrated Graphics',
    performance: laptop.performance_scores?.overall_score 
      ? `Performance Score: ${laptop.performance_scores.overall_score}`
      : null,
  })

  const getExpertSpecs = (laptop: Laptop) => ({
    ...getDetailedSpecs(laptop),
    cpu_details: `${laptop.specs.processor?.cores}C/${laptop.specs.processor?.threads}T @ ${laptop.specs.processor?.base_clock}GHz`,
    memory_details: `${laptop.specs.memory?.type} @ ${laptop.specs.memory?.speed}MHz`,
    display_details: `${laptop.specs.display?.panel_type} ${laptop.specs.display?.refresh_rate}Hz`,
    benchmarks: laptop.performance_scores,
  })

  const getRecommendationContext = (laptopId: string) => {
    return recommendations.find(r => r.laptop_id === laptopId)
  }

  const getDensityClasses = () => {
    if (!uiConfig) return 'p-4'
    
    switch (uiConfig.layout.density) {
      case 'compact': return 'p-2'
      case 'spacious': return 'p-6'
      default: return 'p-4'
    }
  }

  const getGridClasses = () => {
    if (viewMode === 'list') return 'grid grid-cols-1 gap-2'
    if (viewMode === 'cards') return 'grid grid-cols-1 md:grid-cols-2 gap-4'
    
    // Grid mode with density consideration
    const density = uiConfig?.layout.density || 'normal'
    if (density === 'compact') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2'
    if (density === 'spacious') return 'grid grid-cols-1 md:grid-cols-2 gap-6'
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  }

  const LaptopCard = ({ laptop }: { laptop: Laptop }) => {
    const specs = getSpecsDisplay(laptop)
    const recommendation = getRecommendationContext(laptop.id)
    const isCompact = viewMode === 'list' || uiConfig?.layout.density === 'compact'

    return (
      <Card className={`${getDensityClasses()} hover:shadow-lg transition-shadow cursor-pointer ${
        recommendation ? 'border-blue-200 bg-blue-50' : ''
      }`}
      onClick={() => onLaptopSelect?.(laptop)}>
        
        {/* Recommendation Badge */}
        {recommendation && (
          <div className="mb-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full inline-block">
            🎯 AI Recommended ({Math.round(recommendation.overall_score * 100)}% match)
          </div>
        )}

        <div className={`${isCompact ? 'flex items-center space-x-4' : ''}`}>
          {/* Basic Info */}
          <div className={isCompact ? 'flex-1' : 'mb-3'}>
            <h3 className="font-semibold text-lg">{laptop.name}</h3>
            <p className="text-gray-600">{laptop.brand} {laptop.model}</p>
            
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-xl">${laptop.price_usd?.toLocaleString()}</span>
              {laptop.rating_overall && (
                <div className="flex items-center">
                  <span className="text-yellow-500">⭐</span>
                  <span className="ml-1">{laptop.rating_overall.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Specifications */}
          <div className={`${isCompact ? 'flex-1' : 'mb-3'} text-sm space-y-1`}>
            <div><strong>CPU:</strong> {specs.processor}</div>
            <div><strong>RAM:</strong> {specs.memory}</div>
            <div><strong>Storage:</strong> {specs.storage}</div>
            {!isCompact && <div><strong>Display:</strong> {specs.display}</div>}
            
            {/* Expert level details */}
            {uiConfig?.content.spec_detail_level === 'expert' && specs.cpu_details && (
              <div className="text-xs text-gray-600 mt-2">
                <div>{specs.cpu_details}</div>
                <div>{specs.memory_details}</div>
                <div>{specs.display_details}</div>
              </div>
            )}
          </div>

          {/* Performance Scores */}
          {uiConfig?.content.show_benchmarks && laptop.performance_scores && (
            <div className={`${isCompact ? 'w-32' : 'mb-3'} text-xs`}>
              <div className="space-y-1">
                {laptop.performance_scores.cpu_score && (
                  <div className="flex justify-between">
                    <span>CPU:</span>
                    <span className="font-semibold">{laptop.performance_scores.cpu_score}</span>
                  </div>
                )}
                {laptop.performance_scores.gpu_score && (
                  <div className="flex justify-between">
                    <span>GPU:</span>
                    <span className="font-semibold">{laptop.performance_scores.gpu_score}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {recommendation?.personalized_highlights && (
            <div className={`${isCompact ? 'w-48' : 'mb-3'} text-xs`}>
              <div className="bg-blue-100 p-2 rounded">
                <p className="font-semibold text-blue-800 mb-1">Why this matches:</p>
                <ul className="list-disc list-inside text-blue-700 space-y-0.5">
                  {recommendation.personalized_highlights.slice(0, isCompact ? 2 : 3).map((highlight: string, idx: number) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Pros/Cons for expert mode */}
          {uiConfig?.content.spec_detail_level === 'expert' && laptop.pros && laptop.cons && !isCompact && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <h4 className="font-semibold text-green-700 mb-1">Pros:</h4>
                <ul className="text-green-600 space-y-0.5">
                  {laptop.pros.slice(0, 3).map((pro, idx) => (
                    <li key={idx}>• {pro}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-700 mb-1">Cons:</h4>
                <ul className="text-red-600 space-y-0.5">
                  {laptop.cons.slice(0, 3).map((con, idx) => (
                    <li key={idx}>• {con}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <Button variant="outline" size="sm">
            Compare
          </Button>
          <Button size="sm">
            View Details
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {displayedLaptops.length} laptops found
            {recommendations.length > 0 && ` • ${recommendations.length} AI recommendations`}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded">
            {['grid', 'list', 'cards'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs ${
                  viewMode === mode ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                {mode === 'grid' && '⊞'}
                {mode === 'list' && '☰'}
                {mode === 'cards' && '⊟'}
              </button>
            ))}
          </div>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="relevance">AI Relevance</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Laptop Grid */}
      <div className={getGridClasses()}>
        {displayedLaptops.map(laptop => (
          <LaptopCard key={laptop.id} laptop={laptop} />
        ))}
      </div>

      {/* No Results */}
      {displayedLaptops.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No laptops match your current filters</p>
          <Button 
            variant="outline" 
            onClick={() => setFilters({})}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}