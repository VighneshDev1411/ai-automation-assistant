'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { PageHeader } from '@/components/layout/page-header'
import { ResponsiveContainer } from '@/components/layout/container'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Shield,
  Bell,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Key,
  Smartphone,
  Mail,
  Trash2,
} from 'lucide-react'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Notification settings state
  const [notifications, setNotifications] = useState({
    emailWorkflows: true,
    emailSecurity: true,
    emailMarketing: false,
    pushWorkflows: true,
    pushSecurity: true,
    pushMarketing: false,
  })

  // Privacy settings state
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'team',
    activityVisibility: 'private',
    analyticsOptIn: true,
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onPasswordSubmit = async (values: PasswordForm) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // TODO: Update password in Supabase
      console.log('Updating password')

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      setSuccess('Password updated successfully!')
      passwordForm.reset()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to update password. Please check your current password.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateNotificationSetting = async (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))

    try {
      // TODO: Update notification preferences in Supabase
      console.log('Updating notification setting:', key, value)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      console.error('Failed to update notification setting')
      // Revert the change
      setNotifications(prev => ({ ...prev, [key]: !value }))
    }
  }

  const updatePrivacySetting = async (key: string, value: string | boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))

    try {
      // TODO: Update privacy settings in Supabase
      console.log('Updating privacy setting:', key, value)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      console.error('Failed to update privacy setting')
    }
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <div className="space-y-8">
        {/* Security Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your password and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Password Change */}
            <div>
              <h4 className="text-sm font-medium mb-4">Change Password</h4>

              {success && (
                <Alert className="mb-4 animate-slide-in-up">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? 'text' : 'password'}
                              {...field}
                              className="pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? 'text' : 'password'}
                                {...field}
                                className="pr-12"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowNewPassword(!showNewPassword)
                                }
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                {...field}
                                className="pr-12"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="btn-shine"
                  >
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </Form>
            </div>

            <Separator />

            {/* Two-Factor Authentication */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Badge variant="outline">Not Enabled</Badge>
              </div>
              <Button variant="outline">
                <Smartphone className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            </div>

            <Separator />

            {/* Active Sessions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Active Sessions</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Current Session</p>
                    <p className="text-xs text-muted-foreground">
                      Chrome on macOS • San Francisco, CA • Active now
                    </p>
                  </div>
                  <Badge variant="secondary">Current</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Mobile App</p>
                    <p className="text-xs text-muted-foreground">
                      iPhone • Last active 2 hours ago
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Notifications */}
            <div>
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Notifications
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Workflow Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Notifications about workflow executions and errors
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailWorkflows}
                    onCheckedChange={value =>
                      updateNotificationSetting('emailWorkflows', value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Security Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Important security and account changes
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailSecurity}
                    onCheckedChange={value =>
                      updateNotificationSetting('emailSecurity', value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Marketing Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Product updates, tips, and promotional content
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailMarketing}
                    onCheckedChange={value =>
                      updateNotificationSetting('emailMarketing', value)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Push Notifications */}
            <div>
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push Notifications
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Workflow Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Real-time notifications on your devices
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushWorkflows}
                    onCheckedChange={value =>
                      updateNotificationSetting('pushWorkflows', value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Security Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Immediate alerts for security events
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushSecurity}
                    onCheckedChange={value =>
                      updateNotificationSetting('pushSecurity', value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Marketing Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Product announcements and tips
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushMarketing}
                    onCheckedChange={value =>
                      updateNotificationSetting('pushMarketing', value)
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy
            </CardTitle>
            <CardDescription>
              Control your privacy and data sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">
                    Who can see your profile information
                  </p>
                </div>
                <Select
                  value={privacy.profileVisibility}
                  onValueChange={value =>
                    updatePrivacySetting('profileVisibility', value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Activity Visibility</p>
                  <p className="text-xs text-muted-foreground">
                    Who can see your workflow activity
                  </p>
                </div>
                <Select
                  value={privacy.activityVisibility}
                  onValueChange={value =>
                    updatePrivacySetting('activityVisibility', value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Analytics & Insights</p>
                  <p className="text-xs text-muted-foreground">
                    Help improve our platform with anonymous usage data
                  </p>
                </div>
                <Switch
                  checked={privacy.analyticsOptIn}
                  onCheckedChange={value =>
                    updatePrivacySetting('analyticsOptIn', value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="glass-card border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveContainer>
  )
}
