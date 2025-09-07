'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

      if (response.success) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
          dynamicUI: response.data.dynamicUI || [],
          recommendations: response.data.recommendations || []
        }

        setMessages(prev => [...prev, aiMessage])
        setSessionId(response.data.sessionId)
        setCurrentDynamicUI(response.data.dynamicUI || [])
        
        // Send recommendations to parent component
        if (response.data.recommendations && response.data.recommendations.length > 0) {
          onRecommendationsReceived?.(response.data.recommendations)
        }

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
        } else {
          message = element.label
        }
        break
      case 'slider':
        message = `My budget range is $${value.min} to $${value.max}`
        break
      case 'multiselect':
        message = `I'm interested in: ${value.join(', ')}`
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
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 mb-3">Quick actions:</p>
        <div className="space-y-3">
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
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">AI Laptop Advisor</h2>
          <p className="text-sm text-gray-600">Dynamic AI-powered recommendations</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <Card className={`p-4 ${
                message.role === 'user' 
                  ? 'bg-blue-50 border-blue-200 ml-4' 
                  : 'bg-white border-gray-200 mr-4'
              }`}>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Render dynamic UI elements */}
                {message.role === 'assistant' && message.dynamicUI && (
                  renderDynamicUI(message.dynamicUI)
                )}

                {/* Show recommendations */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-semibold text-green-800 mb-2">
                      🎯 My Recommendations:
                    </p>
                    {message.recommendations.map((rec, idx) => (
                      <div key={idx} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            #{rec.rank} {rec.laptop?.name} ({rec.laptop?.brand})
                          </span>
                          <span className="text-green-600 font-bold">
                            ${rec.laptop?.price}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{rec.reasoning}</p>
                        <div className="flex gap-1 mt-2">
                          {rec.highlights?.map((highlight: string, hidx: number) => (
                            <span key={hidx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        ))}
        
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
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Type your message or use the buttons above..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-6"
          >
            {isLoading ? '⏳' : 'Send'}
          </Button>
        </div>
      </div>
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
          className="mr-2 mb-2"
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
                variant={selectedOptions.includes(option) ? 'default' : 'outline'}
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
