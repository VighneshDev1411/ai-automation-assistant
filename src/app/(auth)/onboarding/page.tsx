'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  User as UserIcon, 
  Building, 
  Target, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'

// Form schemas
const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string(),
})

const organizationSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationSlug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  organizationDescription: z.string().optional(),
})

const goalsSchema = z.object({
  primaryGoal: z.string().min(1, 'Please select a primary goal'),
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

  // Redirect if already onboarded
  useEffect(() => {
    if (!loading && profile?.onboarded) {
      router.replace('/dashboard')
    }
  }, [profile, loading, router])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: '',
      jobTitle: '',
      phone: '',
      timezone: 'UTC',
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

  // Update form defaults when profile loads
  useEffect(() => {
    if (profile && user) {
      personalForm.reset({
        fullName: profile.full_name || user.user_metadata?.full_name || '',
        jobTitle: profile.job_title || '',
        phone: profile.phone || '',
        timezone: profile.timezone || 'UTC',
      })
    }
  }, [profile?.id, user?.id, personalForm])

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
      
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          job_title: data.jobTitle || null,
          phone: data.phone || null,
          timezone: data.timezone,
        })
        .eq('id', user.id)

      if (error) throw error

      setCurrentStep(2)
    } catch (error: any) {
      console.error('Personal info update error:', error)
      setError(error.message || 'Failed to update personal information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOrganization = async (data: OrganizationInfo) => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!user) throw new Error('User not authenticated')

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.organizationName,
          slug: data.organizationSlug,
          description: data.organizationDescription || null,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Add user as owner of the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        })

      if (memberError) throw memberError

      setCurrentStep(3)
    } catch (error: any) {
      console.error('Organization creation error:', error)
      if (error.code === '23505') {
        setError('Organization slug already exists. Please choose a different one.')
      } else {
        setError(error.message || 'Failed to create organization')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoals = async (data: Goals) => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!user) throw new Error('User not authenticated')

      // Update profile with onboarding complete and goals
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarded: true,
          preferences: {
            primary_goal: data.primaryGoal,
            use_cases: data.useCases,
            onboarded_at: new Date().toISOString(),
          },
        })
        .eq('id', user.id)

      if (error) throw error

      // Refresh profile and redirect to dashboard
      await refreshProfile()
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Goals update error:', error)
      setError(error.message || 'Failed to complete onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to AI Automation Platform</h1>
          <p className="text-muted-foreground">Let's get you set up in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : currentStep > step.id
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].name}</CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Tell us a bit about yourself'}
              {currentStep === 2 && 'Set up your organization'}
              {currentStep === 3 && 'What would you like to achieve?'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <Form {...personalForm}>
                <form onSubmit={personalForm.handleSubmit(handlePersonalInfo)} className="space-y-4">
                  <FormField
                    control={personalForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={personalForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Product Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={personalForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timezones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Next Step
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 2: Organization */}
            {currentStep === 2 && (
              <Form {...organizationForm}>
                <form onSubmit={organizationForm.handleSubmit(handleOrganization)} className="space-y-4">
                  <FormField
                    control={organizationForm.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={organizationForm.control}
                    name="organizationSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Slug *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="acme-corp" 
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                              field.onChange(value)
                            }}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          This will be used in your URLs: platform.com/{field.value}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={organizationForm.control}
                    name="organizationDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of your organization..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Next Step
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Goals */}
            {currentStep === 3 && (
              <Form {...goalsForm}>
                <form onSubmit={goalsForm.handleSubmit(handleGoals)} className="space-y-6">
                  <FormField
                    control={goalsForm.control}
                    name="primaryGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What's your primary goal? *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your primary goal" />
                            </SelectTrigger>
                            <SelectContent>
                              {goals.map((goal) => (
                                <SelectItem key={goal.value} value={goal.value}>
                                  {goal.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={goalsForm.control}
                    name="useCases"
                    render={() => (
                      <FormItem>
                        <FormLabel>Which use cases interest you? *</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {useCases.map((useCase) => (
                            <FormField
                              key={useCase.value}
                              control={goalsForm.control}
                              name="useCases"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={useCase.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(useCase.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, useCase.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== useCase.value
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {useCase.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
