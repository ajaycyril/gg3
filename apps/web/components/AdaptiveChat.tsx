'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  complexity?: number
}

interface UIConfiguration {
  layout: {
    view_mode: string
    density: string
    sidebar_visible: boolean
  }
  interaction: {
    chat_complexity: string
    suggested_questions_complexity: number
    enable_deep_dive_mode: boolean
  }
  content: {
    spec_detail_level: string
    show_benchmarks: boolean
    show_technical_details: boolean
  }
}

interface AdaptiveChatProps {
  onRecommendationsReceived?: (recommendations: any[]) => void
  onUIConfigUpdate?: (config: UIConfiguration) => void
}

export default function AdaptiveChat({ onRecommendationsReceived, onUIConfigUpdate }: AdaptiveChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [uiConfig, setUiConfig] = useState<UIConfiguration | null>(null)
  const [suggestedActions, setSuggestedActions] = useState<any[]>([])
  const [expertiseLevel, setExpertiseLevel] = useState<string>('auto_detect')

  // Initialize chat with adaptive greeting
  useEffect(() => {
    if (user && messages.length === 0) {
      initializeChat()
    }
  }, [user])

  const initializeChat = async () => {
    try {
      // Get user's UI configuration
      const configResponse = await fetch('/api/ai/ui-config', {
        credentials: 'include'
      })
      const configData = await configResponse.json()
      
      if (configData.success) {
        setUiConfig(configData.data.configuration)
        setExpertiseLevel(configData.data.user_expertise)
        onUIConfigUpdate?.(configData.data.configuration)
      }

      // Set adaptive greeting based on expertise level
      const greeting = getAdaptiveGreeting(configData.data.user_expertise || 'intermediate')
      setMessages([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString()
      }])

    } catch (error) {
      console.error('Failed to initialize adaptive chat:', error)
      // Fallback greeting
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm here to help you find the perfect laptop. What are you looking for?",
        timestamp: new Date().toISOString()
      }])
    }
  }

  const getAdaptiveGreeting = (expertise: string): string => {
    switch (expertise) {
      case 'expert':
        return "Welcome! I can provide detailed technical specifications, benchmark comparisons, and component-level analysis. What specific requirements or use cases are you optimizing for?"
      case 'intermediate':
        return "Hi! I can help you find the perfect laptop with the right balance of features and performance. What will you primarily use your laptop for?"
      case 'beginner':
        return "Hello! I'll help you find a great laptop that fits your needs and budget. Don't worry about technical details - I'll explain everything in simple terms. What's your main use for the laptop?"
      default:
        return "Hi there! I'm your AI laptop advisor. I'll adapt my recommendations to your level of expertise as we chat. What brings you here today?"
    }
  }

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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          sessionId,
          context: {
            phase: messages.length <= 2 ? 'discovery' : 'refinement',
            expertise_level: expertiseLevel
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date().toISOString(),
          complexity: data.data.metadata.complexity_level
        }

        setMessages(prev => [...prev, aiMessage])
        setSessionId(data.data.sessionId)
        setSuggestedActions(data.data.suggestedActions || [])
        
        // Update UI configuration if changed
        if (data.data.uiConfiguration) {
          setUiConfig(data.data.uiConfiguration)
          onUIConfigUpdate?.(data.data.uiConfiguration)
        }

        // Handle recommendations
        if (data.data.recommendations && data.data.recommendations.length > 0) {
          onRecommendationsReceived?.(data.data.recommendations)
        }

      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm having trouble right now. Could you please try rephrasing your question?",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, expertiseLevel, messages.length, onRecommendationsReceived, onUIConfigUpdate])

  const handleSuggestedAction = (action: any) => {
    if (action.type === 'ask_question') {
      sendMessage(action.content)
    } else if (action.type === 'refine_search') {
      sendMessage(`I want to ${action.content}`)
    }
  }

  const provideFeedback = async (messageIndex: number, feedbackType: string, rating?: number) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          turn_number: Math.floor(messageIndex / 2),
          feedback_type: feedbackType,
          rating
        })
      })
    } catch (error) {
      console.error('Failed to send feedback:', error)
    }
  }

  const getChatComplexityStyle = () => {
    if (!uiConfig?.interaction) return 'normal'
    
    const complexity = uiConfig.interaction.suggested_questions_complexity || 5
    if (complexity <= 3) return 'simple'
    if (complexity >= 7) return 'technical'
    return 'normal'
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Header with Adaptive Indicators */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">AI Laptop Advisor</h2>
          <p className="text-sm text-gray-600">
            {expertiseLevel === 'expert' && '🔬 Expert Mode - Technical Details'}
            {expertiseLevel === 'intermediate' && '⚖️ Balanced Mode - Features & Performance'}
            {expertiseLevel === 'beginner' && '🎯 Simple Mode - Easy Recommendations'}
            {expertiseLevel === 'auto_detect' && '🤖 Adaptive Mode - Learning Your Style'}
          </p>
        </div>
        {uiConfig?.interaction.enable_deep_dive_mode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendMessage("I want detailed technical specifications and benchmarks")}
          >
            🔍 Deep Dive
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] p-4 ${
              message.role === 'user' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              
              {/* Complexity indicator for AI messages */}
              {message.role === 'assistant' && message.complexity && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>Complexity: {message.complexity}/10</span>
                    {message.complexity <= 3 && <span className="text-green-600">Simple</span>}
                    {message.complexity > 3 && message.complexity < 7 && <span className="text-yellow-600">Moderate</span>}
                    {message.complexity >= 7 && <span className="text-red-600">Technical</span>}
                  </div>
                  
                  {/* Feedback buttons */}
                  <div className="flex space-x-1">
                    <button
                      onClick={() => provideFeedback(index, 'helpful', 5)}
                      className="text-xs text-gray-500 hover:text-green-600"
                      title="Helpful"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => provideFeedback(index, 'too_complex', 2)}
                      className="text-xs text-gray-500 hover:text-red-600"
                      title="Too complex"
                    >
                      🧠
                    </button>
                    <button
                      onClick={() => provideFeedback(index, 'too_simple', 2)}
                      className="text-xs text-gray-500 hover:text-yellow-600"
                      title="Too simple"
                    >
                      😴
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-white border-gray-200">
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

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.slice(0, 4).map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestedAction(action)}
                className="text-xs"
              >
                {action.content}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={
              getChatComplexityStyle() === 'technical' 
                ? "Ask about specific specs, benchmarks, or technical details..."
                : getChatComplexityStyle() === 'simple'
                ? "What do you need help with?"
                : "Describe what you're looking for..."
            }
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