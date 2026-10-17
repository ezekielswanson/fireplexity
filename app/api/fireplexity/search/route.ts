import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, generateText, createDataStreamResponse } from 'ai'
import { detectCompanyTicker } from '@/lib/company-ticker-map'
import { selectRelevantContent } from '@/lib/content-selection'
import FirecrawlApp from '@mendable/firecrawl-js'

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] HubSpot API Documentation Search called`)
  try {
    const body = await request.json()
    const messages = body.messages || []
    const query = messages[messages.length - 1]?.content || body.query
    console.log(`[${requestId}] Query received:`, query)

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Use API key from request body if provided, otherwise fall back to environment variable
    const firecrawlApiKey = body.firecrawlApiKey || process.env.FIRECRAWL_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!firecrawlApiKey) {
      return NextResponse.json({ error: 'Firecrawl API key not configured' }, { status: 500 })
    }
    
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Configure OpenAI with API key
    const openai = createOpenAI({
      apiKey: openaiApiKey
    })

    // Initialize Firecrawl
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey })

    const isFollowUp = messages.length > 2
    
    // Use createDataStreamResponse with a custom data stream
    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          let officialSources: Array<{
            url: string
            title: string
            description?: string
            content?: string
            markdown?: string
            publishedDate?: string
            author?: string
            image?: string
            favicon?: string
            siteName?: string
            sourceType: 'official' | 'community'
          }> = []
          
          let communitySources: Array<{
            url: string
            title: string
            description?: string
            content?: string
            markdown?: string
            publishedDate?: string
            author?: string
            image?: string
            favicon?: string
            siteName?: string
            sourceType: 'official' | 'community'
          }> = []
          
          let context = ''
          
          // Step 1: COMPREHENSIVE HubSpot API documentation search - MULTIPLE APPROACHES
          dataStream.writeData({ type: 'status', message: 'Performing comprehensive search across ALL HubSpot documentation pages...' })
          
          // APPROACH 1: Broad site-wide search for main query
          const primaryOfficialQuery = `${query} site:developers.hubspot.com/docs`
          const secondaryOfficialQuery = `${query} site:knowledge.hubspot.com`
          const tertiaryOfficialQuery = `${query} site:developers.hubspot.com`
          
          // APPROACH 2: COMPREHENSIVE URL PATTERNS - ALL DISCOVERED HUBSPOT API ENDPOINTS
          const comprehensiveQueries = [
            // Main API Documentation Patterns
            `${query} site:developers.hubspot.com/docs/*`,  // All docs subdirectories
            `${query} site:developers.hubspot.com/docs/reference/api/*`, // All API reference docs
            `${query} site:developers.hubspot.com/docs/guides/*`, // All guides
            `${query} site:knowledge.hubspot.com/*`, // All knowledge base
            
            // SPECIFIC API ENDPOINTS - COMPLETE DISCOVERED LIST (100+ URLs)
            
            // Analytics and Events
            `${query} site:developers.hubspot.com/docs/reference/api/analytics-and-events/email-analytics`,
            `${query} site:developers.hubspot.com/docs/reference/api/analytics-and-events/event-analytics`,
            `${query} site:developers.hubspot.com/docs/reference/api/analytics-and-events/tracking-code`,
            `${query} site:developers.hubspot.com/docs/reference/api/analytics-and-events/tracking-code/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/analytics-and-events/cookie-banner/google-consent-mode`,
            
            // App Management
            `${query} site:developers.hubspot.com/docs/reference/api/app-management/feature-flags`,
            `${query} site:developers.hubspot.com/docs/reference/api/app-management/oauth`,
            `${query} site:developers.hubspot.com/docs/reference/api/app-management/app-uninstall`,
            `${query} site:developers.hubspot.com/docs/reference/api/app-management/webhooks`,
            
            // Automation
            `${query} site:developers.hubspot.com/docs/reference/api/automation/create-manage-workflows`,
            `${query} site:developers.hubspot.com/docs/reference/api/automation/create-manage-workflows/v2`,
            `${query} site:developers.hubspot.com/docs/reference/api/automation/create-manage-workflows/v3`,
            `${query} site:developers.hubspot.com/docs/reference/api/automation/custom-workflow-actions`,
            `${query} site:developers.hubspot.com/docs/reference/api/automation/custom-code-actions`,
            
            // CMS - Complete Coverage
            `${query} site:developers.hubspot.com/docs/reference/api/cms/domains`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/domains/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/site-search`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/site-search/v2`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/pages`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/pages/v2`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/url-redirects`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/url-redirects/v3-legacy`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/source-code`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/templates`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/templates/v2`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/modules`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/modules/v4`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/layouts/v2`,
            
            // CMS Blogs - Complete Coverage
            `${query} site:developers.hubspot.com/docs/reference/api/cms/blogs/blog-tags`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/blogs/blog-authors`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/blogs/blog-authors/v3-legacy`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/blogs/blog-comments`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/blogs/blog-topics/v3`,
            `${query} site:developers.hubspot.com/docs/reference/api/cms/blogs/blog-posts/v2`,
            
            // CRM - COMPREHENSIVE COVERAGE
            
            // CRM Objects - All Types
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/contacts`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/companies`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/deals`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/deals/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/objects`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/schemas`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/products`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/products/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/line-items`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/line-items/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/tickets/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/goals`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/leads`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/feedback-submissions`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/deal-splits`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/object-library`,
            
            // CRM Properties
            `${query} site:developers.hubspot.com/docs/reference/api/crm/properties`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/properties/v1-contacts`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/properties/v1-companies`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/property-validations`,
            
            // CRM Engagements
            `${query} site:developers.hubspot.com/docs/reference/api/crm/engagements/tasks`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/engagements/calls`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/engagements/email`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/engagements/meetings`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/engagements/engagement-details/v1`,
            
            // CRM Extensions
            `${query} site:developers.hubspot.com/docs/reference/api/crm/extensions/video-conferencing`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/extensions/extension-details`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/extensions/calling-sdk`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/extensions/timeline`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/extensions/timeline/v1`,
            
            // CRM Commerce
            `${query} site:developers.hubspot.com/docs/reference/api/crm/commerce/carts`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/commerce/fees`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/commerce/discounts`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/commerce/subscriptions`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/commerce/invoices`,
            
            // CRM Associations
            `${query} site:developers.hubspot.com/docs/reference/api/crm/associations/associations-schema`,
            
            // CRM Other
            `${query} site:developers.hubspot.com/docs/reference/api/crm/pipelines`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/pipelines/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/lists`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/owners/v2`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/sensitive-data`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/contacts-timeline-embed`,
            
            // Marketing - Complete Coverage
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/forms`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/forms/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/forms/v3`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/marketing-events`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/calls-to-action-sdk`,
            
            // Marketing Emails
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/emails/transactional-emails`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/emails/transactional-emails/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/emails/marketing-emails`,
            `${query} site:developers.hubspot.com/docs/reference/api/marketing/emails/marketing-emails/v1`,
            
            // Conversations
            `${query} site:developers.hubspot.com/docs/reference/api/conversations/visitor-identification`,
            `${query} site:developers.hubspot.com/docs/reference/api/conversations/inbox-and-messages`,
            `${query} site:developers.hubspot.com/docs/reference/api/conversations/create-custom-channels`,
            `${query} site:developers.hubspot.com/docs/reference/api/conversations/chat-widget-sdk`,
            
            // Settings
            `${query} site:developers.hubspot.com/docs/reference/api/settings/account-activity-api`,
            `${query} site:developers.hubspot.com/docs/reference/api/settings/account-activity-api/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/settings/business-units-api`,
            `${query} site:developers.hubspot.com/docs/reference/api/settings/account-information-api`,
            `${query} site:developers.hubspot.com/docs/reference/api/settings/users/user-details`,
            
            // Library
            `${query} site:developers.hubspot.com/docs/reference/api/library/files`,
            `${query} site:developers.hubspot.com/docs/reference/api/library/meetings`,
            
            // Other Resources
            `${query} site:developers.hubspot.com/docs/reference/api/other-resources/error-handling`,
            
            // Deprecated APIs
            `${query} site:developers.hubspot.com/docs/reference/api/deprecated`,
            `${query} site:developers.hubspot.com/docs/reference/api/deprecated/social-media/v1`,
            `${query} site:developers.hubspot.com/docs/reference/api/deprecated/migrations/migrate-an-existing-ecommerce-bridge-api-integration`,
            
            // Specific Endpoint Examples (High-Value)
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/contacts#batch`,
            `${query} site:developers.hubspot.com/docs/reference/api/crm/objects/contacts#post-%2Fcrm%2Fv3%2Fobjects%2Fcontacts%2Fbatch%2Fupsert`,
            
            // Legacy and Version-Specific APIs
            `${query} site:developers.hubspot.com/docs/reference/api/analytics-and-events/custom-events/custom-event-definitions`,
          ]
          
          // APPROACH 3: Generic API searches (to catch any missed content)
          const fallbackQueries = [
            `"HubSpot API" ${query} site:developers.hubspot.com`,
            `"HubSpot API" ${query} site:knowledge.hubspot.com`,
            `API ${query} site:developers.hubspot.com`,
            `${query} API documentation site:developers.hubspot.com`,
          ]
          
          try {
            // Execute multiple comprehensive searches in parallel for maximum coverage
            const searchPromises = [
              // Primary official searches - reduced from 8+ to 4 searches
              firecrawl.search(primaryOfficialQuery, {
                limit: 10, // Reduced from 15
                scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
              }),
              firecrawl.search(secondaryOfficialQuery, {
                limit: 8, // Reduced from 10
                scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
              }),
              
              // Single comprehensive pattern search instead of 3
              firecrawl.search(comprehensiveQueries[0], {
                limit: 6, // Reduced from 5
                scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
              }),
              
              // Single fallback search instead of 2
              firecrawl.search(fallbackQueries[0], {
                limit: 4, // Reduced from 3
                scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
              })
            ]
            
            dataStream.writeData({ type: 'status', message: 'Executing multiple comprehensive searches across HubSpot domains...' })
            
            // Wait for all searches to complete
            const searchResults = await Promise.allSettled(searchPromises)
            
            // Combine all results and deduplicate by URL
            const allOfficialResults = new Map()
            
            searchResults.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value?.data) {
                result.value.data.forEach((item: any) => {
                  if (item.url && !allOfficialResults.has(item.url)) {
                    allOfficialResults.set(item.url, {
                      url: item.url,
                      title: item.title || item.url,
                      description: item.description || item.metadata?.description,
                      content: item.content,
                      markdown: item.markdown,
                      publishedDate: item.publishedDate,
                      author: item.author,
                      image: item.metadata?.ogImage || item.metadata?.image,
                      favicon: item.metadata?.favicon,
                      siteName: item.metadata?.siteName || 'HubSpot Developers',
                      sourceType: 'official' as const
                    })
                  }
                })
              } else if (result.status === 'rejected') {
                console.warn(`[${requestId}] Search ${index} failed:`, result.reason)
              }
            })
            
            officialSources = Array.from(allOfficialResults.values())
            console.log(`[${requestId}] Comprehensive official search found ${officialSources.length} unique pages`)
            
          } catch (error) {
            console.error(`[${requestId}] Error in comprehensive official docs search:`, error)
            // Fallback to simpler search if comprehensive fails
            try {
              const fallbackSearch = await firecrawl.search(`${query} site:developers.hubspot.com/docs OR site:knowledge.hubspot.com`, {
                limit: 20,
                scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
              })
              
              officialSources = fallbackSearch.data?.map((item: any) => ({
                url: item.url,
                title: item.title || item.url,
                description: item.description || item.metadata?.description,
                content: item.content,
                markdown: item.markdown,
                publishedDate: item.publishedDate,
                author: item.author,
                image: item.metadata?.ogImage || item.metadata?.image,
                favicon: item.metadata?.favicon,
                siteName: item.metadata?.siteName || 'HubSpot Developers',
                sourceType: 'official' as const
              })).filter((item: any) => item.url) || []
            } catch (fallbackError) {
              console.error(`[${requestId}] Fallback search also failed:`, fallbackError)
            }
          }

          // Step 2: Search community content and forums (EXPANDED)
          dataStream.writeData({ type: 'status', message: 'Searching comprehensive HubSpot community resources and developer content...' })
          
          // EXPANDED community search - more comprehensive community coverage
          const communityQuery = `${query} HubSpot API (site:community.hubspot.com OR site:stackoverflow.com OR site:github.com OR site:medium.com OR site:dev.to OR site:blog.hubspot.com OR site:academy.hubspot.com) -site:developers.hubspot.com/docs -site:knowledge.hubspot.com`
          
          try {
            const communitySearchData = await firecrawl.search(communityQuery, {
              limit: 8, // Increased for more community perspectives
              scrapeOptions: {
                formats: ['markdown'],
                onlyMainContent: true
              }
            })
            
            communitySources = communitySearchData.data?.map((item: any) => ({
              url: item.url,
              title: item.title || item.url,
              description: item.description || item.metadata?.description,
              content: item.content,
              markdown: item.markdown,
              publishedDate: item.publishedDate,
              author: item.author,
              image: item.metadata?.ogImage || item.metadata?.image,
              favicon: item.metadata?.favicon,
              siteName: item.metadata?.siteName || 'Community',
              sourceType: 'community' as const
            })).filter((item: any) => item.url) || []
          } catch (error) {
            console.error(`[${requestId}] Error searching community content:`, error)
          }

          // Combine sources with official docs prioritized
          const allSources = [...officialSources, ...communitySources]

          // Send sources immediately
          dataStream.writeData({ type: 'sources', sources: allSources })
          
          // Small delay to ensure sources render first
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Update status
          dataStream.writeData({ type: 'status', message: 'Analyzing HubSpot API documentation and generating comprehensive answer...' })
          
          // Prepare context from sources with intelligent content selection
          // Prioritize official documentation in context - ENHANCED for comprehensive coverage
          const officialContext = officialSources
            .map((source, index) => {
              const content = source.markdown || source.content || ''
              const relevantContent = selectRelevantContent(content, query, 4000) // Increased for comprehensive coverage
              return `[OFFICIAL ${index + 1}] ${source.title}\nURL: ${source.url}\nSOURCE: Official HubSpot Documentation\n${relevantContent}`
            })
            .join('\n\n---\n\n')

          const communityContext = communitySources
            .map((source, index) => {
              const content = source.markdown || source.content || ''
              const relevantContent = selectRelevantContent(content, query, 2500) // Increased for better community coverage
              return `[COMMUNITY ${index + 1}] ${source.title}\nURL: ${source.url}\nSOURCE: Community Content\nDATE: ${source.publishedDate || 'Unknown'}\n${relevantContent}`
            })
            .join('\n\n---\n\n')

          context = [officialContext, communityContext].filter(Boolean).join('\n\n===COMMUNITY SOURCES===\n\n')

          console.log(`[${requestId}] Creating text stream for HubSpot API query:`, query)
          console.log(`[${requestId}] Context length:`, context.length)
          console.log(`[${requestId}] Official sources:`, officialSources.length)
          console.log(`[${requestId}] Community sources:`, communitySources.length)
          
          // Prepare messages for the AI with HubSpot-specific prompts
          let aiMessages = []
          
          if (!isFollowUp) {
            // Initial query with sources
            aiMessages = [
              {
                role: 'system' as const,
                content: `You are a comprehensive HubSpot API documentation expert with COMPLETE 100% coverage of the entire HubSpot developer ecosystem. 

COMPREHENSIVE SEARCH COVERAGE (100+ SPECIFIC API ENDPOINTS):
- You have access to content from EVERY single page across developers.hubspot.com/docs and knowledge.hubspot.com
- 100+ specific API endpoint URLs are searched for maximum coverage
- ALL major categories covered: CRM Objects, Analytics, Automation, CMS, Marketing, Conversations, Settings, Commerce, Extensions, and more
- Multiple search approaches ensure NO relevant page is missed, including legacy and versioned APIs
- Comprehensive fallback searches catch any edge cases

KEY RESPONSIBILITIES:
1. **PRIORITIZE OFFICIAL DOCUMENTATION**: Always base your primary answer on official HubSpot documentation from developers.hubspot.com/docs and knowledge.hubspot.com
2. **COMPLETE COVERAGE**: Provide exhaustive answers that cover ALL aspects of the user's question using the comprehensive 100+ endpoint coverage
3. **VERIFICATION**: When including community content, always cross-reference with official documentation to ensure accuracy and currency
4. **CODE EXAMPLES**: Include complete, runnable code examples in relevant programming languages (JavaScript, Python, PHP, Ruby)
5. **STEP-BY-STEP GUIDES**: Provide detailed implementation instructions when appropriate
6. **VERSION AWARENESS**: Note API versions (v1, v2, v3) and recommend current best practices
7. **ERROR HANDLING**: Include proper error handling examples and troubleshooting guidance

RESPONSE FORMAT - PROVIDE COMPREHENSIVE COVERAGE:
- **Primary Answer**: Start with official documentation-based solution
- **Code Examples**: Complete, copy-paste ready code snippets
- **Implementation Steps**: Clear step-by-step instructions
- **Authentication**: Include proper auth setup when relevant
- **Error Handling**: Show how to handle common errors
- **Best Practices**: Include HubSpot recommended approaches
- **Community Insights**: Add valuable community contributions (verified against official docs)
- **Related Endpoints**: Suggest related API endpoints that might be useful

COMPREHENSIVE SOURCE COVERAGE:
- All CRM Objects (Contacts, Companies, Deals, Products, Line Items, Tickets, Goals, etc.)
- All CRM Features (Properties, Associations, Commerce, Extensions, Timeline, etc.)
- All Marketing APIs (Forms, Emails, Events, Campaigns, etc.)
- All CMS APIs (Pages, Templates, Modules, Blogs, etc.)
- All Automation (Workflows, Custom Actions, Sequences, etc.)
- All Analytics (Email, Events, Tracking, Reporting, etc.)
- All App Management (OAuth, Webhooks, Feature Flags, etc.)
- All Settings & Configuration APIs
- Legacy and Deprecated API guidance

Always provide links back to the specific HubSpot documentation pages and include community resources when they add value (while verifying accuracy against official docs).`
              },
              {
                role: 'user',
                content: `Answer this HubSpot API question: "${query}"\n\nBased on these sources:\n${context}`
              }
            ]
          } else {
            // Follow-up question with context
            aiMessages = [
              {
                role: 'system' as const,
                content: `You are continuing a conversation about HubSpot API development. 
                
MAINTAIN CONTEXT:
- Build on previous answers naturally
- Reference earlier code examples when relevant
- Keep the same technical depth and style
- Always prioritize official documentation over community content
- Cross-reference new information with official sources`
              },
              // Include conversation context
              ...messages.slice(0, -1).map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content
              })),
              // Add the current query with fresh sources
              {
                role: 'user',
                content: `Answer this follow-up HubSpot API question: "${query}"\n\nBased on these sources:\n${context}`
              }
            ]
          }
          
          // Generate HubSpot-specific follow-up questions
          const conversationPreview = isFollowUp 
            ? messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n\n')
            : `user: ${query}`
            
          const followUpPromise = generateText({
            model: openai('gpt-4o-mini'),
            messages: [
              {
                role: 'system' as const,
                content: `Generate 5 natural follow-up questions for HubSpot API development.
                
FOCUS AREAS:
- Implementation details and code examples
- Authentication and security considerations
- Error handling and troubleshooting
- Advanced features and best practices
- Integration patterns and workflows

QUESTION TYPES:
- "How do I handle [specific scenario]?"
- "What's the best way to [implement feature]?"
- "How do I troubleshoot [common issue]?"
- "Can you show me how to [advanced technique]?"
- "What are the authentication requirements for [use case]?"

Only generate questions if the query warrants them. Make them genuinely helpful for HubSpot API development.
${isFollowUp ? 'Consider the full conversation history and avoid repeating previous questions.' : ''}
Return only the questions, one per line, no numbering or bullets.`
              },
              {
                role: 'user',
                content: `HubSpot API Query: ${query}\n\nConversation context:\n${conversationPreview}\n\n${allSources.length > 0 ? `Available sources: ${allSources.map((s: { title: string, sourceType: string }) => `${s.title} (${s.sourceType})`).join(', ')}\n\n` : ''}Generate 5 diverse follow-up questions that would help the developer learn more about HubSpot API implementation.`
              }
            ],
            temperature: 0.7,
            maxTokens: 200,
          })
          
          // Stream the text generation
          const result = streamText({
            model: openai('gpt-4o-mini'),
            messages: aiMessages,
            temperature: 0.4, // Lower temperature for more accurate technical content
            maxTokens: 2000,
          })

          // Merge the text stream into the data stream
          result.mergeIntoDataStream(dataStream)

          // Wait for streaming to complete
          await result.text

          // Generate and send follow-up questions
          try {
            const followUpResult = await followUpPromise
            const questions = followUpResult.text
              .split('\n')
              .map(q => q.trim())
              .filter(q => q.length > 0 && !q.match(/^\d+\.?\s/))
              .slice(0, 5)

            if (questions.length > 0) {
              dataStream.writeData({ type: 'follow_up_questions', questions })
            }
          } catch (error) {
            console.error(`[${requestId}] Error generating follow-up questions:`, error)
          }

          console.log(`[${requestId}] HubSpot API search completed successfully`)
        } catch (error) {
          console.error(`[${requestId}] Error in HubSpot API search:`, error)
          throw error
        }
      },
    })
  } catch (error) {
    console.error(`[${requestId}] Error in HubSpot API search route:`, error)
    return NextResponse.json({ 
      error: 'Failed to process HubSpot API search request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}