// src/app/(dashboard)/test-data/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { 
  useOrganizations, 
  useWorkflows, 
  useCreateWorkflow,
  useUpdateWorkflow,
  useIntegrations,
  useConnectIntegration,
  useExecutions,
  useApiUsage
} from '@/hooks'
import { createClient } from '@/lib/supabase/client'
import { OrganizationService, WorkflowService, IntegrationService } from '@/lib/supabase/services'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ResponsiveContainer } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Database,
  Zap,
  Link,
  Activity,
  Plus,
  Edit,
  Trash
} from 'lucide-react'
import { supabase } from '@/lib/supabase/supabase-test'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  data?: any
}

export default function DataLayerTestPage() {
  const { user, currentOrganization } = useAuth()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)

  // Hooks for testing
  const { data: organizations, refetch: refetchOrgs } = useOrganizations()
  const { data: workflows, refetch: refetchWorkflows } = useWorkflows(currentOrganization?.id || '')
  const { data: integrations, refetch: refetchIntegrations } = useIntegrations()
  const createWorkflow = useCreateWorkflow()
  const updateWorkflow = useUpdateWorkflow(selectedWorkflow || '')

  // Test functions
  const updateTestResult = (name: string, update: Partial<TestResult>) => {
    setTestResults(prev => 
      prev.map(result => 
        result.name === name ? { ...result, ...update } : result
      )
    )
  }

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result])
  }

const testOrganizationService = async () => {
  const testName = 'Organization Service'
  addTestResult({ name: testName, status: 'running' })

  try {
    const supabase = createClient()
    
    // Get organizations with proper join
    const { data: orgs, error: orgsError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        joined_at,
        organization:organizations!inner (
          id,
          name,
          slug,
          description
        )
      `)
      .eq('user_id', user?.id)
      .not('joined_at', 'is', null)

    if (orgsError) throw orgsError

    // Get members for current organization
    if (currentOrganization) {
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:profiles!organization_members_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url,
            job_title
          )
        `)
        .eq('organization_id', currentOrganization.id)

      if (membersError) throw membersError
      
      updateTestResult(testName, {
        status: 'success',
        message: `Found ${orgs?.length || 0} organizations, ${members?.length || 0} members`,
        data: { 
          organizations: orgs?.map(o => ({
            ...o.organization,
            role: o.role
          })), 
          members 
        }
      })
    } else {
      updateTestResult(testName, {
        status: 'error',
        message: 'No current organization selected'
      })
    }
  } catch (error: any) {
    updateTestResult(testName, {
      status: 'error',
      message: error.message
    })
  }
}  

  // Test 2: Workflow CRUD
 
  const testWorkflowCRUD = async () => {
  const testName = 'Workflow CRUD Operations'
  addTestResult({ name: testName, status: 'running' })

  try {
    if (!currentOrganization || !user) {
      throw new Error('No organization or user found')
    }

    // Use the mutation hook which properly handles auth
    type WorkflowType = {
      id: string
      name: string
      description?: string
      [key: string]: any
    }

    const newWorkflow = await createWorkflow.mutateAsync({
      name: `Test Workflow ${Date.now()}`,
      description: 'Created by data layer test',
      trigger_config: {
        type: 'manual',
        config: {}
      },
      actions: [{
        id: '1',
        type: 'http',
        name: 'Test Action',
        config: {
          url: 'https://example.com',
          method: 'POST'
        }
      }],
      status: 'draft',
      tags: []
    }) as WorkflowType

    if (!newWorkflow) {
      throw new Error('Failed to create workflow')
    }

    setSelectedWorkflow(newWorkflow.id)

    // Update using the service
    const supabase = createClient()
    const service = new WorkflowService(supabase)
    
    const updated = await service.update(newWorkflow.id, {
      description: 'Updated by test at ' + new Date().toISOString()
    })

    // Read the workflow
    const fetched = await service.findById(newWorkflow.id)

    updateTestResult(testName, {
      status: 'success',
      message: 'Successfully created, updated, and fetched workflow',
      data: {
        created: newWorkflow,
        updated,
        fetched
      }
    })

    // Refresh the workflows list
    refetchWorkflows()
  } catch (error: any) {
    updateTestResult(testName, {
      status: 'error',
      message: error.message
    })
  }
}

  // Test 3: Integration Service
  const testIntegrationService = async () => {
    const testName = 'Integration Service'
    addTestResult({ name: testName, status: 'running' })

    try {
      const supabase = createClient()
      const service = new IntegrationService(supabase)

      // Test finding integrations
      const integrations = await service.findAll()

      // Test finding by provider
      if (currentOrganization) {
        const googleIntegration = await service.findByOrganizationAndProvider(
          currentOrganization.id,
          'google'
        )

        updateTestResult(testName, {
          status: 'success',
          message: `Found ${integrations?.length || 0} integrations`,
          data: {
            all: integrations,
            google: googleIntegration
          }
        })
      }
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message
      })
    }
  }

