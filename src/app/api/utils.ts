// src/lib/api/utils.ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PostgrestError } from '@supabase/supabase-js'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.issues.map((e: any) => ({
          // Use 'issues' not 'errors'
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    )
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase/Postgres errors
  if (isPostgrestError(error)) {
    const statusCode = getPostgrestErrorStatus(error)
    return NextResponse.json(
      {
        error: error.message || 'Database error',
        code: error.code,
      },
      { status: statusCode }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }

  // Fallback for unknown errors
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
    },
    { status: 500 }
  )
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

function getPostgrestErrorStatus(error: PostgrestError): number {
  // Map Postgres error codes to HTTP status codes
  switch (error.code) {
    case '23505': // unique_violation
      return 409
    case '23503': // foreign_key_violation
      return 400
    case '23502': // not_null_violation
      return 400
    case '22P02': // invalid_text_representation
      return 400
    case 'PGRST116': // not found
      return 404
    case 'PGRST301': // JWT expired
      return 401
    case 'PGRST302': // JWT invalid
      return 401
    default:
      return 500
  }
}

export async function withAuth<T>(
  handler: (user: any) => Promise<T>,
  supabase: any
): Promise<T> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new ApiError('Unauthorized', 401)
  }

  return handler(user)
}

export async function withOrganization<T>(
  handler: (user: any, organizationId: string) => Promise<T>,
  supabase: any
): Promise<T> {
  return withAuth(async user => {
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (error || !membership) {
      throw new ApiError('No organization found', 404)
    }

    return handler(user, membership.organization_id)
  }, supabase)
}

export async function withPermission<T>(
  handler: (user: any, organizationId: string, role: string) => Promise<T>,
  supabase: any,
  requiredRole: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
): Promise<T> {
  return withAuth(async user => {
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (error || !membership) {
      throw new ApiError('No organization found', 404)
    }

    // Check role hierarchy
    const roleHierarchy = ['owner', 'admin', 'member', 'viewer']
    const userRoleIndex = roleHierarchy.indexOf(membership.role)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

    if (userRoleIndex > requiredRoleIndex) {
      throw new ApiError('Insufficient permissions', 403)
    }

    return handler(user, membership.organization_id, membership.role)
  }, supabase)
}

// Pagination helpers
export interface PaginationParams {
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export function getPaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  return {
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
    orderBy: searchParams.get('orderBy') || 'created_at',
    order: (searchParams.get('order') || 'desc') as 'asc' | 'desc',
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / (params.limit || 20))
  const currentPage = params.page || 1

  return {
    data,
    pagination: {
      page: currentPage,
      limit: params.limit || 20,
      total,
      totalPages,
      hasMore: currentPage < totalPages,
    },
  }
}

// Rate limiting helper
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)

  if (!record || record.resetAt < now) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

// API response helpers
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status })
}

export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  )
}
