import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from '@/lib/supabase/services'
import { oauthCallbackSchema } from '@/lib/validations/integration.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } } // ✅ Fixed: specific type for dynamic route
): Promise<NextResponse> {
  try {
    const provider = params.provider // ✅ No casting needed now
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const validatedParams = oauthCallbackSchema.parse({
      code: searchParams.get('code'),
      state: searchParams.get('state'),
      provider,
    })

    // Get user's current organization from state
    const stateData = JSON.parse(
      Buffer.from(validatedParams.state, 'base64').toString()
    )
    const { organizationId } = stateData

    // Exchange code for tokens (provider-specific logic)
    const { data: tokens, error: tokenError } = await supabase.functions.invoke(
      `oauth-${provider}`,
      {
        body: { code: validatedParams.code },
      }
    )

    if (tokenError) {
      throw tokenError
    }

    // Store the integration
    const service = new IntegrationService(supabase)

    const existing = await service.findByOrganizationAndProvider(
      organizationId,
      provider
    )

    if (existing) {
      await service.updateStatus(existing.id, 'connected')
      await service.storeCredentials(existing.id, tokens)
    } else {
      await service.create({
        organization_id: organizationId,
        user_id: user.id,
        provider,
        status: 'connected',
        credentials: tokens,
      })
    }

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL(`/integrations?success=${provider}`, request.url)
    )
  } catch (error: any) {
    console.error('OAuth callback error:', error)

    // Redirect to integrations page with error message
    return NextResponse.redirect(
      new URL(`/integrations?error=${params.provider}`, request.url)
    )
  }
}