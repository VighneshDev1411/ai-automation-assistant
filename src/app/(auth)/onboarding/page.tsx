// src/app/(auth)/onboarding/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/common/theme-toggle'
import {
  User as UserIcon,
  Building,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  phone: z.string().optional(),
  timezone: z.string().min(1, 'Please select your timezone'),
})

const organizationSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationSlug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  organizationDescription: z.string().optional(),
})

const goalsSchema = z.object({
  primaryGoal: z.string().min(1, 'Please select your primary goal'),
  useCases: z.array(z.string()).min(1, 'Please select at least one use case'),
})

type PersonalInfo = z.infer<typeof personalInfoSchema>
type OrganizationInfo = z.infer<typeof organizationSchema>
type Goals = z.infer<typeof goalsSchema>

const steps = [
  { id: 1, name: 'Personal Info', icon: UserIcon },
  { id: 2, name: 'Organization', icon: Building },
  { id: 3, name: 'Goals', icon: Target },
]

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

const goals = [
  { value: 'automation', label: 'Automate repetitive tasks' },
  { value: 'integration', label: 'Connect my apps and services' },
  { value: 'ai-workflows', label: 'Build AI-powered workflows' },
  { value: 'team-collaboration', label: 'Improve team collaboration' },
  { value: 'data-sync', label: 'Sync data between platforms' },
  { value: 'other', label: 'Other' },
]

const useCases = [
  { value: 'sales', label: 'Sales automation' },
  { value: 'marketing', label: 'Marketing campaigns' },
  { value: 'customer-support', label: 'Customer support' },
  { value: 'hr', label: 'HR processes' },
  { value: 'data-processing', label: 'Data processing' },
  { value: 'content-generation', label: 'Content generation' },
  { value: 'analytics', label: 'Analytics & reporting' },
  { value: 'project-management', label: 'Project management' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, refreshProfile, loading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // ✅ Redirect if already onboarded — only after auth is settled
  useEffect(() => {
    if (!loading && profile?.onboarded) {
      router.replace('/dashboard')
    }
  }, [profile, loading, router])

  // ✅ Redirect to login only when auth is settled and user is definitely missing
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // If profile loads later, update form defaults once
  useEffect(() => {
    if (profile && user) {
      personalForm.reset({
        fullName: profile.full_name || user.user_metadata?.full_name || '',
        jobTitle: profile.job_title || '',
        phone: profile.phone || '',
        timezone: profile.timezone || 'UTC',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: profile?.full_name || user?.user_metadata?.full_name || '',
      jobTitle: profile?.job_title || '',
      phone: profile?.phone || '',
      timezone: profile?.timezone || 'UTC',
    },
  })

  const organizationForm = useForm<OrganizationInfo>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: '',
      organizationSlug: '',
      organizationDescription: '',
    },
  })

  const goalsForm = useForm<Goals>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      primaryGoal: '',
      useCases: [],
    },
  })

  // Auto-generate slug from org name
  useEffect(() => {
    const subscription = organizationForm.watch((value, { name }) => {
      if (name === 'organizationName' && value.organizationName) {
        const slug = value.organizationName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
        organizationForm.setValue('organizationSlug', slug)
      }
    })
    return () => subscription.unsubscribe()
  }, [organizationForm])

  const handlePersonalInfo = async (data: PersonalInfo) => {
    try {
      setIsLoading(true)
      setError(null)
      if (!user) throw new Error('User not found')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          job_title: data.jobTitle,
          phone: data.phone,
          timezone: data.timezone,
        })
        .eq('id', user.id)

      if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`)

      await refreshProfile()
      setCurrentStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOrganization = async (data: OrganizationInfo) => {
    try {
      setIsLoading(true)
      setError(null)
      if (!user) throw new Error('User not found')

      const { data: orgId, error: orgError } = await supabase
        .rpc('create_organization', {
          org_name: data.organizationName,
          org_slug: data.organizationSlug,
          org_description: data.organizationDescription || null,
        })

      if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`)

      await refreshProfile()
      setCurrentStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoals = async (data: Goals) => {
    try {
      setIsLoading(true)
      setError(null)
      if (!user) throw new Error('User not found')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferences: {
            primaryGoal: data.primaryGoal,
            useCases: data.useCases,
          },
          onboarded: true,
        })
        .eq('id', user.id)

      if (updateError) throw new Error(`Failed to save goals: ${updateError.message}`)

      await refreshProfile()
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to save goals')
    } finally {
      setIsLoading(false)
    }
  }

  // ⏳ Render spinner only while auth is initializing. Do NOT block on profile === null.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container max-w-2xl py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome to CogniFlow</h1>
            <p className="text-muted-foreground">Let's get your account set up</p>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                      ${
                        isCompleted
                          ? 'bg-primary border-primary text-primary-foreground'
                          : isCurrent
                          ? 'border-primary text-primary'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      }`}
                  >
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  )}
                </div>
              )
            })}
          </div>

          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{Math.round((currentStep / steps.length) * 100)}% complete</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Steps */}
        <Card className="glass-card">
          {/* Step 1 */}
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us a bit about yourself to personalize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...personalForm}>
                  <form onSubmit={personalForm.handleSubmit(handlePersonalInfo)} className="space-y-4">
                    <FormField name="fullName" control={personalForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField name="jobTitle" control={personalForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl><Input placeholder="Software Engineer" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField name="phone" control={personalForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField name="timezone" control={personalForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select your timezone" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {timezones.map((tz) => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<>Continue<ArrowRight className="ml-2 h-4 w-4" /></>)}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle>Create Your Organization</CardTitle>
                <CardDescription>Set up your workspace for team collaboration</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...organizationForm}>
                  <form onSubmit={organizationForm.handleSubmit(handleOrganization)} className="space-y-4">
                    <FormField name="organizationName" control={organizationForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField name="organizationSlug" control={organizationForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Slug</FormLabel>
                        <FormControl><Input placeholder="acme-inc" {...field} /></FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">This will be your organization's unique identifier</p>
                      </FormItem>
                    )}/>
                    <FormField name="organizationDescription" control={organizationForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Tell us about your organization..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} disabled={isLoading}>
                        <ArrowLeft className="mr-2 h-4 w-4" />Back
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : (<>Continue<ArrowRight className="ml-2 h-4 w-4" /></>)}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle>What's Your Primary Goal?</CardTitle>
                <CardDescription>Help us customize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...goalsForm}>
                  <form onSubmit={goalsForm.handleSubmit(handleGoals)} className="space-y-6">
                    <FormField name="primaryGoal" control={goalsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Goal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select your main goal" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {goals.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField name="useCases" control={goalsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Use Cases (Select all that apply)</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {useCases.map((u) => (
                            <Button
                              key={u.value}
                              type="button"
                              variant={field.value.includes(u.value) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                const next = field.value.includes(u.value)
                                  ? field.value.filter(v => v !== u.value)
                                  : [...field.value, u.value]
                                field.onChange(next)
                              }}
                              className="justify-start"
                            >
                              {u.label}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} disabled={isLoading}>
                        <ArrowLeft className="mr-2 h-4 w-4" />Back
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finishing...</>) : (<>Complete Setup<CheckCircle className="ml-2 h-4 w-4" /></>)}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
