'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import AdaptiveChat from '@/components/AdaptiveChat'
import GuidedFlow from '@/components/GuidedFlow'
import DynamicLaptopGrid from '@/components/DynamicLaptopGrid'
import { Button } from '@/components/ui/Button'
import { UIConfiguration } from '@gadgetguru/shared'
import BottomBar from '@/components/BottomBar'

export default function HomePage() {
  const { user, signOut, signInWithProvider, loading } = useAuth()
  const [laptops, setLaptops] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [uiConfig, setUiConfig] = useState<UIConfiguration | null>(null)
  const [activeView, setActiveView] = useState<'chat' | 'browse' | 'split'>('split')
  const [selectedLaptop, setSelectedLaptop] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [compareOpen, setCompareOpen] = useState(false)
  const ensureUIConfig = (prev: UIConfiguration | null): UIConfiguration => prev ?? ({
    layout: { view_mode: 'cards', density: 'normal', sidebar_visible: true },
    filters: { visible_filters: ['price', 'brand', 'use_case'], advanced_filters_visible: false, filter_complexity: 'simple' },
    content: { spec_detail_level: 'basic', show_benchmarks: false, show_technical_details: false, comparison_mode: 'simple' },
    recommendations: { explanation_depth: 'moderate', show_alternatives: true, highlight_technical: false },
    interaction: { chat_complexity: 'conversational', suggested_questions_complexity: 5, enable_deep_dive_mode: false }
  })
  const effectiveConfig = ensureUIConfig(uiConfig)
  const [useGuided, setUseGuided] = useState(true)

  // Listen for compare request from chat CTAs
  useEffect(() => {
    const handler = (e: any) => {
      setCompareOpen(true)
      if (activeView === 'chat' && recommendations.length > 0) setActiveView('split')
    }
    window.addEventListener('open-compare' as any, handler)
    return () => window.removeEventListener('open-compare' as any, handler)
  }, [activeView, recommendations.length])

  // Open details from GadgetCard anywhere
  useEffect(() => {
    const handler = (e: any) => {
      const g = e?.detail?.gadget
      if (g) setSelectedLaptop(g)
    }
    window.addEventListener('open-details' as any, handler)
    return () => window.removeEventListener('open-details' as any, handler)
  }, [])

  // Initialize the adaptive interface
  useEffect(() => {
    initializeAdaptiveInterface()
  }, [user])

  const initializeAdaptiveInterface = async () => {
    try {
      console.log('🚀 Starting adaptive interface initialization...')
      setIsLoading(true)
      
      // Load initial laptop data from API client
      try {
        console.log('📊 Fetching gadgets...')
        const laptopsData = await api.getGadgets({ limit: 20 })
        console.log('✅ Gadgets loaded:', laptopsData)
        if (laptopsData.data) {
          setLaptops(laptopsData.data)
          console.log('📱 Set laptops count:', laptopsData.data.length)
        }
      } catch (laptopError) {
        console.error('❌ Failed to load laptops:', laptopError)
        // Continue without laptop data - user can still use chat
      }

      // Get dynamic UI configuration from backend AI service using API client
      try {
        console.log('🎨 Fetching UI configuration...')
        const uiConfigData = await api.getUIConfiguration(user?.id || 'anonymous')
        console.log('✅ UI Config loaded:', uiConfigData)
        if (uiConfigData && uiConfigData.data) {
          setUiConfig(uiConfigData.data as UIConfiguration)
          console.log('🎯 Set UI config:', uiConfigData.data)
        }
      } catch (configError) {
        console.error('❌ Failed to load dynamic UI config:', configError)
        // Use a default configuration so the UI doesn't break
        setUiConfig({
          layout: { 
            view_mode: 'cards', 
            density: 'normal', 
            sidebar_visible: true 
          },
          filters: {
            visible_filters: ['price', 'brand', 'use_case'],
            advanced_filters_visible: false,
            filter_complexity: 'simple'
          },
          content: { 
            spec_detail_level: 'basic',
            show_benchmarks: false,
            show_technical_details: false,
            comparison_mode: 'simple'
          },
          recommendations: {
            explanation_depth: 'moderate',
            show_alternatives: true,
            highlight_technical: false
          },
          interaction: { 
            chat_complexity: 'conversational',
            suggested_questions_complexity: 5,
            enable_deep_dive_mode: false
          }
        })
      }

      // Start with split view to show both chat and browse
      setActiveView('split')
      console.log('✅ Adaptive interface initialization complete!')

    } catch (error) {
      console.error('💥 Failed to initialize adaptive interface:', error)
      setLaptops([])
      // Set a fallback UI config so the app doesn't break
      setUiConfig({
        layout: { 
          view_mode: 'cards', 
          density: 'normal', 
          sidebar_visible: true 
        },
        filters: {
          visible_filters: ['price', 'brand', 'use_case'],
          advanced_filters_visible: false,
          filter_complexity: 'simple'
        },
        content: { 
          spec_detail_level: 'basic',
          show_benchmarks: false,
          show_technical_details: false,
          comparison_mode: 'simple'
        },
        recommendations: {
          explanation_depth: 'moderate',
          show_alternatives: true,
          highlight_technical: false
        },
        interaction: { 
          chat_complexity: 'conversational',
          suggested_questions_complexity: 5,
          enable_deep_dive_mode: false
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecommendationsReceived = (newRecommendations: any[]) => {
    setRecommendations(newRecommendations)
    
    // Auto-switch to browse view when recommendations are available
    if (newRecommendations.length > 0 && activeView === 'chat') {
      setActiveView('split')
    }
  }

  const handleUIConfigUpdate = (newConfig: UIConfiguration) => {
    setUiConfig(newConfig)
  }

  const handleLaptopSelect = (laptop: any) => {
    setSelectedLaptop(laptop)
    // Could open a detailed view or comparison modal
  }

  const getLayoutClasses = () => {
    switch (activeView) {
      case 'chat':
        return 'grid grid-cols-1'
      case 'browse':
        return 'grid grid-cols-1'
      case 'split':
        return uiConfig?.layout.sidebar_visible 
          ? 'grid grid-cols-1 lg:grid-cols-3 gap-6'
          : 'grid grid-cols-1 lg:grid-cols-2 gap-6'
      default:
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6'
    }
  }

  const ViewToggle = () => (
    <div className="flex items-center space-x-2 mb-6">
      <span className="text-sm text-gray-600">View:</span>
      <div className="flex border rounded-md overflow-hidden">
        {[
          { key: 'chat', label: '💬 Chat', desc: 'AI Conversation' },
          { key: 'browse', label: '🔍 Browse', desc: 'Laptop Grid' },
          { key: 'split', label: '⚡ Smart', desc: 'Chat + Browse' }
        ].map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setActiveView(key as any)}
            className={`px-4 py-2 text-sm ${
              activeView === key
                ? 'bg-blue-500 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-700'
            }`}
            title={desc}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Mode switcher */}
      <div className="ml-4 flex items-center gap-2">
        <span className="text-sm text-gray-600">Mode:</span>
        <div className="flex border rounded-md overflow-hidden">
          {[
            { key: 'basic', label: 'Simple' },
            { key: 'detailed', label: 'Detailed' },
            { key: 'expert', label: 'Expert' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setUiConfig(prev => { const cfg = ensureUIConfig(prev); return { ...cfg, content: { ...cfg.content, spec_detail_level: key as any } } })}
              className={`px-3 py-1 text-xs ${
                uiConfig?.content?.spec_detail_level === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Expertise indicator with proper null checking */}
      {uiConfig?.content && (
        <div className="ml-4 px-3 py-1 bg-gray-100 rounded-full text-xs">
          {uiConfig.content.spec_detail_level === 'expert' && '🔬 Expert Mode'}
          {uiConfig.content.spec_detail_level === 'detailed' && '⚖️ Detailed Mode'}
          {uiConfig.content.spec_detail_level === 'basic' && '🎯 Simple Mode'}
          {!uiConfig.content.spec_detail_level && '🤖 Auto Mode'}
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing adaptive interface...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GadgetGuru</h1>
              <p className="text-gray-600">
                AI-Powered Laptop Intelligence Platform
                {recommendations.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {recommendations.length} AI Recommendations
                  </span>
                )}
              </p>
            </div>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => signInWithProvider('google')} disabled={loading}>
                  {loading ? '...' : 'Sign In'}
                </Button>
                <Button size="sm" onClick={() => signInWithProvider('google')} disabled={loading}>
                  {loading ? '...' : 'Sign Up'}
                </Button>
              </div>
            )}
          </div>
          
          <ViewToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className={getLayoutClasses()}>
          {/* Chat Interface */}
          {(activeView === 'chat' || activeView === 'split') && (
            <div className={`${
              activeView === 'split' 
                ? (uiConfig?.layout.sidebar_visible ? 'lg:col-span-2' : 'lg:col-span-2')
                : 'col-span-1'
            }`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px]">
            <div className="flex items-center justify-end p-2 border-b">
              <div className="text-xs mr-2 text-[hsl(var(--muted-foreground))]">Mode:</div>
              <div className="flex border rounded-md overflow-hidden">
                {[
                  { key: 'guided', label: 'Guided' },
                  { key: 'chat', label: 'Chat' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setUseGuided(key==='guided')}
                    className={`px-3 py-1 text-xs ${
                      (useGuided && key==='guided') || (!useGuided && key==='chat')
                        ? 'bg-[hsl(var(--ring))] text-white'
                        : 'bg-white hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {useGuided ? (
              <GuidedFlow
                onRecommendations={(recs) => {
                  handleRecommendationsReceived(recs)
                  setActiveView('split')
                }}
                onDone={() => setActiveView('split')}
              />
            ) : (
              <AdaptiveChat
                onRecommendationsReceived={handleRecommendationsReceived}
                onUIConfigUpdate={handleUIConfigUpdate}
              />
            )}
          </div>
            </div>
          )}

          {/* Laptop Grid */}
          {(activeView === 'browse' || activeView === 'split') && (
            <div className={`${
              activeView === 'split' 
                ? (uiConfig?.layout.sidebar_visible ? 'lg:col-span-1' : 'lg:col-span-1')
                : 'col-span-1'
            }`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <DynamicLaptopGrid
                  laptops={laptops}
                  uiConfig={effectiveConfig}
                  recommendations={recommendations}
                  onLaptopSelect={handleLaptopSelect}
                  loading={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {laptops.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:shadow-sm" onClick={() => setActiveView('browse')}>
              <div className="text-2xl font-bold text-blue-600">{laptops.length}</div>
              <div className="text-sm text-gray-600">Laptops Available</div>
            </button>
            
            <button className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:shadow-sm" onClick={() => (recommendations.length > 0 ? setActiveView('split') : null)}>
              <div className="text-2xl font-bold text-green-600">{recommendations.length}</div>
              <div className="text-sm text-gray-600">AI Recommendations</div>
            </button>
            
            <button className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:shadow-sm" onClick={() => { /* open mode switcher above */ }}>
              <div className="text-2xl font-bold text-purple-600">
                {uiConfig?.content?.spec_detail_level || 'Auto'}
              </div>
              <div className="text-sm text-gray-600">Complexity Level</div>
            </button>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-orange-600">
                {uiConfig?.interaction?.suggested_questions_complexity || 5}/10
              </div>
              <div className="text-sm text-gray-600">Chat Complexity</div>
            </div>
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedLaptop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedLaptop(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedLaptop.name}</h3>
                <p className="text-sm text-gray-600">{selectedLaptop.brand}</p>
              </div>
              <button
                onClick={() => setSelectedLaptop(null)}
                className="px-3 py-1 text-sm rounded-md border hover:bg-gray-50"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {selectedLaptop.price && (
                <div className="mb-3 text-xl font-bold text-green-600">${selectedLaptop.price?.toLocaleString?.() || selectedLaptop.price}</div>
              )}
              {selectedLaptop.description && (
                <p className="mb-4 text-gray-700 whitespace-pre-wrap">{selectedLaptop.description}</p>
              )}
              {selectedLaptop.specs && (
                <div>
                  <h4 className="font-medium mb-2">Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedLaptop.specs).slice(0,20).map(([k,v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-gray-600 capitalize">{k.replace(/_/g,' ')}</span>
                        <span className="font-medium text-gray-900 text-right break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {compareOpen && recommendations.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" onClick={() => setCompareOpen(false)}>
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Compare Top 3</h3>
              <button onClick={() => setCompareOpen(false)} className="px-3 py-1 text-sm rounded-md border hover:bg-gray-50">Close</button>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.slice(0,3).map((r: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="font-semibold mb-1">{r.laptop?.name} <span className="text-gray-600">({r.laptop?.brand})</span></div>
                    <div className="text-green-700 font-bold mb-2">{r.laptop?.price ? `$${r.laptop.price}` : 'Price TBA'}</div>
                    <ul className="text-sm text-gray-700 list-disc ml-4 space-y-1">
                      {(r.highlights || []).slice(0,3).map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Utility Bar */}
      <BottomBar
        recommendationsCount={recommendations.length}
        laptopsCount={laptops.length}
        mode={(effectiveConfig.content.spec_detail_level as 'basic'|'detailed'|'expert')}
        onChangeMode={(m) => setUiConfig(prev => { const cfg = ensureUIConfig(prev); return { ...cfg, content: { ...cfg.content, spec_detail_level: m } } })}
        onCompare={() => {
          setCompareOpen(true)
          if (activeView === 'chat' && recommendations.length > 0) setActiveView('split')
        }}
        onClearFilters={() => {
          window.dispatchEvent(new CustomEvent('clear-filters'))
        }}
        onToggleFilters={() => {
          window.dispatchEvent(new CustomEvent('toggle-filters'))
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">GadgetGuru AI</h3>
              <p className="text-sm text-gray-600">
                AI-powered laptop recommendations that adapt to your expertise level and preferences.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Features</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Adaptive AI Conversations</li>
                <li>• Dynamic UI Complexity</li>
                <li>• Real-time Recommendations</li>
                <li>• Multi-source Data Analysis</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Technology</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• OpenAI GPT-4 Integration</li>
                <li>• Vector Similarity Search</li>
                <li>• Supabase Database</li>
                <li>• V0 Serverless Deployment</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>&copy; 2025 GadgetGuru AI. Revolutionizing tech purchasing decisions.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
