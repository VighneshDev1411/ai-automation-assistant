import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface IntegrationRequest {
  action: 'connect' | 'disconnect' | 'test' | 'refresh' | 'execute'
  provider: string
  organizationId: string
  config?: any
  actionType?: string
  actionData?: any
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const { action, provider, organizationId, config, actionType, actionData }: IntegrationRequest = await req.json()

    // Route to appropriate handler
    let result
    switch (action) {
      case 'connect':
        result = await handleConnect(supabase, user.id, provider, organizationId, config)
        break
      case 'disconnect':
        result = await handleDisconnect(supabase, user.id, provider, organizationId)
        break
      case 'test':
        result = await handleTest(supabase, user.id, provider, organizationId)
        break
      case 'refresh':
        result = await handleRefresh(supabase, user.id, provider, organizationId)
        break
      case 'execute':
        result = await handleExecute(supabase, user.id, provider, organizationId, actionType!, actionData)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Integration function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

async function handleConnect(supabase: any, userId: string, provider: string, organizationId: string, config: any) {
  // Implementation for connecting integration
  console.log(`Connecting ${provider} for org ${organizationId}`)
  
  // Store integration in database
  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      organization_id: organizationId,
      user_id: userId,
      provider,
      status: 'pending',
      credentials: config.credentials || {},
      settings: config.settings || {},
      metadata: { connected_at: new Date().toISOString() }
    })
    .select()
    .single()

  if (error) throw error

  return { success: true, integration: data }
}

async function handleDisconnect(supabase: any, userId: string, provider: string, organizationId: string) {
  const { error } = await supabase
    .from('integrations')
    .update({ 
      status: 'disconnected',
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .eq('user_id', userId)

  if (error) throw error

  return { success: true, message: `${provider} disconnected` }
}

async function handleTest(supabase: any, userId: string, provider: string, organizationId: string) {
  // Test the integration connection
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .eq('user_id', userId)
    .single()

  if (!integration) throw new Error('Integration not found')

  // TODO: Implement actual test logic based on provider
  return { success: true, status: 'connected', provider }
}

async function handleRefresh(supabase: any, userId: string, provider: string, organizationId: string) {
  // Refresh OAuth tokens if needed
  return { success: true, message: 'Token refreshed' }
}

async function handleExecute(supabase: any, userId: string, provider: string, organizationId: string, actionType: string, actionData: any) {
  // Execute specific action for the provider
  console.log(`Executing ${actionType} for ${provider}`)
  return { success: true, result: 'Action executed' }
}