'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SocialLogin } from '@/components/auth/social-login'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginForm) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Login attempt:', values)
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/dashboard')
    } catch (err) {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`${provider} login`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/dashboard')
    } catch (err) {
      setError(`Failed to sign in with ${provider}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>
        <ThemeToggle variant="icon" />
      </div>

      {/* Login Card */}
      <Card className="shadow-xl border-0 bg-card">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl text-card-foreground">Sign In</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose your preferred sign in method
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Social Login */}
          <SocialLogin
            onGoogleLogin={() => handleSocialLogin('Google')}
            onGitHubLogin={() => handleSocialLogin('GitHub')}
            onMicrosoftLogin={() => handleSocialLogin('Microsoft')}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-card-foreground">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                        className="h-11 bg-background text-foreground"
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
                    <FormLabel className="text-card-foreground">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          {...field}
                          className="h-11 bg-background text-foreground pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Demo credentials */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-card-foreground">Demo Credentials</p>
            <div className="text-xs text-muted-foreground">
              <p>Email: demo@example.com</p>
              <p>Password: demo123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}