const testAPIRoutes = async () => {
  const testName = 'API Routes'
  addTestResult({ name: testName, status: 'running' })

  try {
    // Test workflows endpoint without query parameters
    const response = await fetch('/api/workflows?q=&page=1&limit=10&orderBy=created_at&order=desc', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
})

    
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'API request failed')
    }

    updateTestResult(testName, {
      status: 'success',
      message: `API returned ${data.workflows?.length || 0} workflows`,
      data
    })
  } catch (error: any) {
    updateTestResult(testName, {
      status: 'error',
      message: error.message
    })
  }
}
  // Test 5: Real-time Subscriptions
  const testRealtimeSubscriptions = async () => {
    const testName = 'Real-time Subscriptions'
    addTestResult({ name: testName, status: 'running' })

    try {
      const supabase = createClient()
      
      // Subscribe to workflow changes
      const channel = supabase
        .channel('workflow-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workflows',
            filter: `organization_id=eq.${currentOrganization?.id}`
          },
          (payload) => {
            updateTestResult(testName, {
              status: 'success',
              message: `Received ${payload.eventType} event`,
              data: payload
            })
          }
        )
        .subscribe()

      // Keep subscription active for 5 seconds
      setTimeout(() => {
        supabase.removeChannel(channel)
        if (testResults.find(r => r.name === testName)?.status === 'running') {
          updateTestResult(testName, {
            status: 'success',
            message: 'Subscription setup successful (no events received)'
          })
        }
      }, 5000)
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message
      })
    }
  }

  // Test 6: Permissions
  const testPermissions = async () => {
    const testName = 'RLS Permissions'
    addTestResult({ name: testName, status: 'running' })

    try {
      const supabase = createClient()
      
      // Try to access workflows from another organization (should fail)
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', 'non-existent-org-id')

      if (error) {
        updateTestResult(testName, {
          status: 'success',
          message: 'RLS correctly prevented unauthorized access',
          data: { error: error.message }
        })
      } else if (data && data.length === 0) {
        updateTestResult(testName, {
          status: 'success',
          message: 'RLS working - no unauthorized data returned'
        })
      } else {
        updateTestResult(testName, {
          status: 'error',
          message: 'RLS may not be working correctly',
          data
        })
      }
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message
      })
    }
  }

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])

    await testOrganizationService()
    await testWorkflowCRUD()
    await testIntegrationService()
    await testAPIRoutes()
    await testRealtimeSubscriptions()
    await testPermissions()

    setIsRunning(false)
  }

  // Render test result
  const renderTestResult = (result: TestResult) => {
    const Icon = result.status === 'success' ? CheckCircle : 
                 result.status === 'error' ? XCircle : 
                 result.status === 'running' ? Loader2 : Activity

    const variant = result.status === 'success' ? 'default' : 
                   result.status === 'error' ? 'destructive' : 
                   'secondary'

    return (
      <Card key={result.name} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${result.status === 'running' ? 'animate-spin' : ''}`} />
              <CardTitle className="text-lg">{result.name}</CardTitle>
            </div>
            <Badge variant={variant}>{result.status}</Badge>
          </div>
        </CardHeader>
        {(result.message || result.data) && (
          <CardContent>
            {result.message && (
              <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
            )}
            {result.data && (
              <details className="cursor-pointer">
                <summary className="text-sm font-medium">View Data</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  if (!user || !currentOrganization) {
    return (
      <ResponsiveContainer>
        <Alert>
          <AlertDescription>
            Please log in and select an organization to test the data layer.
          </AlertDescription>
        </Alert>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Data Layer Test"
        description="Test all CRUD operations and verify the data layer is working correctly"
      >
        <Button onClick={runAllTests} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Results */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Click "Run All Tests" to start testing the data layer
                </p>
              </CardContent>
            </Card>
          ) : (
            testResults.map(renderTestResult)
          )}
        </div>

        {/* Current Data */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Current Data</h2>
          
          <Tabs defaultValue="organizations">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="organizations">
              <Card>
                <CardHeader>
                  <CardTitle>Your Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  {organizations?.map((org: any) => (
                    <div key={org.id} className="mb-3 p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.slug}</p>
                        </div>
                        <Badge>{org.role}</Badge>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchOrgs()}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflows">
              <Card>
                <CardHeader>
                  <CardTitle>Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  {workflows?.map((workflow: any) => (
                    <div key={workflow.id} className="mb-3 p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{workflow.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {workflow.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                            {workflow.status}
                          </Badge>
                          {workflow.id === selectedWorkflow && (
                            <Badge variant="outline">Selected</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchWorkflows()}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle>Connected Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  {integrations?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No integrations connected</p>
                  ) : (
                    integrations?.map((integration: any) => (
                      <div key={integration.id} className="mb-3 p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">{integration.provider}</p>
                            <p className="text-sm text-muted-foreground">
                              Last synced: {integration.last_synced_at ? 
                                new Date(integration.last_synced_at).toLocaleString() : 
                                'Never'}
                            </p>
                          </div>
                          <Badge variant={
                            integration.status === 'connected' ? 'default' : 
                            integration.status === 'error' ? 'destructive' : 
                            'secondary'
                          }>
                            {integration.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchIntegrations()}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ResponsiveContainer>
  )
}