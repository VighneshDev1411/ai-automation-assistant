'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { ResponsiveGrid, GridItem } from '@/components/layout/responsive-grid'
import { ResponsiveContainer } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Star,
  Calendar,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Please select a role'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export default function ComponentsPage() {
  const [progress, setProgress] = useState(65)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      message: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  const mockData = [
    { id: 1, name: 'John Doe', role: 'Admin', status: 'active', lastActive: '2 min ago' },
    { id: 2, name: 'Jane Smith', role: 'User', status: 'inactive', lastActive: '1 hr ago' },
    { id: 3, name: 'Bob Johnson', role: 'Manager', status: 'active', lastActive: '5 min ago' },
  ]

  return (
    <TooltipProvider>
      <AppLayout>
        <ResponsiveContainer>
          <PageHeader
            title="UI Component Library"
            description="Comprehensive showcase of all available components"
          >
            <Button>Create Component</Button>
          </PageHeader>

          <div className="space-y-8">
            {/* Alerts */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Alerts & Feedback</h2>
              <div className="space-y-4">
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    This is a default alert with some important information.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>
                    Your workflow has been successfully created and is now running.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Some integrations may require additional configuration.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to connect to the external API. Please check your credentials.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Progress Bars */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Progress Indicators</h2>
              <div className="space-y-6">
                <Progress value={progress} showValue />
                <Progress value={85} variant="success" showValue />
                <Progress value={45} variant="warning" showValue />
                <Progress value={25} variant="destructive" showValue />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                    variant="outline"
                    size="sm"
                  >
                    Decrease
                  </Button>
                  <Button 
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                    variant="outline"
                    size="sm"
                  >
                    Increase
                  </Button>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Badges</h2>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="destructive">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge size="sm">Small</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>

            {/* Avatars */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Avatars</h2>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">AI</AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Forms */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Forms</h2>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Contact Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <ResponsiveGrid cols={{ default: 1, md: 2 }} gap={6}>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your name" {...field} />
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
                                <Input type="email" placeholder="Enter your email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </ResponsiveGrid>
                      
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="developer">Developer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your message" 
                                autoResize 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Tell us about your automation needs.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full">
                        Submit Form
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Data Tables</h2>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockData.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.lastActive}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Star className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add to favorites</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    More
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40">
                                  <div className="space-y-2">
                                    <Button variant="ghost" size="sm" className="w-full justify-start">
                                      Edit User
                                    </Button>
                                    <Button variant="ghost" size="sm" className="w-full justify-start">
                                      Reset Password
                                    </Button>
                                    <Button variant="ghost" size="sm" className="w-full justify-start text-destructive">
                                      Delete User
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Dialogs */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Dialogs & Modals</h2>
              <div className="flex gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Small Dialog</Button>
                  </DialogTrigger>
                  <DialogContent size="sm">
                    <DialogHeader>
                      <DialogTitle>Confirm Action</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this workflow? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button variant="destructive">Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Large Dialog</Button>
                  </DialogTrigger>
                  <DialogContent size="lg">
                    <DialogHeader>
                      <DialogTitle>Create New Workflow</DialogTitle>
                      <DialogDescription>
                        Set up a new automation workflow to streamline your processes.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Workflow Name</label>
                        <Input placeholder="Enter workflow name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea placeholder="Describe your workflow" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="productivity">Productivity</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Workflow</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Summary Cards */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Summary Cards</h2>
              <ResponsiveGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
                <Card className="glass-card hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Workflows</p>
                        <p className="text-3xl font-bold">147</p>
                        <p className="text-sm text-green-600">+12% from last month</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Users</p>
                        <p className="text-3xl font-bold">2,847</p>
                        <p className="text-sm text-green-600">+5% from last week</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Users className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Execution Time</p>
                        <p className="text-3xl font-bold">1.2s</p>
                        <p className="text-sm text-yellow-600">-0.3s from last week</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-3xl font-bold">98.5%</p>
                        <p className="text-sm text-green-600">+2.1% from last month</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ResponsiveGrid>
            </div>
            {/* Component Showcase */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Interactive Showcase</h2>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>All Components Demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Button Variants */}
              <div>
                <h3 className="font-semibold mb-3">Button Variants</h3>
                <div className="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              {/* Input Variants */}
              <div>
                <h3 className="font-semibold mb-3">Input Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Standard input" />
                  <Input type="email" placeholder="Email input" />
                  <Input type="password" placeholder="Password input" />
                  <Input disabled placeholder="Disabled input" />
                </div>
              </div>

              {/* Select Demo */}
              <div>
                <h3 className="font-semibold mb-3">Select Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low Priority</SelectItem>
                      <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                      <SelectItem value="high">🔴 High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Textarea Demo */}
              <div>
                <h3 className="font-semibold mb-3">Text Areas</h3>
                <div className="space-y-4">
                  <Textarea placeholder="Standard textarea" />
                  <Textarea placeholder="Auto-resizing textarea (type to see it grow)" autoResize />
                </div>
              </div>

              {/* Interactive Elements */}
              <div>
                <h3 className="font-semibold mb-3">Interactive Elements</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover for tooltip</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a helpful tooltip!</p>
                    </TooltipContent>
                  </Tooltip>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Open popover</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Quick Actions</h4>
                        <p className="text-sm text-muted-foreground">
                          Choose an action to perform:
                        </p>
                        <div className="space-y-1">
                          <Button size="sm" className="w-full justify-start">
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                          <Button size="sm" variant="ghost" className="w-full justify-start">
                            <Clock className="h-4 w-4 mr-2" />
                            Set Reminder
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Badge variant="secondary" className="animate-pulse">
                    Live Status
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsiveContainer>
  </AppLayout>
</TooltipProvider>
  )}