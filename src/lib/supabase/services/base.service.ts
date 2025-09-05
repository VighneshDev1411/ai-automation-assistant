import { SupabaseClient } from '@supabase/supabase-js'

export abstract class BaseService<T extends string> {
  protected supabase: SupabaseClient<any>
  protected tableName: T

  constructor(supabase: SupabaseClient<any>, tableName: T) {
    this.supabase = supabase
    this.tableName = tableName
  }

  async findAll(options?: {
    select?: string
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
    filter?: Record<string, any>
  }) {
    let query = this.supabase.from(this.tableName).select(options?.select || '*')

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      })
    }

    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
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
      .eq('id', id as any)
      .single()

    if (error) throw error
    return data
  }

  async create(payload: Record<string, any>) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(payload as any)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, payload: Record<string, any>) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(payload as any)
      .eq('id', id as any)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id as any)

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