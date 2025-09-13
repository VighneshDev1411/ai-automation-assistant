// src/lib/ai/AgentMemorySystem.ts

export interface MemoryEntry {
  id: string
  agentId: string
  sessionId: string
  type: 'conversation' | 'fact' | 'preference' | 'skill' | 'context'
  content: string
  metadata: Record<string, any>
  importance: number // 0-1 scale
  timestamp: Date
  expiresAt?: Date
  tags: string[]
  embedding?: number[] // For semantic search
}

export interface ContextWindow {
  sessionId: string
  agentId: string
  messages: ConversationMessage[]
  facts: MemoryEntry[]
  maxTokens: number
  currentTokens: number
  lastUpdated: Date
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tokens: number
  metadata?: Record<string, any>
}

export interface AgentSession {
  id: string
  agentId: string
  userId: string
  organizationId: string
  context: ContextWindow
  startedAt: Date
  lastActivity: Date
  isActive: boolean
  summary?: string
}

export class AgentMemorySystem {
  private memoryStore: Map<string, MemoryEntry[]> = new Map()
  private sessions: Map<string, AgentSession> = new Map()
  private embeddings: Map<string, number[]> = new Map()

  /**
   * Create or get agent session
   */
  async getOrCreateSession(
    agentId: string,
    userId: string,
    organizationId: string,
    sessionId?: string
  ): Promise<AgentSession> {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!
      session.lastActivity = new Date()
      return session
    }

    const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const session: AgentSession = {
      id: newSessionId,
      agentId,
      userId,
      organizationId,
      context: {
        sessionId: newSessionId,
        agentId,
        messages: [],
        facts: [],
        maxTokens: 4000, // Configurable based on model
        currentTokens: 0,
        lastUpdated: new Date()
      },
      startedAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    }

    this.sessions.set(newSessionId, session)
    await this.loadRelevantMemories(session)
    
