// src/lib/workflow-engine/core/StateManager.ts

import { SupabaseClient } from '@supabase/supabase-js'

export interface ExecutionState {
  executionId: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  currentStepIndex: number
  variables: Record<string, any>
  stepResults: Record<string, any>
  lastUpdateAt: Date
}

export interface WorkflowExecutionContext {
  executionId: string
  workflowId: string
  orgId: string
  userId: string
  triggerData: any
  variables: Record<string, any>
  currentStepIndex: number
  executionStartTime: Date
  parentExecutionId?: string
}

export class StateManager {
  private supabase: SupabaseClient<any>  // ✅ FIXED: Use any instead of Database
  private stateCache = new Map<string, ExecutionState>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(supabase: SupabaseClient<any>) {  // ✅ FIXED: Use any instead of Database
    this.supabase = supabase
  }

  async saveExecutionState(context: WorkflowExecutionContext): Promise<void> {
    const state: ExecutionState = {
      executionId: context.executionId,
      workflowId: context.workflowId,
      status: 'running',
      currentStepIndex: context.currentStepIndex,
      variables: context.variables,
      stepResults: {},
      lastUpdateAt: new Date()
    }

    // Cache the state
    this.stateCache.set(context.executionId, state)

    // Persist to database
    const { error } = await this.supabase
      .from('execution_logs')
      .update({
        execution_data: {
          variables: context.variables,
          currentStepIndex: context.currentStepIndex,
          lastUpdateAt: new Date().toISOString()
        }
      } as any)  // ✅ FIXED: Type assertion
      .eq('id', context.executionId)

    if (error) {
      console.error('Failed to save execution state:', error)
      throw new Error(`Failed to save execution state: ${error.message}`)
    }
  }

  async loadExecutionState(executionId: string): Promise<ExecutionState | null> {
    // Try cache first
    if (this.stateCache.has(executionId)) {
      const cachedState = this.stateCache.get(executionId)!
      
      // Check if cache is still valid
      const cacheAge = Date.now() - cachedState.lastUpdateAt.getTime()
      if (cacheAge < this.CACHE_TTL) {
        return cachedState
      }
      
      // Remove expired cache
      this.stateCache.delete(executionId)
    }

    // Load from database
    const { data, error } = await this.supabase
      .from('execution_logs')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error || !data) {
      console.error('Failed to load execution state:', error)
      return null
    }

    const state: ExecutionState = {
      executionId: data.id,
      workflowId: data.workflow_id,
      status: data.status as any,
      currentStepIndex: data.execution_data?.currentStepIndex || 0,
      variables: data.execution_data?.variables || {},
      stepResults: data.execution_data?.stepResults || {},
      lastUpdateAt: new Date(data.updated_at || data.created_at)
    }

