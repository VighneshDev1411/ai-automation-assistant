'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-react'

const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  avatar: z.string().optional(),
})

const companyInfoSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  companySize: z.string().min(1, 'Please select company size'),
  industry: z.string().min(1, 'Please select industry'),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
})

const goalsSchema = z.object({
  primaryGoal: z.string().min(1, 'Please select your primary goal'),
  useCases: z.array(z.string()).min(1, 'Please select at least one use case'),
  currentTools: z.string().optional(),
})

type PersonalInfo = z.infer<typeof personalInfoSchema>
type CompanyInfo = z.infer<typeof companyInfoSchema>
type Goals = z.infer<typeof goalsSchema>

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Company', icon: Building },
  { id: 3, title: 'Goals', icon: Target },
  { id: 4, title: 'Complete', icon: CheckCircle },
]

const companySizes = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-1000', label: '201-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
]

const industries = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
]

const primaryGoals = [
  { value: 'automate-workflows', label: 'Automate repetitive workflows' },
  { value: 'integrate-apps', label: 'Integrate multiple applications' },
  { value: 'ai-assistance', label: 'Get AI assistance for tasks' },
  { value: 'improve-efficiency', label: 'Improve team efficiency' },
  { value: 'reduce-errors', label: 'Reduce manual errors' },
]

const useCases = [
  {
    id: 'lead-management',
    label: 'Lead Management',
    description: 'Automate lead capture and nurturing',
  },
  {
    id: 'data-sync',
    label: 'Data Synchronization',
    description: 'Keep data in sync across platforms',
  },
  {
    id: 'notifications',
    label: 'Smart Notifications',
    description: 'Intelligent alerts and reminders',
  },
  {
    id: 'reporting',
    label: 'Automated Reporting',
    description: 'Generate reports automatically',
  },
  {
    id: 'content-creation',
    label: 'Content Creation',
    description: 'AI-powered content generation',
  },
  {
    id: 'customer-support',
    label: 'Customer Support',
    description: 'Automate support workflows',
  },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [personalData, setPersonalData] = useState<PersonalInfo | null>(null)
  const [companyData, setCompanyData] = useState<CompanyInfo | null>(null)
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([])

  const router = useRouter()

  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      jobTitle: '',
      avatar: '',
    },
  })

  const companyForm = useForm<CompanyInfo>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: '',
      companySize: '',
      industry: '',
      website: '',
    },
  })

  const goalsForm = useForm<Goals>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      primaryGoal: '',
      useCases: selectedUseCases,
      currentTools: '',
    },
  })

  useEffect(() => {
    goalsForm.setValue('useCases', selectedUseCases)
  }, [selectedUseCases, goalsForm])

  const progress = (currentStep / steps.length) * 100

  const handlePersonalSubmit = (data: PersonalInfo) => {
    setPersonalData(data)
    setCurrentStep(2)
  }

  const handleCompanySubmit = (data: CompanyInfo) => {
    setCompanyData(data)
    setCurrentStep(3)
  }

  const handleGoalsSubmit = async (data: Goals) => {
    setIsLoading(true)

    try {
      const finalData = {
        ...data,
        useCases: selectedUseCases,
      }

      // TODO: Save all onboarding data to Supabase
      const onboardingData = {
        personal: personalData,
        company: companyData,
        goals: { ...data, useCases: selectedUseCases },
      }

      console.log('Saving onboarding data:', onboardingData)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      setCurrentStep(4)

      // Redirect to dashboard after showing success
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (err) {
      console.error('Failed to save onboarding data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUseCase = (useCaseId: string) => {
    setSelectedUseCases(prev =>
      prev.includes(useCaseId)
        ? prev.filter(id => id !== useCaseId)
        : [...prev, useCaseId]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome to AI Automation Platform
            </h1>
            <p className="text-muted-foreground mt-1">
              Let's set up your account in just a few steps
            </p>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                    ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground text-muted-foreground'
                    }
                  `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`
                      h-0.5 w-16 mx-2 transition-all duration-200
                      ${isCompleted ? 'bg-green-500' : 'bg-muted'}
                    `}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="glass-card">
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Tell us a bit about yourself to personalize your experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...personalForm}>
                  <form
                    onSubmit={personalForm.handleSubmit(handlePersonalSubmit)}
                    className="space-y-6"
                  >
                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={personalForm.watch('avatar')} />
                        <AvatarFallback className="text-lg">
                          {personalForm
                            .watch('firstName')?.[0]
                            ?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mb-2"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Upload Photo
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Optional: Add a profile picture
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={personalForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={personalForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Product Manager, Developer, CEO"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" className="btn-shine">
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
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
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Help us understand your organization better
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...companyForm}>
                  <form
                    onSubmit={companyForm.handleSubmit(handleCompanySubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={companyForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={companyForm.control}
                        name="companySize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Size</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companySizes.map(size => (
                                  <SelectItem
                                    key={size.value}
                                    value={size.value}
                                  >
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {industries.map(industry => (
                                  <SelectItem
                                    key={industry.value}
                                    value={industry.value}
                                  >
                                    {industry.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={companyForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Your company website URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button type="submit" className="btn-shine">
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
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
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your Goals
                </CardTitle>
                <CardDescription>
                  Help us customize your experience based on your objectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...goalsForm}>
                  <form
                    onSubmit={goalsForm.handleSubmit(handleGoalsSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={goalsForm.control}
                      name="primaryGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What's your primary goal?</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your main objective" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {primaryGoals.map(goal => (
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

                    <div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Which use cases interest you? (Select all that apply)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {useCases.map(useCase => (
                          <div
                            key={useCase.id}
                            className={`
                              p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:border-primary/50
                              ${
                                selectedUseCases.includes(useCase.id)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border'
                              }
                            `}
                            onClick={() => toggleUseCase(useCase.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {useCase.label}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {useCase.description}
                                </p>
                              </div>
                              {selectedUseCases.includes(useCase.id) && (
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedUseCases.length === 0 && (
                        <p className="text-sm text-destructive mt-2">
                          Please select at least one use case
                        </p>
                      )}
                    </div>

                    <FormField
                      control={goalsForm.control}
                      name="currentTools"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Tools (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about the tools you currently use for automation or would like to integrate..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This helps us suggest relevant integrations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="btn-shine"
                        disabled={isLoading || selectedUseCases.length === 0 || !goalsForm.formState.isValid || !goalsForm.watch('primaryGoal')}
                      >
                        {isLoading ? (
                          'Setting up your account...'
                        ) : (
                          <>
                            Complete Setup
                            <Sparkles className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}

          {currentStep === 4 && (
            <CardContent className="pt-6 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Welcome aboard!</h2>
                <p className="text-muted-foreground mt-2 text-lg">
                  Your account is all set up. Let's start automating!
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-pulse">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Redirecting to your dashboard...
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl mb-1">🚀</div>
                    <div className="text-xs font-medium">Quick Start</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl mb-1">🤖</div>
                    <div className="text-xs font-medium">AI Assistants</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl mb-1">📊</div>
                    <div className="text-xs font-medium">Analytics</div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        {/* Help Text */}
        {currentStep < 4 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact our support team at{' '}
              <a
                href="mailto:support@aiautomation.com"
                className="text-primary hover:underline"
              >
                support@aiautomation.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
