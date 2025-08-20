import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from '@/lib/supabase/services'
import { oauthCallbackSchema } from '@/lib/validations/integration.schema' 

export async function GET(
  request: NextRequest,
  context: { params: { provider: string } }   // 👈 inline type, not custom interface
): Promise<NextResponse> {
  const { params } = context
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const validatedParams = oauthCallbackSchema.parse({
      code: searchParams.get('code'),
      state: searchParams.get('state'),
      provider: params.provider,
    })

    const stateData = JSON.parse(
      Buffer.from(validatedParams.state, 'base64').toString()
    )
    const { organizationId } = stateData

    const { data: tokens, error: tokenError } = await supabase.functions.invoke(
      `oauth-${params.provider}`,
      {
        body: { code: validatedParams.code },
      }
    )

    if (tokenError) throw tokenError

    const service = new IntegrationService(supabase)
    const existing = await service.findByOrganizationAndProvider(
      organizationId,
      params.provider
    )

    if (existing) {
      await service.updateStatus(existing.id, 'connected')
      await service.storeCredentials(existing.id, tokens)
    } else {
      await service.create({
        organization_id: organizationId,
        user_id: user.id,
        provider: params.provider,
        status: 'connected',
        credentials: tokens,
      })
    }

    return NextResponse.redirect(
      new URL(`/integrations?success=${params.provider}`, request.url)
    )
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/integrations?error=${params.provider}`, request.url)
    )
  }
}
