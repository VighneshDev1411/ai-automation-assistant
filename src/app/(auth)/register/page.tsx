// src/app/(auth)/register/page.tsx - Updated with confirmation handling
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Sparkles, Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react'
import { FaGoogle, FaGithub, FaMicrosoft } from 'react-icons/fa'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, signInWithProvider } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await signUp(values.email, values.password, {
        full_name: values.fullName,
      })
      
      if (result.needsConfirmation) {
        setEmailConfirmationSent(true)
        setRegisteredEmail(values.email)
      } else {
        // User was signed in immediately (shouldn't happen with current config)
        router.push('/onboarding')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleProviderSignUp(provider: 'google' | 'github' | 'azure') {
    try {
      setIsLoading(true)
      setError(null)
      await signInWithProvider(provider)
    } catch (error: any) {
      setError(error.message || `Failed to sign up with ${provider}`)
      setIsLoading(false)
    }
  }

  // Show email confirmation screen
  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-card">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-card-foreground">
                  Check your email
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  We've sent a confirmation link to your email address
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  A confirmation email has been sent to <strong>{registeredEmail}</strong>. 
                  Please click the link in the email to activate your account.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>After confirming your email, you'll be able to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Access your dashboard</li>
                  <li>Create and manage workflows</li>
                  <li>Set up integrations</li>
                  <li>Collaborate with your team</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Didn't receive the email?</strong> Check your spam folder or 
                  contact support if you need help.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailConfirmationSent(false)
                  setRegisteredEmail('')
                  form.reset()
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Registration
              </Button>
              
              <div className="text-center">
                <Link 
                  href="/login" 
                  className="text-sm text-primary hover:underline"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  // Regular registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-muted-foreground">Join thousands of teams automating their workflows</p>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        {/* Registration Card */}
        <Card className="shadow-xl border-0 bg-card">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl text-card-foreground">
              Get Started Free
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Create your account in seconds
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Providers */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => handleProviderSignUp('google')}
                disabled={isLoading}
                className="hover-lift"
              >
                <FaGoogle className="h-4 w-4" />
                <span className="sr-only">Google</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleProviderSignUp('github')}
                disabled={isLoading}
                className="hover-lift"
              >
                <FaGithub className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleProviderSignUp('azure')}
                disabled={isLoading}
                className="hover-lift"
              >
                <FaMicrosoft className="h-4 w-4" />
                <span className="sr-only">Microsoft</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a strong password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          I agree to the{' '}
                          <Link href="/terms" className="text-primary hover:underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full hover-lift"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}