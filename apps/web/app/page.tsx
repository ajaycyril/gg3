'use client'

import React, { useState, useEffect } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { GadgetCard } from '@/components/GadgetCard'
import { Button } from '@/components/ui/Button'
import { apiService } from '@/lib/api'
import { Gadget, SearchFilters, PaginatedResponse } from '@/lib/types'
import { Sparkles, TrendingUp, Award } from 'lucide-react'

export default function HomePage() {
  const [gadgets, setGadgets] = useState<Gadget[]>([])
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchResults, setSearchResults] = useState<PaginatedResponse<Gadget> | null>(null)

  // Load initial data and brands
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const [gadgetsResponse, brandsResponse] = await Promise.all([
          apiService.getGadgets({ limit: 6 }),
          apiService.getBrands()
        ])
        
        setGadgets(gadgetsResponse.data)
        setBrands(brandsResponse.data || [])
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const handleSearch = async (filters: SearchFilters) => {
    try {
      setLoading(true)
      const response = await apiService.getGadgets(filters)
      setSearchResults(response)
      setHasSearched(true)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGadget = async (gadgetId: string, action: 'save' | 'unsave') => {
    try {
      await apiService.saveGadget(gadgetId, action)
      // Update local state or show success message
      console.log(`Gadget ${action}d successfully`)
    } catch (error) {
      console.error(`Failed to ${action} gadget:`, error)
    }
  }

  const displayGadgets = hasSearched ? (searchResults?.data || []) : gadgets

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 mr-2" />
              <h1 className="text-5xl font-bold">GadgetGuru</h1>
            </div>
            <p className="text-xl mb-8 text-blue-100">
              Find Your Perfect Gadget with AI-Powered Recommendations
            </p>
            <p className="text-lg mb-12 text-blue-200 max-w-2xl mx-auto">
              Get personalized recommendations based on real reviews, detailed specs, 
              and performance benchmarks. Our AI analyzes thousands of data points 
              to help you make the perfect choice.
            </p>

            {/* Search Bar */}
            <SearchBar 
              onSearch={handleSearch}
              loading={loading}
              brands={brands}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {hasSearched ? (
          /* Search Results */
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Search Results
              </h2>
              {searchResults && (
                <p className="text-gray-600">
                  {searchResults.total} gadgets found
                </p>
              )}
            </div>

            {displayGadgets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayGadgets.map((gadget) => (
                  <GadgetCard
                    key={gadget.id}
                    gadget={gadget}
                    onSave={handleSaveGadget}
                    showFullDetails
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">No gadgets found</div>
                <p className="text-gray-600">Try adjusting your search filters</p>
              </div>
            )}

            {searchResults && searchResults.hasMore && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Load More Results
                </Button>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Features Section */}
            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose GadgetGuru?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Our AI-powered platform provides comprehensive gadget insights you won't find anywhere else
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-6">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
                  <p className="text-gray-600">
                    Our GPT-4 powered system analyzes reviews, specs, and benchmarks to provide personalized recommendations
                  </p>
                </div>

                <div className="text-center p-6">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Real-Time Data</h3>
                  <p className="text-gray-600">
                    Live data from Amazon, Reddit, YouTube, and benchmark sites ensures you get the latest insights
                  </p>
                </div>

                <div className="text-center p-6">
                  <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Expert Insights</h3>
                  <p className="text-gray-600">
                    Comprehensive analysis including pros, cons, performance scores, and alternative suggestions
                  </p>
                </div>
              </div>
            </section>

            {/* Featured Gadgets */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Featured Gadgets
                </h2>
                <Button variant="outline">
                  View All Gadgets
                </Button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="bg-gray-200 h-48 rounded mb-4"></div>
                      <div className="bg-gray-200 h-4 rounded mb-2"></div>
                      <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : displayGadgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayGadgets.map((gadget) => (
                    <GadgetCard
                      key={gadget.id}
                      gadget={gadget}
                      onSave={handleSaveGadget}
                      showFullDetails
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg">No gadgets available</div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Find Your Perfect Gadget?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust GadgetGuru for smart gadget recommendations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Get AI Recommendation
            </Button>
            <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-gray-900">
              Browse All Gadgets
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}