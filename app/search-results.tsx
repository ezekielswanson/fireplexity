'use client'

import { SearchResult } from './types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface SearchResultsProps {
  results: SearchResult[]
}

export function SearchResults({ results }: SearchResultsProps) {
  if (!results || results.length === 0) {
    return null
  }

  // Separate official and community sources
  const officialResults = results.filter(result => 
    result.url.includes('developers.hubspot.com') || 
    result.url.includes('knowledge.hubspot.com') ||
    result.siteName?.includes('HubSpot')
  )
  
  const communityResults = results.filter(result => 
    !result.url.includes('developers.hubspot.com') && 
    !result.url.includes('knowledge.hubspot.com') &&
    !result.siteName?.includes('HubSpot')
  )

  const getSourceBadge = (url: string) => {
    if (url.includes('developers.hubspot.com') || url.includes('knowledge.hubspot.com')) {
      return <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200">📚 Official Docs</Badge>
    }
    if (url.includes('github.com')) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">💻 GitHub</Badge>
    }
    if (url.includes('stackoverflow.com')) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">❓ Stack Overflow</Badge>
    }
    if (url.includes('community.hubspot.com')) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">🏘️ HubSpot Community</Badge>
    }
    if (url.includes('medium.com') || url.includes('dev.to')) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800">📝 Blog</Badge>
    }
    return <Badge variant="outline">🌐 Community</Badge>
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return null
    }
  }

  const ResultCard = ({ result, index }: { result: SearchResult; index: number }) => (
    <Card key={result.url} className="group hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="font-medium text-sm leading-tight text-gray-900 truncate">
              {result.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {result.publishedDate && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                ⏰ {formatDate(result.publishedDate)}
              </div>
            )}
            {getSourceBadge(result.url)}
          </div>
        </div>
        
        {result.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {result.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <Link 
            href={result.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 group/link truncate max-w-[200px]"
          >
            <span className="truncate">{new URL(result.url).hostname}</span>
            <span className="group-hover/link:translate-x-0.5 transition-transform flex-shrink-0">🔗</span>
          </Link>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
            [{index + 1}]
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Official Documentation Section */}
      {officialResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📚</span>
            <h2 className="text-lg font-semibold text-gray-900">Official HubSpot Documentation</h2>
            <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200">
              {officialResults.length} source{officialResults.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid gap-3">
            {officialResults.map((result, index) => (
              <ResultCard key={result.url} result={result} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Community Sources Section */}
      {communityResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👥</span>
            <h2 className="text-lg font-semibold text-gray-900">Community Resources</h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {communityResults.length} source{communityResults.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid gap-3">
            {communityResults.map((result, index) => (
              <ResultCard 
                key={result.url} 
                result={result} 
                index={officialResults.length + index} 
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">📚</div>
          <p>No HubSpot API documentation found for your query.</p>
          <p className="text-sm mt-1">Try refining your search terms or ask about specific API endpoints.</p>
        </div>
      )}
    </div>
  )
}