    console.log(`🧠 Created session: ${newSessionId} for agent: ${agentId}`)
    return session
  }

  /**
   * Add message to conversation context
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found`)

    const message: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
      tokens: this.estimateTokens(content),
      metadata
    }

    session.context.messages.push(message)
    session.context.currentTokens += message.tokens
    session.context.lastUpdated = new Date()
    session.lastActivity = new Date()

    // Manage context window size
    await this.manageContextWindow(session)

    // Extract and store important information
    if (role === 'user' || role === 'assistant') {
      await this.extractAndStoreMemories(session, message)
    }

    console.log(`💬 Added ${role} message to session: ${sessionId}`)
  }

  /**
   * Store memory entry
   */
  async storeMemory(
    agentId: string,
    type: MemoryEntry['type'],
    content: string,
    metadata: Record<string, any> = {},
    importance: number = 0.5,
    tags: string[] = [],
    expiresAt?: Date
  ): Promise<MemoryEntry> {
    const memoryEntry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      agentId,
      sessionId: metadata.sessionId || 'global',
      type,
      content,
      metadata,
      importance,
      timestamp: new Date(),
      expiresAt,
      tags,
      embedding: await this.generateEmbedding(content)
    }

    if (!this.memoryStore.has(agentId)) {
      this.memoryStore.set(agentId, [])
    }
    this.memoryStore.get(agentId)!.push(memoryEntry)

    console.log(`🧠 Stored ${type} memory for agent: ${agentId}`)
    return memoryEntry
  }

  /**
   * Retrieve relevant memories
   */
  async retrieveMemories(
    agentId: string,
    query: string,
    type?: MemoryEntry['type'],
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const agentMemories = this.memoryStore.get(agentId) || []
    
    // Filter by type if specified
    let filteredMemories = type 
      ? agentMemories.filter(m => m.type === type)
      : agentMemories

    // Remove expired memories
    const now = new Date()
    filteredMemories = filteredMemories.filter(m => 
      !m.expiresAt || m.expiresAt > now
    )

    // Simple semantic search using embeddings
    const queryEmbedding = await this.generateEmbedding(query)
    const scoredMemories = filteredMemories.map(memory => ({
      memory,
      score: this.calculateSimilarity(queryEmbedding, memory.embedding || [])
    }))

    // Sort by relevance (similarity + importance + recency)
    scoredMemories.sort((a, b) => {
      const scoreA = a.score * 0.5 + a.memory.importance * 0.3 + this.getRecencyScore(a.memory) * 0.2
      const scoreB = b.score * 0.5 + b.memory.importance * 0.3 + this.getRecencyScore(b.memory) * 0.2
      return scoreB - scoreA
    })

    return scoredMemories.slice(0, limit).map(item => item.memory)
  }

  /**
   * Get context for agent execution
   */
  async getExecutionContext(
    sessionId: string,
    includeMemories: boolean = true
  ): Promise<{
    messages: ConversationMessage[]
    relevantMemories: MemoryEntry[]
    contextSummary: string
    tokenCount: number
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found`)

    let relevantMemories: MemoryEntry[] = []
    
    if (includeMemories) {
      // Get recent conversation to determine relevant memories
      const recentMessages = session.context.messages.slice(-5)
      const conversationContext = recentMessages.map(m => m.content).join(' ')
      
      relevantMemories = await this.retrieveMemories(
        session.agentId,
        conversationContext,
        undefined,
        10
      )
    }

    const contextSummary = await this.generateContextSummary(session)
    
    return {
      messages: session.context.messages,
      relevantMemories,
      contextSummary,
      tokenCount: session.context.currentTokens
    }
  }

  /**
   * Update memory importance based on usage
   */
  async updateMemoryImportance(memoryId: string, importanceDelta: number): Promise<void> {
    for (const [agentId, memories] of this.memoryStore.entries()) {
      const memory = memories.find(m => m.id === memoryId)
      if (memory) {
        memory.importance = Math.max(0, Math.min(1, memory.importance + importanceDelta))
        console.log(`📈 Updated memory importance: ${memoryId} → ${memory.importance}`)
        break
      }
    }
  }

  /**
   * Clear old or low-importance memories
   */
  async cleanupMemories(agentId: string): Promise<void> {
    const memories = this.memoryStore.get(agentId) || []
    const now = new Date()
    
    // Remove expired memories
    const validMemories = memories.filter(m => 
      !m.expiresAt || m.expiresAt > now
    )

    // Remove low-importance old memories (keep only top 1000)
    if (validMemories.length > 1000) {
      validMemories.sort((a, b) => {
        const scoreA = a.importance * 0.7 + this.getRecencyScore(a) * 0.3
        const scoreB = b.importance * 0.7 + this.getRecencyScore(b) * 0.3
        return scoreB - scoreA
      })
      
      this.memoryStore.set(agentId, validMemories.slice(0, 1000))
      console.log(`🧹 Cleaned up memories for agent: ${agentId}`)
    }
  }

  /**
   * Close session and summarize for long-term memory
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // Generate session summary
    const summary = await this.generateSessionSummary(session)
    
    // Store important session insights as memories
    if (summary) {
      await this.storeMemory(
        session.agentId,
        'context',
        summary,
        { sessionId, userId: session.userId },
        0.8, // High importance for session summaries
        ['session_summary']
      )
    }

    session.isActive = false
    console.log(`🔒 Closed session: ${sessionId}`)
  }

  // Private helper methods

  private async manageContextWindow(session: AgentSession): Promise<void> {
    const context = session.context
    
    // If approaching token limit, summarize and truncate
    if (context.currentTokens > context.maxTokens * 0.8) {
      console.log(`🔄 Managing context window for session: ${session.id}`)
      
      // Keep recent messages and summarize older ones
      const recentMessages = context.messages.slice(-10)
      const olderMessages = context.messages.slice(0, -10)
      
      if (olderMessages.length > 0) {
        const summary = await this.summarizeMessages(olderMessages)
        
        // Store summary as system message
        const summaryMessage: ConversationMessage = {
          id: `summary_${Date.now()}`,
          role: 'system',
          content: `Previous conversation summary: ${summary}`,
          timestamp: new Date(),
          tokens: this.estimateTokens(summary)
        }
        
        context.messages = [summaryMessage, ...recentMessages]
        context.currentTokens = context.messages.reduce((sum, msg) => sum + msg.tokens, 0)
      }
    }
  }

  private async loadRelevantMemories(session: AgentSession): Promise<void> {
    // Load user preferences and agent-specific facts
    const userMemories = await this.retrieveMemories(
      session.agentId,
      `user:${session.userId}`,
      'preference',
      5
    )
    
    const contextMemories = await this.retrieveMemories(
      session.agentId,
      'general_context',
      'fact',
      10
    )
    
    session.context.facts = [...userMemories, ...contextMemories]
  }

  private async extractAndStoreMemories(
    session: AgentSession,
    message: ConversationMessage
  ): Promise<void> {
    // Extract facts, preferences, and important information
    // This would use NLP to identify key information
    
    // Simple keyword-based extraction for now
    const content = message.content.toLowerCase()
    
    // Extract preferences
    if (content.includes('i prefer') || content.includes('i like')) {
      await this.storeMemory(
        session.agentId,
        'preference',
        message.content,
        { userId: session.userId, sessionId: session.id },
        0.7,
        ['user_preference']
      )
    }
    
    // Extract facts
    if (content.includes('remember that') || content.includes('keep in mind')) {
      await this.storeMemory(
        session.agentId,
        'fact',
        message.content,
        { userId: session.userId, sessionId: session.id },
        0.8,
        ['important_fact']
      )
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder for embedding generation
    // In production, use OpenAI embeddings or similar
    return Array.from({ length: 384 }, () => Math.random())
  }

  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0
    
    // Cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  private getRecencyScore(memory: MemoryEntry): number {
    const now = Date.now()
    const memoryTime = memory.timestamp.getTime()
    const dayInMs = 24 * 60 * 60 * 1000
    const daysSince = (now - memoryTime) / dayInMs
    
    // Exponential decay: newer memories score higher
    return Math.exp(-daysSince / 7) // Half-life of 7 days
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  private async summarizeMessages(messages: ConversationMessage[]): Promise<string> {
    // Placeholder for message summarization
    const content = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    return `Summary of ${messages.length} messages covering: ${content.slice(0, 200)}...`
  }

  private async generateContextSummary(session: AgentSession): Promise<string> {
    const recentMessages = session.context.messages.slice(-5)
    const facts = session.context.facts.slice(0, 5)
    
    const messagesSummary = recentMessages.length > 0 
      ? `Recent conversation: ${recentMessages.map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('; ')}`
      : 'No recent messages'
    
    const factsSummary = facts.length > 0
      ? `Key facts: ${facts.map(f => f.content.slice(0, 50)).join('; ')}`
      : 'No stored facts'
    
    return `${messagesSummary}. ${factsSummary}`
  }

  private async generateSessionSummary(session: AgentSession): Promise<string> {
    if (session.context.messages.length === 0) return ''
    
    const messages = session.context.messages
    const userMessages = messages.filter(m => m.role === 'user')
    const assistantMessages = messages.filter(m => m.role === 'assistant')
    
    const topics = this.extractTopics(messages.map(m => m.content).join(' '))
    const duration = session.lastActivity.getTime() - session.startedAt.getTime()
    
    return `Session summary: ${userMessages.length} user messages, ${assistantMessages.length} agent responses. ` +
           `Duration: ${Math.round(duration / 60000)} minutes. ` +
           `Topics discussed: ${topics.join(', ')}`
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction - in production, use proper NLP
    const words = text.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'])
    
    const wordCount = new Map<string, number>()
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1)
      }
    })
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }
}