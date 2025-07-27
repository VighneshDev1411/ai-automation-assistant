'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { PageHeader } from '@/components/layout/page-header'
import { Container } from '@/components/layout/container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Camera, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  jobTitle: z.string().min(2, 'Job title is required'),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Please select a timezone'),
})

type ProfileForm = z.infer<typeof profileSchema>

// Mock user data - in real app, this would come from Supabase
const mockUser = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  jobTitle: 'Product Manager',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  bio: 'Passionate about automation and AI. Love building workflows that make teams more efficient.',
  website: 'https://johndoe.com',
  timezone: 'America/Los_Angeles',
  avatar: '',
  joinedAt: '2024-01-15',
  lastActive: '2024-01-28',
}

const timezones = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
]

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      email: mockUser.email,
      jobTitle: mockUser.jobTitle,
      phone: mockUser.phone,
      location: mockUser.location,
      bio: mockUser.bio,
      website: mockUser.website,
      timezone: mockUser.timezone,
    },
  })

  const onSubmit = async (values: ProfileForm) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // TODO: Update user profile in Supabase
      console.log('Updating profile:', values)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Container>
      <PageHeader
        title="Profile"
        description="Manage your personal information and preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={mockUser.avatar} />
                    <AvatarFallback className="text-2xl">
                      {mockUser.firstName[0]}{mockUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold">
                    {mockUser.firstName} {mockUser.lastName}
                  </h3>
                  <p className="text-muted-foreground">{mockUser.jobTitle}</p>
                </div>

                <Badge variant="secondary" className="mb-4">
                  Premium Member
                </Badge>

                <Separator />

                <div className="w-full space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{mockUser.email}</span>
                  </div>
                  
                  {mockUser.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{mockUser.phone}</span>
                    </div>
                  )}
                  
                  {mockUser.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{mockUser.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {formatDate(mockUser.joinedAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workflows Created</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Executions</span>
                <span className="font-semibold">12,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold text-green-600">98.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Active</span>
                <span className="font-semibold">Today</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success && (
                <Alert className="mb-6 animate-slide-in-up">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Profile updated successfully!
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your email address is used for login and notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="City, Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
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
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a bit about yourself..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0}/500 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="btn-shine"
                    >
                      {isLoading ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  )
}