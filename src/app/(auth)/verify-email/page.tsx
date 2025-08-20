'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThemeToggle } from '@/components/common/theme-toggle'
import {
  Mail,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

function VerifyEmailContent() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      )
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true)
    setError(null)

    try {
      // TODO: Implement actual email verification with Supabase
      console.log('Verifying email with token:', verificationToken)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simulate success
      setIsVerified(true)

      // Redirect to onboarding after 2 seconds
      setTimeout(() => {
        router.push('/onboarding')
      }, 2000)
    } catch (err) {
      setError(
        'Invalid or expired verification link. Please request a new one.'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const resendVerificationEmail = async () => {
    setResendLoading(true)
    setError(null)

    try {
      // TODO: Implement resend verification email with Supabase
      console.log('Resending verification email to:', email)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      setResendCooldown(60) // 1 minute cooldown
    } catch (err) {
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Verifying your email</h2>
              <p className="text-muted-foreground mt-2">
                Please wait while we verify your account...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Email verified!</h2>
              <p className="text-muted-foreground mt-2">
                Your account has been successfully verified. Redirecting to
                onboarding...
              </p>
            </div>
            <div className="animate-pulse">
              <div className="w-8 h-1 bg-primary rounded-full mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <Link
            href="/login"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
          <ThemeToggle variant="icon" />
        </div>

        <Card className="glass-card">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We've sent a verification link to{' '}
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in the email to verify your account and get
                started.
              </p>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?
                </p>
                <Button
                  variant="outline"
                  onClick={resendVerificationEmail}
                  disabled={resendLoading || resendCooldown > 0}
                  className="w-full"
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend verification email'}
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Check your spam folder if you don't see the email
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
