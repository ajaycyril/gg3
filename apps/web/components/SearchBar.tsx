'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import { Search, Filter, X } from 'lucide-react'
import { SearchFilters } from '@/lib/types'

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  loading?: boolean
  initialQuery?: string
  brands?: string[]
}

export function SearchBar({ onSearch, loading = false, initialQuery = '', brands = [] }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: initialQuery,
    brands: [],
    price_min: undefined,
    price_max: undefined,
    sort_by: 'created_at'
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ ...filters, query })
  }

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      brands: [],
      price_min: undefined,
      price_max: undefined,
      sort_by: 'created_at'
    }
    setFilters(clearedFilters)
    setQuery('')
    onSearch(clearedFilters)
  }

  const hasActiveFilters = filters.brands?.length || filters.price_min || filters.price_max

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] h-5 w-5" />
          <input
            type="text"
            placeholder="Search for gadgets, brands, or features..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-3 border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent text-lg bg-white"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? 'text-[hsl(var(--ring))]' : ''}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="ml-1 bg-[hsl(var(--ring))] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {(filters.brands?.length || 0) + (filters.price_min ? 1 : 0) + (filters.price_max ? 1 : 0)}
                </span>
              )}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              Search
            </Button>
          </div>
        </div>
      </form>

      <AnimatePresence initial={false}>
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="bg-white border border-[hsl(var(--border))] rounded-lg p-4 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Brands Filter */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">Brands</label>
              <select
                multiple
                value={filters.brands || []}
                onChange={(e) => {
                  const selectedBrands = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters({ ...filters, brands: selectedBrands })
                }}
                className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm"
              >
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min $"
                  value={filters.price_min || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    price_min: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max $"
                  value={filters.price_max || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    price_max: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">Sort by</label>
              <select
                value={filters.sort_by || 'created_at'}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  sort_by: e.target.value as SearchFilters['sort_by']
                })}
                className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm"
              >
                <option value="created_at">Newest</option>
                <option value="name">Name</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
