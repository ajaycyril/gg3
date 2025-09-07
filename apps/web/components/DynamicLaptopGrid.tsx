'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Laptop {
  id: string
  name: string
  brand: string | null
  price: number | null
  image_url: string | null
  specs: Record<string, any> | null
  reviews?: Array<{
    id: string
    author: string | null
    rating: number | null
    content: string
    source: string | null
  }>
  created_at: string
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
  loading?: boolean
}

export default function DynamicLaptopGrid({ 
  laptops, 
  uiConfig, 
  onLaptopSelect, 
  recommendations = [],
  loading = false
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
            laptop.price && laptop.price >= value.min && laptop.price <= value.max
          )
          break
        case 'brand':
          if (value.length > 0) {
            filtered = filtered.filter(laptop => laptop.brand && value.includes(laptop.brand))
          }
          break
      }
    })

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case 'price_high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case 'rating':
        filtered.sort((a, b) => {
          const aRating = a.reviews ? a.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / a.reviews.length : 0
          const bRating = b.reviews ? b.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / b.reviews.length : 0
          return bRating - aRating
        })
        break
      case 'relevance':
      default:
        // Keep original order
        break
    }

    setDisplayedLaptops(filtered)
  }

  const getSpecsDisplay = (laptop: Laptop) => {
    if (!laptop.specs) return {}

    const specs = laptop.specs as Record<string, any>
    
    if (!uiConfig) return getBasicSpecs(specs)

    switch (uiConfig.content.spec_detail_level) {
      case 'expert':
        return getExpertSpecs(specs)
      case 'detailed':
        return getDetailedSpecs(specs)
      default:
        return getBasicSpecs(specs)
    }
  }

  const getBasicSpecs = (specs: Record<string, any>) => {
    return Object.entries(specs).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return acc
    }, {} as Record<string, string>)
  }

  const getDetailedSpecs = (specs: Record<string, any>) => {
    return getBasicSpecs(specs)
  }

  const getExpertSpecs = (specs: Record<string, any>) => {
    return getBasicSpecs(specs)
  }

  const getAverageRating = (reviews?: Array<{rating: number | null}>) => {
    if (!reviews || reviews.length === 0) return null
    const validRatings = reviews.filter(r => r.rating !== null).map(r => r.rating!)
    if (validRatings.length === 0) return null
    return validRatings.reduce((acc, rating) => acc + rating, 0) / validRatings.length
  }

  const getDensityClasses = () => {
    if (!uiConfig?.layout) return 'p-4'
    
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
    const density = uiConfig?.layout?.density || 'normal'
    if (density === 'compact') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2'
    if (density === 'spacious') return 'grid grid-cols-1 md:grid-cols-2 gap-6'
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  }

  const LaptopCard = ({ laptop }: { laptop: Laptop }) => {
    const specs = getSpecsDisplay(laptop)
    const averageRating = getAverageRating(laptop.reviews)
    const isCompact = viewMode === 'list' || uiConfig?.layout?.density === 'compact'

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
      <Card className={`${getDensityClasses()} hover:shadow-lg transition-all cursor-pointer`} onClick={() => onLaptopSelect?.(laptop)}>
        
        <div className={`${isCompact ? 'flex items-center space-x-4' : ''}`}>
          {/* Basic Info */}
          <div className={isCompact ? 'flex-1' : 'mb-3'}>
            <h3 className="font-semibold text-lg">{laptop.name}</h3>
            <p className="text-gray-600">{laptop.brand || 'Unknown Brand'}</p>
            
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-xl">
                {laptop.price ? `$${laptop.price.toLocaleString()}` : 'Price TBA'}
              </span>
              {averageRating && (
                <div className="flex items-center">
                  <span className="text-yellow-500">⭐</span>
                  <span className="ml-1">{averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Specifications */}
          <div className={`${isCompact ? 'flex-1' : 'mb-3'} text-sm space-y-1`}>
            {Object.entries(specs).slice(0, isCompact ? 3 : 5).map(([key, value]) => (
              <div key={key}>
                <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
              </div>
            ))}
          </div>

          {/* Reviews Preview */}
          {laptop.reviews && laptop.reviews.length > 0 && (
            <div className={`${isCompact ? 'w-48' : 'mb-3'} text-xs`}>
              <div className="bg-gray-100 p-2 rounded">
                <p className="font-semibold mb-1">Reviews ({laptop.reviews.length}):</p>
                <p className="text-gray-600">
                  "{laptop.reviews[0].content.substring(0, 60)}..."
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 items-center justify-between mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-compare', { detail: { from: 'grid' } })) }}
          >
            Compare
          </Button>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onLaptopSelect?.(laptop) }}>
            View Details
          </Button>
        </div>
      </Card>
      </motion.div>
    )
  }

  const SkeletonCard = () => (
    <div className="rounded-lg border bg-white p-4 animate-pulse">
      <div className="h-36 bg-gray-100 rounded mb-3" />
      <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
    </div>
  )

  const gridKey = `${viewMode}-${uiConfig?.layout?.density}-${uiConfig?.content?.spec_detail_level}`

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
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
      <motion.div key={gridKey} className={getGridClasses()} variants={containerVariants} initial="hidden" animate="show">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : displayedLaptops.map(laptop => (
              <LaptopCard key={laptop.id} laptop={laptop} />
            ))}
      </motion.div>

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
