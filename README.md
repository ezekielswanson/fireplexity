<div align="center">

# HubSpot API Search

A comprehensive AI-powered search engine for HubSpot API documentation. Get intelligent answers with real-time citations from official documentation and community resources.

<img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBxbWFxamZycWRkMmVhMGFiZnNuZjMxc3lpNHpuamR4OWlwa3F4NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QbfaTCB1OmkRmIQwzJ/giphy.gif" width="100%" alt="HubSpot API Search Demo" />

</div>

## Features

- **🔍 Comprehensive Search** - Searches official HubSpot docs + community content
- **📚 Official Documentation Priority** - Always prioritizes and verifies with official sources
- **💻 Code Examples** - Complete, runnable code snippets in multiple languages
- **🏘️ Community Insights** - Includes Stack Overflow, GitHub, and community forum discussions
- **🔗 Live Citations** - Every claim backed by direct links to sources
- **⚡ Real-time Results** - Powered by Firecrawl's search API
- **🤖 AI-Enhanced Answers** - Streaming responses with GPT-4o-mini

## What You Can Ask

- **Authentication**: "How do I authenticate with HubSpot API?"
- **API Endpoints**: "Create a contact using the Contacts API"
- **Data Management**: "Update custom properties via API"
- **Integrations**: "HubSpot webhook integration examples"
- **Troubleshooting**: "Rate limiting and error handling"
- **Advanced Features**: "Get all deals from a specific pipeline"

## Quick Start

### Clone & Install
```bash
git clone https://github.com/your-username/hubspot-api-search.git
cd hubspot-api-search
npm install
```

### Set API Keys
```bash
cp .env.example .env.local
```

Add to `.env.local`:
```
FIRECRAWL_API_KEY=fc-your-api-key
OPENAI_API_KEY=sk-your-api-key
```

### Run
```bash
npm run dev
```

Visit http://localhost:3000

## How It Works

1. **Dual Search Strategy**:
   - **Official First**: Searches developers.hubspot.com and knowledge.hubspot.com
   - **Community Second**: Searches Stack Overflow, GitHub, HubSpot Community, dev blogs

2. **Verification Process**:
   - Community content is cross-referenced with official documentation
   - Outdated information is flagged and corrected
   - Official sources always take precedence

3. **Comprehensive Responses**:
   - Direct answers with step-by-step instructions
   - Complete code examples with error handling
   - Authentication requirements and best practices
   - Links to official documentation

## Search Strategy

The tool uses a two-phase search approach:

### Phase 1: Official Documentation
- `site:developers.hubspot.com`
- `site:knowledge.hubspot.com`
- Higher priority in results and context

### Phase 2: Community Resources
- Stack Overflow discussions
- GitHub repositories and issues
- HubSpot Community forums
- Developer blogs (Medium, Dev.to)
- Cross-referenced with official docs

## Tech Stack

- **Firecrawl** - Real-time web scraping and search
- **Next.js 15** - React framework with App Router
- **OpenAI GPT-4o-mini** - AI responses and analysis
- **Vercel AI SDK** - Streaming responses
- **Tailwind CSS** - Styling

## Response Format

Each response includes:

1. **📋 Direct Answer** - Clear, actionable solution
2. **📚 Official Documentation** - Links and excerpts from HubSpot docs
3. **💻 Code Examples** - Complete, tested code snippets
4. **🔧 Implementation Steps** - Step-by-step instructions
5. **🔐 Authentication** - Required permissions and setup
6. **⚠️ Error Handling** - Common issues and solutions
7. **🏘️ Community Insights** - Additional perspectives and solutions
8. **✅ Verification Notes** - Accuracy checks and date validation

## Citation System

- **[OFFICIAL 1]** - Official HubSpot documentation
- **[COMMUNITY 1]** - Community resources
- Publication dates shown for community content
- Direct links to all sources

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fhubspot-api-search)

## Contributing

This project is based on [Fireplexity](https://github.com/mendableai/fireplexity) and adapted for HubSpot API documentation search.

## Resources

- [Firecrawl Docs](https://docs.firecrawl.dev)
- [Get Firecrawl API Key](https://firecrawl.dev)
- [HubSpot API Documentation](https://developers.hubspot.com/docs)
- [Discord Community](https://discord.gg/firecrawl)

## License

MIT License

---

Built with [Firecrawl](https://firecrawl.dev) • Enhanced for HubSpot API developers
