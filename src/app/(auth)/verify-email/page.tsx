// src/app/(auth)/verify-email/page.tsx
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

// Loading component for Suspense fallback
function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md glass-card">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main verify email component that uses useSearchParams
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="absolute top-4 left-4">
        <Button variant="ghost" asChild>
          <Link href="/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
        </Button>
      </div>

      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="status-icon-bg info w-16 h-16">
              {isVerifying ? (
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              ) : isVerified ? (
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              ) : error ? (
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              ) : (
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </div>

          <CardTitle className="text-2xl font-bold">
            {isVerifying
              ? 'Verifying Email...'
              : isVerified
              ? 'Email Verified!'
              : error
              ? 'Verification Failed'
              : 'Check Your Email'}
          </CardTitle>

          <CardDescription>
            {isVerifying
              ? 'Please wait while we verify your email address.'
              : isVerified
              ? 'Your email has been successfully verified. Redirecting you to onboarding...'
              : error
              ? 'There was a problem verifying your email address.'
              : `We've sent a verification link to ${email}. Click the link to verify your account.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isVerified && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Redirecting you to onboarding in a moment...
              </AlertDescription>
            </Alert>
          )}

          {!isVerifying && !isVerified && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or request a new one.
                </p>
              </div>

              <Button
                onClick={resendVerificationEmail}
                disabled={resendLoading || resendCooldown > 0}
                className="w-full"
                variant="outline"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {isVerified && (
            <div className="text-center">
              <Button asChild className="btn-shine">
                <Link href="/onboarding">
                  Continue to Onboarding
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Main page component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  )
}