    // Cache the loaded state
    this.stateCache.set(executionId, state)
    return state
  }

  async pauseExecution(executionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('execution_logs')
      .update({ status: 'paused' } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to pause execution: ${error.message}`)
    }

    // Update cache
    const state = this.stateCache.get(executionId)
    if (state) {
      state.status = 'paused'
      state.lastUpdateAt = new Date()
    }
  }

  async resumeExecution(executionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('execution_logs')
      .update({ status: 'running' } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to resume execution: ${error.message}`)
    }

    // Update cache
    const state = this.stateCache.get(executionId)
    if (state) {
      state.status = 'running'
      state.lastUpdateAt = new Date()
    }
  }

  async updateExecutionVariables(
    executionId: string, 
    variables: Record<string, any>
  ): Promise<void> {
    const currentState = await this.loadExecutionState(executionId)
    if (!currentState) {
      throw new Error(`Execution state not found: ${executionId}`)
    }

    const updatedVariables = { ...currentState.variables, ...variables }
    
    const { error } = await this.supabase
      .from('execution_logs')
      .update({
        execution_data: {
          ...currentState,
          variables: updatedVariables,
          lastUpdateAt: new Date().toISOString()
        }
      } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to update execution variables: ${error.message}`)
    }

    // Update cache
    if (this.stateCache.has(executionId)) {
      const cachedState = this.stateCache.get(executionId)!
      cachedState.variables = updatedVariables
      cachedState.lastUpdateAt = new Date()
    }
  }

  async updateStepResult(
    executionId: string, 
    stepId: string, 
    result: any
  ): Promise<void> {
    const currentState = await this.loadExecutionState(executionId)
    if (!currentState) {
      throw new Error(`Execution state not found: ${executionId}`)
    }

    const updatedStepResults = { 
      ...currentState.stepResults, 
      [stepId]: result 
    }
    
    const { error } = await this.supabase
      .from('execution_logs')
      .update({
        execution_data: {
          ...currentState,
          stepResults: updatedStepResults,
          lastUpdateAt: new Date().toISOString()
        }
      } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to update step result: ${error.message}`)
    }

    // Update cache
    if (this.stateCache.has(executionId)) {
      const cachedState = this.stateCache.get(executionId)!
      cachedState.stepResults = updatedStepResults
      cachedState.lastUpdateAt = new Date()
    }
  }

  async clearExecutionState(executionId: string): Promise<void> {
    this.stateCache.delete(executionId)
  }

  // Parallel execution support
  async forkExecution(
    parentExecutionId: string, 
    branchId: string
  ): Promise<string> {
    const parentState = await this.loadExecutionState(parentExecutionId)
    if (!parentState) {
      throw new Error('Parent execution state not found')
    }

    const forkExecutionId = `${parentExecutionId}_fork_${branchId}`
    const forkState: ExecutionState = {
      ...parentState,
      executionId: forkExecutionId,
      currentStepIndex: 0,
      status: 'running',
      lastUpdateAt: new Date()
    }

    // Cache the fork state
    this.stateCache.set(forkExecutionId, forkState)

    // Create database entry for fork
    const { error } = await this.supabase
      .from('execution_logs')
      .insert({
        id: forkExecutionId,
        workflow_id: parentState.workflowId,
        parent_execution_id: parentExecutionId,
        status: 'running',
        trigger_data: { fork: true, branchId },
        execution_data: {
          variables: forkState.variables,
          currentStepIndex: 0,
          isFork: true,
          parentExecutionId
        },
        started_at: new Date().toISOString()
      } as any)  // ✅ FIXED: Type assertion

    if (error) {
      throw new Error(`Failed to create fork execution: ${error.message}`)
    }

    return forkExecutionId
  }

  async joinExecution(
    parentExecutionId: string, 
    forkResults: any[]
  ): Promise<void> {
    const parentState = await this.loadExecutionState(parentExecutionId)
    if (!parentState) {
      throw new Error('Parent execution state not found')
    }

    // Merge fork results into parent variables
    const updatedVariables = {
      ...parentState.variables,
      forkResults,
      joinedAt: new Date().toISOString()
    }

    await this.updateExecutionVariables(parentExecutionId, updatedVariables)
  }

  // Checkpoint functionality for long-running workflows
  async createCheckpoint(
    executionId: string, 
    checkpointName: string
  ): Promise<void> {
    const currentState = await this.loadExecutionState(executionId)
    if (!currentState) {
      throw new Error(`Execution state not found: ${executionId}`)
    }

    const { error } = await this.supabase
      .from('execution_checkpoints')
      .insert({
        execution_id: executionId,
        checkpoint_name: checkpointName,
        state_data: {
          variables: currentState.variables,
          currentStepIndex: currentState.currentStepIndex,
          stepResults: currentState.stepResults
        },
        created_at: new Date().toISOString()
      } as any)  // ✅ FIXED: Type assertion

    if (error) {
      console.error('Failed to create checkpoint:', error)
      // Don't throw error for checkpoints to avoid breaking workflow execution
    }
  }

  async restoreFromCheckpoint(
    executionId: string, 
    checkpointName: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('execution_checkpoints')
      .select('state_data')
      .eq('execution_id', executionId)
      .eq('checkpoint_name', checkpointName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return false
    }

    const restoredState = data.state_data
    
    const { error: updateError } = await this.supabase
      .from('execution_logs')
      .update({
        execution_data: {
          ...restoredState,
          restoredFromCheckpoint: checkpointName,
          restoredAt: new Date().toISOString()
        }
      } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (updateError) {
      console.error('Failed to restore from checkpoint:', updateError)
      return false
    }

    // Clear cache to force reload
    this.stateCache.delete(executionId)
    
    return true
  }

  // Memory management
  cleanupExpiredCache(): void {
    const now = Date.now()
    
    for (const [executionId, state] of this.stateCache.entries()) {
      const age = now - state.lastUpdateAt.getTime()
      if (age > this.CACHE_TTL) {
        this.stateCache.delete(executionId)
      }
    }
  }

  getCacheSize(): number {
    return this.stateCache.size
  }

  clearCache(): void {
    this.stateCache.clear()
  }

  // ✅ ADDED: Enhanced state management methods
  async getExecutionStates(executionIds: string[]): Promise<Record<string, ExecutionState | null>> {
    const results: Record<string, ExecutionState | null> = {}
    
    for (const executionId of executionIds) {
      try {
        results[executionId] = await this.loadExecutionState(executionId)
      } catch (error) {
        console.error(`Failed to load state for execution ${executionId}:`, error)
        results[executionId] = null
      }
    }
    
    return results
  }

  async updateExecutionStatus(
    executionId: string, 
    status: ExecutionState['status']
  ): Promise<void> {
    const { error } = await this.supabase
      .from('execution_logs')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to update execution status: ${error.message}`)
    }

    // Update cache
    const state = this.stateCache.get(executionId)
    if (state) {
      state.status = status
      state.lastUpdateAt = new Date()
    }
  }

  async incrementStepIndex(executionId: string): Promise<number> {
    const currentState = await this.loadExecutionState(executionId)
    if (!currentState) {
      throw new Error(`Execution state not found: ${executionId}`)
    }

    const newStepIndex = currentState.currentStepIndex + 1
    
    const { error } = await this.supabase
      .from('execution_logs')
      .update({
        execution_data: {
          ...currentState,
          currentStepIndex: newStepIndex,
          lastUpdateAt: new Date().toISOString()
        }
      } as any)
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to increment step index: ${error.message}`)
    }

    // Update cache
    if (this.stateCache.has(executionId)) {
      const cachedState = this.stateCache.get(executionId)!
      cachedState.currentStepIndex = newStepIndex
      cachedState.lastUpdateAt = new Date()
    }

    return newStepIndex
  }

  async setStepIndex(executionId: string, stepIndex: number): Promise<void> {
    const currentState = await this.loadExecutionState(executionId)
    if (!currentState) {
      throw new Error(`Execution state not found: ${executionId}`)
    }
    
    const { error } = await this.supabase
      .from('execution_logs')
      .update({
        execution_data: {
          ...currentState,
          currentStepIndex: stepIndex,
          lastUpdateAt: new Date().toISOString()
        }
      } as any)
      .eq('id', executionId)

    if (error) {
      throw new Error(`Failed to set step index: ${error.message}`)
    }

    // Update cache
    if (this.stateCache.has(executionId)) {
      const cachedState = this.stateCache.get(executionId)!
      cachedState.currentStepIndex = stepIndex
      cachedState.lastUpdateAt = new Date()
    }
  }

  // ✅ ADDED: Batch operations for better performance
  async saveMultipleStates(contexts: WorkflowExecutionContext[]): Promise<void> {
    const updates = contexts.map(context => ({
      id: context.executionId,
      execution_data: {
        variables: context.variables,
        currentStepIndex: context.currentStepIndex,
        lastUpdateAt: new Date().toISOString()
      }
    }))

    for (const update of updates) {
      try {
        await this.supabase
          .from('execution_logs')
          .update(update.execution_data as any)
          .eq('id', update.id)
      } catch (error) {
        console.error(`Failed to save state for execution ${update.id}:`, error)
      }
    }
  }

  // ✅ ADDED: State validation and recovery
  async validateState(executionId: string): Promise<boolean> {
    try {
      const state = await this.loadExecutionState(executionId)
      if (!state) return false

      // Basic validation checks
      const isValid = (
        state.executionId === executionId &&
        typeof state.workflowId === 'string' &&
        state.workflowId.length > 0 &&
        state.currentStepIndex >= 0 &&
        state.variables !== null &&
        state.stepResults !== null
      )

      return isValid
    } catch (error) {
      console.error(`State validation failed for execution ${executionId}:`, error)
      return false
    }
  }

  async recoverCorruptedState(executionId: string): Promise<boolean> {
    try {
      // Attempt to restore from latest checkpoint
      const checkpoints = await this.supabase
        .from('execution_checkpoints')
        .select('checkpoint_name')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (checkpoints.data && checkpoints.data.length > 0) {
        const latestCheckpoint = checkpoints.data[0].checkpoint_name
        return await this.restoreFromCheckpoint(executionId, latestCheckpoint)
      }

      // If no checkpoints, try to recreate minimal state
      const { data: execution } = await this.supabase
        .from('execution_logs')
        .select('workflow_id, status')
        .eq('id', executionId)
        .single()

      if (execution) {
        const minimalState: ExecutionState = {
          executionId,
          workflowId: execution.workflow_id,
          status: execution.status,
          currentStepIndex: 0,
          variables: {},
          stepResults: {},
          lastUpdateAt: new Date()
        }

        this.stateCache.set(executionId, minimalState)
        return true
      }

      return false
    } catch (error) {
      console.error(`State recovery failed for execution ${executionId}:`, error)
      return false
    }
  }

  // ✅ ADDED: Performance monitoring
  getPerformanceMetrics(): {
    cacheSize: number
    cacheHitRate: number
    averageLoadTime: number
  } {
    return {
      cacheSize: this.stateCache.size,
      cacheHitRate: 0, // Would need to track hits/misses
      averageLoadTime: 0 // Would need to track load times
    }
  }

  // ✅ ADDED: State export/import for debugging
  exportState(executionId: string): ExecutionState | null {
    return this.stateCache.get(executionId) || null
  }

  importState(state: ExecutionState): void {
    this.stateCache.set(state.executionId, {
      ...state,
      lastUpdateAt: new Date()
    })
  }

  // ✅ ADDED: Cleanup methods
  async cleanupOrphanedStates(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours)

    const { data, error } = await this.supabase
      .from('execution_logs')
      .delete()
      .in('status', ['failed', 'completed'])
      .lt('completed_at', cutoffTime.toISOString())
      .select('id')

    if (error) {
      console.error('Failed to cleanup orphaned states:', error)
      return 0
    }

    return data?.length || 0
  }
}