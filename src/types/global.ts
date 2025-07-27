export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  organizationId: string
  createdAt: string
  updatedAt: string
}

export type UserRole = 'admin' | 'manager' | 'user' | 'developer'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  settings: OrganizationSettings
  createdAt: string
  updatedAt: string
}

export interface OrganizationSettings {
  allowInvites: boolean
  requireTwoFactor: boolean
  allowedDomains?: string[]
}

export interface Workflow {
  id: string
  name: string
  description?: string
  status: WorkflowStatus
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  conditions?: WorkflowCondition[]
  organizationId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error'

export interface WorkflowTrigger {
  type: 'webhook' | 'schedule' | 'manual' | 'email'
  config: Record<string, any>
}

export interface WorkflowAction {
  id: string
  type: string
  config: Record<string, any>
  position: { x: number; y: number }
}

export interface WorkflowCondition {
  id: string
  type: 'if' | 'filter' | 'branch'
  config: Record<string, any>
  position: { x: number; y: number }
}

export interface Integration {
  id: string
  name: string
  category: string
  icon: string
  description: string
  authType: 'oauth' | 'api_key' | 'basic'
  isConnected: boolean
  settings?: Record<string, any>
}

export interface ApiResponse<T = any> {
  data: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}