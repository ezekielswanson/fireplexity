'use client'

import { useChat } from 'ai/react'
import { SearchComponent } from './search'
import { ChatInterface } from './chat-interface'
import { SearchResult } from './types'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ErrorDisplay } from '@/components/error-display'

interface MessageData {
  sources: SearchResult[]
  followUpQuestions: string[]
  ticker?: string
}

export default function FireplexityPage() {
  const [sources, setSources] = useState<SearchResult[]>([])
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [searchStatus, setSearchStatus] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const lastDataLength = useRef(0)
  const [messageData, setMessageData] = useState<Map<number, MessageData>>(new Map())
  const currentMessageIndex = useRef(0)
  const [currentTicker, setCurrentTicker] = useState<string | null>(null)
  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>('')
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false)
  const [, setIsCheckingEnv] = useState<boolean>(true)
  const [pendingQuery, setPendingQuery] = useState<string>('')

  // Debug logging for component state
  console.log('🔑 FireplexityPage state:', { 
    hasApiKey, 
    firecrawlApiKey: !!firecrawlApiKey, 
    hasSearched,
    showApiKeyModal 
  })

  const { messages, input, handleInputChange, handleSubmit, isLoading, data } = useChat({
    api: '/api/fireplexity/search',
    body: {
      ...(firecrawlApiKey && { firecrawlApiKey })
    },
    onResponse: () => {
      // Clear status when response starts
      setSearchStatus('')
      // Clear current data for new response
      setSources([])
      setFollowUpQuestions([])
      setCurrentTicker(null)
      // Track the current message index (assistant messages only)
      const assistantMessages = messages.filter(m => m.role === 'assistant')
      currentMessageIndex.current = assistantMessages.length
    },
    onError: (error) => {
      console.error('Chat error:', error)
      setSearchStatus('')
    },
    onFinish: () => {
      setSearchStatus('')
      // Reset data length tracker
      lastDataLength.current = 0
    }
  })

  // Handle custom data from stream - only process new items
  useEffect(() => {
    if (data && Array.isArray(data)) {
      // Only process new items that haven't been processed before
      const newItems = data.slice(lastDataLength.current)
      
      newItems.forEach((item) => {
        if (!item || typeof item !== 'object' || !('type' in item)) return
        
        const typedItem = item as unknown as { type: string; message?: string; sources?: SearchResult[]; questions?: string[]; symbol?: string }
        if (typedItem.type === 'status') {
          setSearchStatus(typedItem.message || '')
        }
        if (typedItem.type === 'ticker' && typedItem.symbol) {
          setCurrentTicker(typedItem.symbol)
          // Also store in message data map
          const newMap = new Map(messageData)
          const existingData = newMap.get(currentMessageIndex.current) || { sources: [], followUpQuestions: [] }
          newMap.set(currentMessageIndex.current, { ...existingData, ticker: typedItem.symbol })
          setMessageData(newMap)
        }
        if (typedItem.type === 'sources' && typedItem.sources) {
          setSources(typedItem.sources)
          // Also store in message data map
          const newMap = new Map(messageData)
          const existingData = newMap.get(currentMessageIndex.current) || { sources: [], followUpQuestions: [] }
          newMap.set(currentMessageIndex.current, { ...existingData, sources: typedItem.sources })
          setMessageData(newMap)
        }
        if (typedItem.type === 'follow_up_questions' && typedItem.questions) {
          setFollowUpQuestions(typedItem.questions)
          // Also store in message data map
          const newMap = new Map(messageData)
          const existingData = newMap.get(currentMessageIndex.current) || { sources: [], followUpQuestions: [] }
          newMap.set(currentMessageIndex.current, { ...existingData, followUpQuestions: typedItem.questions })
          setMessageData(newMap)
        }
      })
      
      // Update the last processed length
      lastDataLength.current = data.length
    }
  }, [data, messageData])


  // Check for environment variables on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        console.log('🔍 Checking API keys...')
        const response = await fetch('/api/fireplexity/check-env')
        const data = await response.json()
        console.log('🔑 API key check response:', data)
        
        if (data.hasFirecrawlKey && data.hasOpenAIKey) {
          console.log('✅ Both API keys found, enabling search!')
          setHasApiKey(true)
        } else {
          console.log('❌ Missing API keys:', { 
            hasFirecrawl: data.hasFirecrawlKey, 
            hasOpenAI: data.hasOpenAIKey 
          })
          // Check localStorage for user's API key
          const storedKey = localStorage.getItem('firecrawl-api-key')
          if (storedKey) {
            console.log('📦 Found stored API key, enabling search!')
            setFirecrawlApiKey(storedKey)
            setHasApiKey(true)
          } else {
            console.log('💾 No stored API key found')
          }
        }
      } catch (error) {
        console.error('❌ Error checking environment:', error)
      } finally {
        setIsCheckingEnv(false)
        console.log('🏁 Environment check completed')
      }
    }
    
    checkApiKey()
  }, [])

  const handleApiKeySubmit = () => {
    if (firecrawlApiKey.trim()) {
      localStorage.setItem('firecrawl-api-key', firecrawlApiKey)
      setHasApiKey(true)
      setShowApiKeyModal(false)
      toast.success('API key saved successfully!')
      
      // If there's a pending query, submit it
      if (pendingQuery) {
        const fakeEvent = {
          preventDefault: () => {},
          currentTarget: {
            querySelector: () => ({ value: pendingQuery })
          }
        } as any
        handleInputChange({ target: { value: pendingQuery } } as any)
        setTimeout(() => {
          handleSubmit(fakeEvent)
          setPendingQuery('')
        }, 100)
      }
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Check if we have an API key
    if (!hasApiKey) {
      setPendingQuery(input)
      setShowApiKeyModal(true)
      return
    }
    
    setHasSearched(true)
    // Clear current data immediately when submitting new query
    setSources([])
    setFollowUpQuestions([])
    setCurrentTicker(null)
    handleSubmit(e)
  }
  
  // Wrapped submit handler for chat interface
  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Check if we have an API key
    if (!hasApiKey) {
      setPendingQuery(input)
      setShowApiKeyModal(true)
      e.preventDefault()
      return
    }
    
    // Store current data in messageData before clearing
    if (messages.length > 0 && sources.length > 0) {
      const assistantMessages = messages.filter(m => m.role === 'assistant')
      const lastAssistantIndex = assistantMessages.length - 1
      if (lastAssistantIndex >= 0) {
        const newMap = new Map(messageData)
        newMap.set(lastAssistantIndex, {
          sources: sources,
          followUpQuestions: followUpQuestions,
          ticker: currentTicker || undefined
        })
        setMessageData(newMap)
      }
    }
    
    // Clear current data immediately when submitting new query
    setSources([])
    setFollowUpQuestions([])
    setCurrentTicker(null)
    handleSubmit(e)
  }

  const isChatActive = hasSearched || messages.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        {!hasSearched ? (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-6xl">🔍</span>
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                  HubSpot API Search
                </h1>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get comprehensive answers about HubSpot API with verified documentation, 
                code examples, and community insights - all with real-time citations.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  📚 Official Documentation
                </span>
                <span className="flex items-center gap-1">
                  💻 Code Examples  
                </span>
                <span className="flex items-center gap-1">
                  🏘️ Community Insights
                </span>
                <span className="flex items-center gap-1">
                  🔗 Live Citations
                </span>
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <SearchComponent 
                handleSubmit={handleSearch}
                input={input}
                handleInputChange={handleInputChange}
                isLoading={isLoading}
              />
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-orange-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💡</span>
                  Try asking about:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <p className="text-gray-700">"How do I authenticate with HubSpot API?"</p>
                    <p className="text-gray-700">"Create a contact using the Contacts API"</p>
                    <p className="text-gray-700">"Get all deals from a specific pipeline"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-700">"Update custom properties via API"</p>
                    <p className="text-gray-700">"HubSpot webhook integration examples"</p>
                    <p className="text-gray-700">"Rate limiting and error handling"</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                Powered by <span className="font-semibold text-orange-600">Firecrawl</span> • 
                Enhanced with <span className="font-semibold text-blue-600">OpenAI GPT-4</span>
              </p>
              <p className="text-xs text-gray-400">
                Always verify official documentation for production implementations
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center border-b border-gray-200 pb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🔍</span>
                <h1 className="text-2xl font-bold text-gray-900">HubSpot API Search</h1>
              </div>
              <p className="text-gray-600">Official documentation + community insights with live citations</p>
            </div>

            <div className="flex-1 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto h-full">
                {!isChatActive ? (
                  <SearchComponent 
                    handleSubmit={handleSearch}
                    input={input}
                    handleInputChange={handleInputChange}
                    isLoading={isLoading}
                  />
                ) : (
                  <ChatInterface 
                    messages={messages}
                    sources={sources}
                    followUpQuestions={followUpQuestions}
                    searchStatus={searchStatus}
                    isLoading={isLoading}
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleChatSubmit}
                    messageData={messageData}
                    currentTicker={currentTicker}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firecrawl API Key Required</DialogTitle>
            <DialogDescription>
              To use Fireplexity search, you need a Firecrawl API key. Get one for free at{' '}
              <a 
                href="https://www.firecrawl.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 underline"
              >
                firecrawl.dev
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter your Firecrawl API key"
              value={firecrawlApiKey}
              onChange={(e) => setFirecrawlApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleApiKeySubmit()
                }
              }}
              className="h-12"
            />
            <Button onClick={handleApiKeySubmit} variant="orange" className="w-full">
              Save API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}