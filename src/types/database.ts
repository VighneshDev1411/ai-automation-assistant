export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          job_title: string | null
          phone: string | null
          timezone: string
          preferences: any
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['profiles']['Row'],
          'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          settings: any
          subscription_tier: string
          subscription_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['organizations']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      workflows: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string
          created_by: string
          status: 'draft' | 'active' | 'paused' | 'archived'
          trigger_config: any
          actions: any[]
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['workflows']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['workflows']['Insert']>
      }
      integrations: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          provider: string
          status: 'connected' | 'disconnected' | 'error' | 'pending'
          credentials: any
          settings: any
          error_message: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          user_id: string
          provider: string
          status: 'connected' | 'disconnected' | 'error' | 'pending'
          credentials: any
          settings?: any
          error_message?: string | null
          last_synced_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>
      }
      execution_logs: {
        Row: {
          id: string
          workflow_id: string
          trigger_data: any
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          logs: any[]
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['execution_logs']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['execution_logs']['Insert']>
      }
    }
    Views: {}
    Functions: {
      create_organization: {
        Args: {
          org_name: string
          org_slug: string
          org_description?: string
        }
        Returns: string
      }
      check_organization_membership: {
        Args: {
          org_id: string
          user_id: string
          required_role?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'owner' | 'admin' | 'member' | 'viewer'
      workflow_status: 'draft' | 'active' | 'paused' | 'archived'
      execution_status:
        | 'pending'
        | 'running'
        | 'completed'
        | 'failed'
        | 'cancelled'
      integration_status: 'connected' | 'disconnected' | 'error' | 'pending'
      agent_type: 'conversational' | 'analytical' | 'task' | 'custom'
    }
  }
}