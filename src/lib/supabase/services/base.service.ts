import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export abstract class BaseService<T extends keyof Database['public']['Tables']> {
  protected supabase: SupabaseClient<Database>
  protected tableName: T

  constructor(supabase: SupabaseClient<Database>, tableName: T) {
    this.supabase = supabase
    this.tableName = tableName
  }

  async findAll(options?: {
    select?: string
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
  }) {
    let query = this.supabase.from(this.tableName).select(options?.select || '*')

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      })
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async findById(id: string, select?: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(select || '*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async create(payload: Database['public']['Tables'][T]['Insert']) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, payload: Database['public']['Tables'][T]['Update']) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  async count(filter?: Record<string, any>) {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { count, error } = await query

    if (error) throw error
    return count || 0
  }
}