'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  dynamicUI?: DynamicUIElement[]
  recommendations?: any[]
}

interface DynamicUIElement {
  type: 'button' | 'slider' | 'multiselect' | 'quickaction'
  id: string
  label: string
  options?: string[] | { min: number; max: number; step: number }
  action?: string
  priority: number
}

interface AdaptiveChatProps {
  onRecommendationsReceived?: (recommendations: any[]) => void
  onUIConfigUpdate?: (config: any) => void
}

export default function AdaptiveChat({ onRecommendationsReceived, onUIConfigUpdate }: AdaptiveChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentDynamicUI, setCurrentDynamicUI] = useState<DynamicUIElement[]>([])
  const [filters, setFilters] = useState<{ price_min?: number; price_max?: number; brands?: string[] }>({})
  const [facets, setFacets] = useState<any | null>(null)
  const [nextQuestion, setNextQuestion] = useState<any | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [desktopFiltersVisible, setDesktopFiltersVisible] = useState(false)
  const messagesRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // Initialize with a simple welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm your AI laptop advisor. Let me help you find the perfect laptop.",
      timestamp: new Date().toISOString(),
      dynamicUI: [
        { type: 'button', id: 'start', label: '🚀 Let\'s Find My Laptop', action: 'start_search', priority: 1 }
      ]
    }])
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call the new dynamic AI API
      const response = await api.sendChatMessage(message.trim(), {
        userId: user?.id || 'anonymous',
        sessionId,
        context: { userMessage: message.trim() }
      })

      if (response.success ?? !!response.data) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
          dynamicUI: (response.data as any).dynamicUI || (response.data as any).suggestedActions || [],
          recommendations: response.data.recommendations || []
        }

        setMessages(prev => [...prev, aiMessage])
        setSessionId(response.data.sessionId)
        setCurrentDynamicUI(((response.data as any).dynamicUI || (response.data as any).suggestedActions || []) as any)
        
        // Send recommendations to parent component
        if (response.data.recommendations && response.data.recommendations.length > 0) {
          onRecommendationsReceived?.(response.data.recommendations)
        }

        // Fetch facets and next best question for adaptive narrowing
        try {
          const facetUrl = `/api/ai/facets${Object.keys(filters).length ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ''}`
          const facetsRes = await fetch(facetUrl)
          if (facetsRes.ok) setFacets((await facetsRes.json()).data)
          const nqUrl = `/api/ai/next-question${Object.keys(filters).length ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ''}`
          const nqRes = await fetch(nqUrl)
          if (nqRes.ok) setNextQuestion((await nqRes.json()).data)
        } catch {}

      } else {
        throw new Error('Failed to get AI response')
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm having trouble right now. Let me try to help you another way.",
        timestamp: new Date().toISOString(),
        dynamicUI: [
          { type: 'button', id: 'gaming', label: '🎮 Gaming Laptop', action: 'select_gaming', priority: 1 },
          { type: 'button', id: 'work', label: '💼 Work Laptop', action: 'select_work', priority: 2 },
          { type: 'button', id: 'budget', label: '💰 Budget Options', action: 'select_budget', priority: 3 }
        ]
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, user?.id, onRecommendationsReceived])

  const applyFilterDelta = async (delta: any) => {
    const next = { ...filters }
    if (delta.price_min !== undefined) next.price_min = delta.price_min
    if (delta.price_max !== undefined) next.price_max = delta.price_max
    if (delta.brands) {
      const s = new Set([...(next.brands || []), ...delta.brands])
      next.brands = Array.from(s)
    }
    setFilters(next)
    try {
      const facetsRes = await fetch(`/api/ai/facets?filters=${encodeURIComponent(JSON.stringify(next))}`)
      if (facetsRes.ok) setFacets((await facetsRes.json()).data)
      const nqRes = await fetch(`/api/ai/next-question?filters=${encodeURIComponent(JSON.stringify(next))}`)
      if (nqRes.ok) setNextQuestion((await nqRes.json()).data)
    } catch {}
  };

  // Auto-scroll to latest message
  useEffect(() => {
    const node = messagesRef.current
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Track scroll position to toggle FAB
  useEffect(() => {
    const node = messagesRef.current
    if (!node) return
    const onScroll = () => {
      const threshold = 16
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - threshold
      setIsAtBottom(atBottom)
    }
    node.addEventListener('scroll', onScroll)
    onScroll()
    return () => node.removeEventListener('scroll', onScroll)
  }, [])

  // Global listeners for external toggles
  useEffect(() => {
    const onToggle = () => setDesktopFiltersVisible(v => !v)
    const onClear = () => setShowFilters(false)
    window.addEventListener('toggle-filters' as any, onToggle)
    window.addEventListener('clear-filters' as any, onClear)
    return () => {
      window.removeEventListener('toggle-filters' as any, onToggle)
      window.removeEventListener('clear-filters' as any, onClear)
    }
  }, [])

  // Input handlers: auto-resize and keyboard shortcuts
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    setInput(ta.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleDynamicUIAction = (element: DynamicUIElement, value?: any) => {
    let message = ''
    
    switch (element.type) {
      case 'button':
        if (element.action === 'start_search') {
          message = 'I want to find a laptop'
        } else if (element.action === 'select_gaming') {
          message = 'I need a gaming laptop'
        } else if (element.action === 'select_work') {
          message = 'I need a work/business laptop'
        } else if (element.action === 'select_budget') {
          message = 'I\'m looking for budget-friendly options'
        } else if (element.action === 'adjust_budget') {
          // Surface a local budget slider UI for quick refinement
          setCurrentDynamicUI([
            {
              type: 'slider',
              id: 'budget_slider',
              label: 'Set your budget',
              options: { min: 300, max: 5000, step: 100 },
              priority: 1
            }
          ] as any)
          return
        } else if (element.action === 'adjust_brands') {
          // If we have facets, show top brand quick multiselect
          const brandOptions = Array.isArray((facets as any)?.brands)
            ? (facets as any).brands.map((b: any) => b.brand)
            : ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI']
          setCurrentDynamicUI([
            {
              type: 'multiselect',
              id: 'brand_select',
              label: 'Pick preferred brands',
              options: brandOptions,
              priority: 1
            }
          ] as any)
          return
        } else if (element.action === 'confirm_filters') {
          message = 'Show recommendations'
        } else if (element.action === 'compare_top3') {
          // Notify the page to open compare view
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-compare', { detail: { topN: 3 } }))
          }
          return
        } else if (element.action === 'refine') {
          setShowFilters(true)
          return
        } else {
          message = element.label
        }
        break
      case 'slider':
        message = `My budget range is $${value.min} to $${value.max}`
        // Apply locally too, to immediately update facets
        applyFilterDelta({ price_min: value.min, price_max: value.max })
        break
      case 'multiselect':
        message = `I'm interested in: ${value.join(', ')}`
        // Apply brand selection locally
        applyFilterDelta({ brands: value })
        break
      case 'quickaction':
        message = element.label
        break
    }
    
    sendMessage(message)
  }

  const renderDynamicUI = (elements: DynamicUIElement[]) => {
    if (!elements || elements.length === 0) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
      >
        <p className="text-sm text-blue-800 mb-3">Quick actions:</p>
        <div className="flex flex-wrap gap-2">
          {elements
            .sort((a, b) => a.priority - b.priority)
            .map((element, index) => (
              <DynamicUIRenderer
                key={`${element.id}-${index}`}
                element={element}
                onAction={handleDynamicUIAction}
              />
            ))}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold">AI Laptop Advisor</h2>
          <p className="text-sm text-gray-600">Never buy a sub‑optimal laptop again</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
              setDesktopFiltersVisible(v => !v)
            } else {
              setShowFilters(!showFilters)
            }
          }}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessages([{
                role: 'assistant',
                content: "Hi! I'm your AI laptop advisor. Let me help you find the perfect laptop.",
                timestamp: new Date().toISOString(),
                dynamicUI: [
                  { type: 'button', id: 'start', label: '🚀 Let\'s Find My Laptop', action: 'start_search', priority: 1 }
                ]
              }])
              // Reset conversation state
              setSessionId(null)
              setCurrentDynamicUI([])
              setFilters({})
              setFacets(null)
              setNextQuestion(null)
              // Notify other views (e.g., grid) to clear their local filters
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('clear-filters'))
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Started a new chat' } }))
              }
            }}
            title="Start a new chat"
          >
            New Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({})
              setFacets(null)
              setNextQuestion(null)
              // Inform other components to clear their filter state
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('clear-filters'))
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Filters cleared' } }))
              }
            }}
            title="Clear filters"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Main Grid: Chat + Facets (desktop) */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Chat column */}
          <div className="lg:col-span-2 flex flex-col h-full min-h-0">
            {/* Facets (mobile) */}
            {showFilters && (
              <div className="p-4 border-b bg-gray-50 lg:hidden">
                {facets && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Candidates: {facets.candidates}</div>
                    <div className="mb-2">
                      <div className="text-sm font-medium mb-1">Top Brands</div>
                      <div className="flex flex-wrap gap-2">
                        {facets.brands?.map((b: any) => (
                          <Button key={b.brand} variant={(filters.brands || []).includes(b.brand) ? 'primary' : 'outline'} size="sm" onClick={() => applyFilterDelta({ brands: [b.brand] })}>{b.brand} ({b.count})</Button>
                        ))}
                      </div>
                    </div>
                    {facets.price?.buckets?.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-1">Budget</div>
                        <div className="flex flex-wrap gap-2">
                          {facets.price.buckets.slice(0,4).map((bk: any, idx: number) => (
                            <Button key={idx} variant="outline" size="sm" onClick={() => applyFilterDelta({ price_min: bk.min, price_max: bk.max })}>
                              ${bk.min} - ${bk.max}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {nextQuestion?.question && (
                  <div>
                    <div className="text-sm font-medium mb-1">{nextQuestion.question.text}</div>
                    <div className="flex flex-wrap gap-2">
                      {nextQuestion.question.options?.map((opt: any, idx: number) => (
                        <Button key={idx} variant="outline" size="sm" onClick={() => applyFilterDelta(opt.value)}>{opt.label}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages area */}
            <div ref={messagesRef} role="log" aria-live="polite" className="relative flex-1 overflow-y-auto p-4 space-y-4 bg-white min-h-0">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <Card className={`p-4 shadow-sm ${message.role === 'user' ? 'bg-blue-50 border-blue-200 ml-4' : 'bg-white border-gray-200 mr-4'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs font-medium ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} aria-hidden>
                            {message.role === 'user' ? 'You' : 'AI'}
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            <p className="mt-1 text-[11px] text-gray-400" aria-hidden>
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {message.role === 'assistant' && message.dynamicUI && renderDynamicUI(message.dynamicUI)}
                            {message.recommendations && message.recommendations.length > 0 && (
                              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm font-semibold text-green-800 mb-2">🎯 My Recommendations:</p>
                                <div className="space-y-3">
                                  {message.recommendations.map((rec, idx) => (
                                    <div key={idx}>
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">#{rec.rank} {rec.laptop?.name} ({rec.laptop?.brand})</span>
                                        <span className="text-green-700 font-semibold">${rec.laptop?.price}</span>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1">{rec.reasoning}</p>
                                      <div className="mt-1 text-[11px] text-gray-500">
                                        {typeof rec.valueScore === 'number' && <span className="mr-2">Value: {(rec.valueScore*100|0)/100}</span>}
                                        {typeof rec.similarityScore === 'number' && <span className="mr-2">Match: {(rec.similarityScore*100|0)/100}</span>}
                                        {typeof rec.recencyScore === 'number' && <span className="mr-2">Recency: {(rec.recencyScore*100|0)/100}</span>}
                                      </div>
                                      {rec.highlights?.length > 0 && (
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                          {rec.highlights.map((highlight: string, hidx: number) => (
                                            <span key={hidx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{highlight}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-4 bg-white border-gray-200 mr-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </Card>
                </div>
              )}
              {/* Scroll-to-bottom FAB */}
              {!isAtBottom && (
                <motion.button
                  onClick={() => {
                    const node = messagesRef.current
                    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-4 bottom-4 shadow-md rounded-full bg-blue-600 text-white w-10 h-10 flex items-center justify-center"
                  aria-label="Scroll to latest"
                  title="Scroll to latest"
                >
                  ↓
                </motion.button>
              )}
            </div>

            {/* Input Area inside chat column (no overlay) */}
            <div className="border-t bg-white p-3 md:p-4">
              <div className="flex items-end gap-2 max-w-3xl">
                <div className="flex-1">
                  <label htmlFor="chat-input" className="sr-only">Message</label>
                  <textarea
                    id="chat-input"
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… Enter to send, Shift+Enter for newline"
                    className="w-full resize-none px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed max-h-40"
                    disabled={isLoading}
                  />
                </div>
                <Button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="px-5">
                  {isLoading ? '⏳' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
          {/* Facets sidebar (desktop) */}
          <aside className={`${desktopFiltersVisible ? 'hidden lg:block' : 'hidden'} border-l bg-gray-50 h-full overflow-auto p-4`}>
            <div className="text-xs text-gray-600 mb-2">Candidates: {facets?.candidates ?? '—'}</div>
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">Top Brands</div>
              <div className="flex flex-wrap gap-2">
                {facets?.brands?.map((b: any) => (
                  <Button key={b.brand} variant={(filters.brands || []).includes(b.brand) ? 'primary' : 'outline'} size="sm" onClick={() => applyFilterDelta({ brands: [b.brand] })}>{b.brand} ({b.count})</Button>
                ))}
              </div>
            </div>
            {facets?.price?.buckets?.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-medium mb-1">Budget</div>
                <div className="flex flex-wrap gap-2">
                  {facets.price.buckets.slice(0,6).map((bk: any, idx: number) => (
                    <Button key={idx} variant="outline" size="sm" onClick={() => applyFilterDelta({ price_min: bk.min, price_max: bk.max })}>
                      ${bk.min} - ${bk.max}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {nextQuestion?.question && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-1">{nextQuestion.question.text}</div>
                <div className="flex flex-wrap gap-2">
                  {nextQuestion.question.options?.map((opt: any, idx: number) => (
                    <Button key={idx} variant="outline" size="sm" onClick={() => applyFilterDelta(opt.value)}>{opt.label}</Button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
      {/* Bottom safe-area spacer for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
    </div>
  )
}

// Component to render dynamic UI elements
function DynamicUIRenderer({ element, onAction }: { 
  element: DynamicUIElement
  onAction: (element: DynamicUIElement, value?: any) => void 
}) {
  const [sliderValue, setSliderValue] = useState({ min: 500, max: 2000 })
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  switch (element.type) {
    case 'button':
    case 'quickaction':
      return (
        <Button
          onClick={() => onAction(element)}
          variant="outline"
          size="sm"
          className="mr-2 mb-2 normal-case whitespace-normal break-words"
        >
          {element.label}
        </Button>
      )

    case 'slider':
      const options = element.options as { min: number; max: number; step: number }
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {element.label}: ${sliderValue.min} - ${sliderValue.max}
          </label>
          <div className="flex space-x-4 items-center">
            <input
              type="range"
              min={options?.min || 300}
              max={options?.max || 5000}
              step={options?.step || 100}
              value={sliderValue.min}
              onChange={(e) => setSliderValue(prev => ({ ...prev, min: parseInt(e.target.value) }))}
              className="flex-1"
            />
            <input
              type="range"
              min={options?.min || 300}
              max={options?.max || 5000}
              step={options?.step || 100}
              value={sliderValue.max}
              onChange={(e) => setSliderValue(prev => ({ ...prev, max: parseInt(e.target.value) }))}
              className="flex-1"
            />
            <Button
              onClick={() => onAction(element, sliderValue)}
              size="sm"
              variant="outline"
            >
              Set Budget
            </Button>
          </div>
        </div>
      )

    case 'multiselect':
      const selectOptions = element.options as string[]
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {element.label}
          </label>
          <div className="flex flex-wrap gap-2">
            {selectOptions?.map((option, idx) => (
              <Button
                key={idx}
                onClick={() => {
                  const newSelected = selectedOptions.includes(option)
                    ? selectedOptions.filter(s => s !== option)
                    : [...selectedOptions, option]
                  setSelectedOptions(newSelected)
                }}
                variant={selectedOptions.includes(option) ? 'primary' : 'outline'}
                size="sm"
              >
                {option}
              </Button>
            ))}
          </div>
          {selectedOptions.length > 0 && (
            <Button
              onClick={() => onAction(element, selectedOptions)}
              size="sm"
              className="mt-2"
            >
              Apply Selection
            </Button>
          )}
        </div>
      )

    default:
      return null
  }
}
