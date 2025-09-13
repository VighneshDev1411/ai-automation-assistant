// src/lib/ai/AgentOrchestrator.ts

export interface AgentTask {
  id: string
  type: 'sequential' | 'parallel' | 'conditional' | 'loop'
  agentId: string
  prompt: string
  context: Record<string, any>
  dependencies?: string[] // Task IDs this task depends on
  condition?: string // For conditional execution
  maxRetries: number
  timeout: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: any
  error?: string
  createdAt: Date
  startedAt?: Date // Made optional
  completedAt?: Date // Made optional
}

export interface AgentWorkflow {
  id: string
  name: string
  description: string
  tasks: AgentTask[]
  globalContext: Record<string, any>
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
  createdBy: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export interface AgentCommunication {
  from: string
  to: string
  message: string
  context: Record<string, any>
  timestamp: Date
  type: 'request' | 'response' | 'notification' | 'error'
}

export class AgentOrchestrator {
  private runningWorkflows: Map<string, AgentWorkflow> = new Map()
  private communicationHistory: Map<string, AgentCommunication[]> = new Map()
  private agentManager: any // Reference to AIAgentManager

  constructor(agentManager: any) {
    this.agentManager = agentManager
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(workflow: AgentWorkflow): Promise<any> {
    console.log(`🚀 Starting workflow: ${workflow.name}`)
    
    workflow.status = 'running'
    this.runningWorkflows.set(workflow.id, workflow)

    try {
      const results = await this.processWorkflowTasks(workflow)
      workflow.status = 'completed'
      workflow.updatedAt = new Date()
      
      console.log(`✅ Workflow completed: ${workflow.name}`)
      return results
    } catch (error) {
      workflow.status = 'failed'
      workflow.updatedAt = new Date()
      console.error(`❌ Workflow failed: ${workflow.name}`, error)
      throw error
    } finally {
      this.runningWorkflows.delete(workflow.id)
    }
  }

  /**
   * Process workflow tasks based on their execution type
   */
  private async processWorkflowTasks(workflow: AgentWorkflow): Promise<any> {
    const results: Record<string, any> = {}
    const taskQueue: AgentTask[] = [...workflow.tasks]
    const completedTasks: Set<string> = new Set()

    while (taskQueue.length > 0) {
      const readyTasks = this.getReadyTasks(taskQueue, completedTasks)
      
      if (readyTasks.length === 0) {
        throw new Error('Circular dependency or unresolvable dependencies detected')
      }

      // Group tasks by execution type
      const sequentialTasks = readyTasks.filter(t => t.type === 'sequential')
      const parallelTasks = readyTasks.filter(t => t.type === 'parallel')
      const conditionalTasks = readyTasks.filter(t => t.type === 'conditional')

      // Execute sequential tasks one by one
      for (const task of sequentialTasks) {
        results[task.id] = await this.executeTask(task, workflow.globalContext, results)
        completedTasks.add(task.id)
        this.removeTaskFromQueue(taskQueue, task.id)
      }

      // Execute parallel tasks concurrently
      if (parallelTasks.length > 0) {
        const parallelResults = await Promise.allSettled(
          parallelTasks.map(task => 
            this.executeTask(task, workflow.globalContext, results)
          )
        )

        parallelTasks.forEach((task, index) => {
          const result = parallelResults[index]
          if (result.status === 'fulfilled') {
            results[task.id] = result.value
            completedTasks.add(task.id)
          } else {
            results[task.id] = { error: result.reason }
            // Handle error based on task configuration
          }
          this.removeTaskFromQueue(taskQueue, task.id)
        })
      }

      // Execute conditional tasks
      for (const task of conditionalTasks) {
        if (this.evaluateCondition(task.condition!, results, workflow.globalContext)) {
          results[task.id] = await this.executeTask(task, workflow.globalContext, results)
        } else {
          results[task.id] = { skipped: true, reason: 'Condition not met' }
        }
        completedTasks.add(task.id)
        this.removeTaskFromQueue(taskQueue, task.id)
      }
    }

    return results
  }

  /**
   * Execute a single agent task
   */
  private async executeTask(
    task: AgentTask, 
    globalContext: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    console.log(`🎯 Executing task: ${task.id} with agent: ${task.agentId}`)
    
    task.status = 'running'
    task.startedAt = new Date()

    const combinedContext = {
      ...globalContext,
      previousResults,
      taskId: task.id,
      timestamp: new Date().toISOString()
    }

    let retries = 0
    while (retries < task.maxRetries) {
      try {
        const result = await Promise.race([
          this.agentManager.executeAgent(task.agentId, task.prompt, {
            sessionId: `workflow_${Date.now()}`,
            variables: combinedContext,
            metadata: { taskId: task.id, attempt: retries + 1 },
            userId: 'system',
            organizationId: 'workflow'
          }),
          this.createTimeoutPromise(task.timeout)
        ])

        task.status = 'completed'
        task.completedAt = new Date()
        task.result = result
        
        console.log(`✅ Task completed: ${task.id}`)
        return result
      } catch (error) {
        retries++
        console.warn(`⚠️ Task ${task.id} failed (attempt ${retries}/${task.maxRetries}):`, error)
        
        if (retries >= task.maxRetries) {
          task.status = 'failed'
          task.error = error instanceof Error ? error.message : String(error)
          task.completedAt = new Date()
          throw error
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
      }
    }
  }

  /**
   * Enable agent-to-agent communication
   */
  async sendAgentMessage(
    fromAgentId: string,
    toAgentId: string,
    message: string,
    context: Record<string, any> = {}
  ): Promise<any> {
    console.log(`💬 Agent ${fromAgentId} → Agent ${toAgentId}: ${message}`)
    
    const communication: AgentCommunication = {
      from: fromAgentId,
      to: toAgentId,
      message,
      context,
      timestamp: new Date(),
      type: 'request'
    }

    // Store communication history
    const historyKey = `${fromAgentId}_${toAgentId}`
    if (!this.communicationHistory.has(historyKey)) {
      this.communicationHistory.set(historyKey, [])
    }
    this.communicationHistory.get(historyKey)!.push(communication)

    // Execute the receiving agent with the message
    const response = await this.agentManager.executeAgent(toAgentId, message, {
      sessionId: `agent_comm_${Date.now()}`,
      variables: { ...context, fromAgent: fromAgentId },
      metadata: { communicationType: 'agent-to-agent' },
      userId: 'system',
      organizationId: 'communication'
    })

    // Store response
    const responseComm: AgentCommunication = {
      from: toAgentId,
      to: fromAgentId,
      message: response.content || JSON.stringify(response),
      context: response,
      timestamp: new Date(),
      type: 'response'
    }
    this.communicationHistory.get(historyKey)!.push(responseComm)

    return response
  }

  /**
   * Route requests to appropriate agents based on intent
   */
  async routeRequest(
    userRequest: string,
    availableAgents: string[],
    context: Record<string, any> = {}
  ): Promise<{ selectedAgent: string; confidence: number; reasoning: string }> {
    console.log(`🧭 Routing request to best agent from: ${availableAgents.join(', ')}`)
    
    // Use a coordinator agent to determine the best agent for the task
    const routingPrompt = `
      Analyze this user request and determine which agent is best suited to handle it.
      
      User Request: "${userRequest}"
      
      Available Agents: ${availableAgents.map(id => `- ${id}`).join('\n')}
      
      Context: ${JSON.stringify(context, null, 2)}
      
      Respond with JSON:
      {
        "selectedAgent": "agent_id",
        "confidence": 0.95,
        "reasoning": "Explanation of why this agent was selected"
      }
    `

    try {
      // Use GPT-4 for routing decisions (assuming you have a routing agent)
      const routingResult = await this.agentManager.executeAgent(
        'routing_agent',
        routingPrompt,
        {
          sessionId: `routing_${Date.now()}`,
          variables: context,
          metadata: { type: 'routing' },
          userId: 'system',
          organizationId: 'routing'
        }
      )

      return JSON.parse(routingResult.content || routingResult)
    } catch {
      // Fallback to first available agent
      return {
        selectedAgent: availableAgents[0],
        confidence: 0.5,
        reasoning: 'Fallback selection due to parsing error'
      }
    }
  }

  /**
   * Get communication history between agents
   */
  getCommunicationHistory(agentId1: string, agentId2: string): AgentCommunication[] {
    const key1 = `${agentId1}_${agentId2}`
    const key2 = `${agentId2}_${agentId1}`
    
    const history1 = this.communicationHistory.get(key1) || []
    const history2 = this.communicationHistory.get(key2) || []
    
    return [...history1, ...history2].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): AgentWorkflow | null {
    return this.runningWorkflows.get(workflowId) || null
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.runningWorkflows.get(workflowId)
    if (workflow) {
      workflow.status = 'cancelled'
      workflow.updatedAt = new Date()
      this.runningWorkflows.delete(workflowId)
      console.log(`🛑 Workflow cancelled: ${workflow.name}`)
      return true
    }
    return false
  }

  // Helper methods
  private getReadyTasks(taskQueue: AgentTask[], completedTasks: Set<string>): AgentTask[] {
    return taskQueue.filter(task => {
      if (!task.dependencies) return true
      return task.dependencies.every(depId => completedTasks.has(depId))
    })
  }

  private removeTaskFromQueue(taskQueue: AgentTask[], taskId: string): void {
    const index = taskQueue.findIndex(t => t.id === taskId)
    if (index !== -1) {
      taskQueue.splice(index, 1)
    }
  }

  private evaluateCondition(
    condition: string,
    results: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression parser
      const evalContext = { ...results, ...context }
      // For safety, this would need a proper sandboxed evaluation
      return Function(`"use strict"; const context = arguments[0]; return ${condition}`)(evalContext)
    } catch {
      return false
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout)
    })
  }
}