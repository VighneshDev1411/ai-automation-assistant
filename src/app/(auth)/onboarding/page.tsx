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
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/common/theme-toggle'
import {
  User,
  Building,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Camera,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  phone: z.string().optional(),
  timezone: z.string().min(1, 'Please select your timezone'),
  avatar: z.string().optional(),
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
  { id: 1, name: 'Personal Info', icon: User },
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
  const { user, profile, refreshProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const supabase = createClient()

  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: profile?.full_name || user?.user_metadata?.full_name || '',
      jobTitle: profile?.job_title || '',
      phone: profile?.phone || '',
      timezone: profile?.timezone || 'UTC',
      avatar: profile?.avatar_url || user?.user_metadata?.avatar_url || '',
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

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  // Auto-generate slug from organization name
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user.id}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handlePersonalInfo = async (data: PersonalInfo) => {
    try {
      setIsLoading(true)
      setError(null)

      // Upload avatar if changed
      let avatarUrl = data.avatar
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          job_title: data.jobTitle,
          phone: data.phone,
          timezone: data.timezone,
          avatar_url: avatarUrl,
        })
        .eq('id', user!.id)

      if (updateError) throw updateError

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

      // Create organization using the database function
      const { data: orgData, error: orgError } = await supabase
        .rpc('create_organization', {
          org_name: data.organizationName,
          org_slug: data.organizationSlug,
          org_description: data.organizationDescription,
        })

      if (orgError) throw orgError

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

      // Update profile preferences with goals
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferences: {
            primaryGoal: data.primaryGoal,
            useCases: data.useCases,
          },
          onboarded: true,
        })
        .eq('id', user!.id)

      if (updateError) throw updateError

      // Refresh profile in context
      await refreshProfile()

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to save goals')
    } finally {
      setIsLoading(false)
    }
  }

  const progress = (currentStep / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to AI Automation Platform</h1>
          <p className="text-muted-foreground mt-2">
            Let's get you set up in just a few minutes
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 ${
                    step.id <= currentStep
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.id < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : step.id === currentStep
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline">{step.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Forms */}
        <Card className="glass-card">
          {error && (
            <Alert variant="destructive" className="m-6 mb-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Tell us a bit about yourself
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...personalForm}>
                  <form onSubmit={personalForm.handleSubmit(handlePersonalInfo)} className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={avatarPreview || personalForm.getValues('avatar')} />
                          <AvatarFallback>
                            {personalForm.getValues('fullName')?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <label
                          htmlFor="avatar-upload"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90"
                        >
                          <Camera className="h-4 w-4" />
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </label>
                      </div>
                    </div>

                    <FormField
                      control={personalForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
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
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle>Create Your Organization</CardTitle>
                <CardDescription>
                  Set up your workspace for team collaboration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...organizationForm}>
                  <form onSubmit={organizationForm.handleSubmit(handleOrganization)} className="space-y-4">
                    <FormField
                      control={organizationForm.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
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
                          <FormLabel>Organization URL</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground mr-2">
                                app.aiautomation.com/
                              </span>
                              <Input placeholder="acme-inc" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>
                            This will be your unique organization URL
                          </FormDescription>
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
                              placeholder="What does your organization do?"
                              className="resize-none"
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
                        disabled={isLoading}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle>What are your goals?</CardTitle>
                <CardDescription>
                  Help us customize your experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...goalsForm}>
                  <form onSubmit={goalsForm.handleSubmit(handleGoals)} className="space-y-4">
                    <FormField
                      control={goalsForm.control}
                      name="primaryGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Goal</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="What brings you here?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {goals.map((goal) => (
                                <SelectItem key={goal.value} value={goal.value}>
                                  {goal.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={goalsForm.control}
                      name="useCases"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Use Cases</FormLabel>
                          <FormDescription>
                            Select all that apply to your needs
                          </FormDescription>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            {useCases.map((useCase) => (
                              <label
                                key={useCase.value}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  field.value.includes(useCase.value)
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={field.value.includes(useCase.value)}
                                  onChange={(e) => {
                                    const newValue = e.target.checked
                                      ? [...field.value, useCase.value]
                                      : field.value.filter((v) => v !== useCase.value)
                                    field.onChange(newValue)
                                  }}
                                />
                                <span className="text-sm">{useCase.label}</span>
                              </label>
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
                        disabled={isLoading}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Completing setup...
                          </>
                        ) : (
                          <>
                            Complete Setup
                            <Sparkles className="ml-2 h-4 w-4" />
                          </>
                        )}
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