// src/app/(dashboard)/test-manual/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
// import { Label} from '@/components/ui/label'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { toast } from '@/components/ui/use-toast'
import { Copy, Play, Trash2, Edit2, Save, X } from 'lucide-react'

export default function ManualTestPage() {
  const { user, currentOrganization } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [workflowName, setWorkflowName] = useState('Test Workflow')
  const [workflowDescription, setWorkflowDescription] = useState(
    'Created from manual test'
  )
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | null>(
    null
  )

  const supabase = createClient()

  // Helper to display results
  const showResult = (data: any, errorMsg?: string) => {
    if (errorMsg) {
      setError(errorMsg)
      setResult(null)
    } else {
      setResult(data)
      setError(null)
    }
  }

  // Test Operations
  const testOperations = {
    // 1. Create Workflow
    createWorkflow: async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            name: workflowName,
            description: workflowDescription,
            organization_id: currentOrganization?.id,
            // created_by: user?.id,     <-- REMOVE this; let the default fill it
            status: 'draft',
            trigger_config: { type: 'manual', config: {} },
            actions: [
              {
                id: '1',
                type: 'http',
                name: 'Test HTTP Action',
                config: {
                  url: 'https://api.example.com/webhook',
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                },
              },
            ],
          })
          .select()
          .single()

        if (error) throw error

        setCreatedWorkflowId(data.id)
        showResult(data)
        toast({
          title: 'Success',
          description: 'Workflow created successfully',
        })
      } catch (err: any) {
        showResult(null, err.message)
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },

    // 2. List Workflows
    listWorkflows: async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .eq('organization_id', currentOrganization?.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error

        showResult(data)
      } catch (err: any) {
        showResult(null, err.message)
      } finally {
        setIsLoading(false)
      }
    },

    // 3. Update Workflow
    updateWorkflow: async () => {
      if (!createdWorkflowId) {
        toast({
          title: 'Error',
          description: 'Create a workflow first',
          variant: 'destructive',
        })
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('workflows')
          .update({
            name: workflowName + ' (Updated)',
            description:
              workflowDescription + ' - Updated at ' + new Date().toISOString(),
            status: 'active',
          })
          .eq('id', createdWorkflowId)
          .select()
          .single()

        if (error) throw error

        showResult(data)
        toast({
          title: 'Success',
          description: 'Workflow updated successfully',
        })
      } catch (err: any) {
        showResult(null, err.message)
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },

    // 4. Execute Workflow (via RPC)
    executeWorkflow: async () => {
      if (!createdWorkflowId) {
        toast({
          title: 'Error',
          description: 'Create a workflow first',
          variant: 'destructive',
        })
        return
      }

      setIsLoading(true)
      try {
        // const { data, error } = await supabase.rpc('execute_workflow', {
        //   workflow_id: createdWorkflowId,
        //   trigger_data: {
        //     test: true,
        //     timestamp: new Date().toISOString(),
        //   },
        // })

        // replace the old RPC call
const { data, error } = await supabase.rpc('execute_workflow_v2', {
  workflow_id: createdWorkflowId,
  trigger_data: { test: true, timestamp: new Date().toISOString() },
});


        if (error) throw error

        showResult({ execution_id: data })
        toast({
          title: 'Success',
          description: 'Workflow execution started',
        })
      } catch (err: any) {
        showResult(null, err.message)
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },

    // 5. Check Organization Access
checkAccess: async () => {
  setIsLoading(true)
  try {
    const orgId = currentOrganization?.id
    if (!orgId) throw new Error('No organization selected')

    const { data, error } = await supabase.rpc('check_org_membership_self', {
  org_id_input: currentOrganization!.id,
})


    if (error) throw error
    showResult({ has_access: data })
  } catch (err: any) {
    showResult(null, err.message)
  } finally {
    setIsLoading(false)
  }
},
    // 6. Get Workflow Stats
    getStats: async () => {
      if (!createdWorkflowId) {
        toast({
          title: 'Error',
          description: 'Create a workflow first',
          variant: 'destructive',
        })
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase.rpc('get_workflow_stats', {
          workflow_id: createdWorkflowId,
          time_range: '30 days',
        })

        if (error) throw error

        showResult(data)
      } catch (err: any) {
        showResult(null, err.message)
      } finally {
        setIsLoading(false)
      }
    },

    // 7. Delete Workflow
    deleteWorkflow: async () => {
      if (!createdWorkflowId) {
        toast({
          title: 'Error',
          description: 'Create a workflow first',
          variant: 'destructive',
        })
        return
      }

      setIsLoading(true)
      try {
        const { error } = await supabase
          .from('workflows')
          .delete()
          .eq('id', createdWorkflowId)

        if (error) throw error

        showResult({ deleted: true, id: createdWorkflowId })
        setCreatedWorkflowId(null)
        toast({
          title: 'Success',
          description: 'Workflow deleted successfully',
        })
      } catch (err: any) {
        showResult(null, err.message)
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },

    // 8. Test Real-time
    testRealtime: async () => {
      const channel = supabase
        .channel('test-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workflows',
            filter: `organization_id=eq.${currentOrganization?.id}`,
          },
          payload => {
            showResult({
              message: 'Real-time event received!',
              event: payload.eventType,
              data: payload.new,
              old: payload.old,
            })
            toast({
              title: 'Real-time Event',
              description: `${payload.eventType} event received`,
            })
          }
        )
        .subscribe()

      showResult({
        message:
          'Listening for changes... Try creating or updating a workflow in another tab!',
        subscription: 'active',
      })

      // Clean up after 30 seconds
      setTimeout(() => {
        supabase.removeChannel(channel)
        toast({
          title: 'Info',
          description: 'Real-time subscription closed',
        })
      }, 30000)
    },
  }

  if (!user || !currentOrganization) {
    return (
      <Container>
        <Alert>
          <AlertDescription>
            Please log in and select an organization to test data operations.
          </AlertDescription>
        </Alert>
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title="Manual Data Operations Test"
        description="Test individual database operations step by step"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Test Data</CardTitle>
              <CardDescription>
                Configure the data for testing workflow operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={e => setWorkflowName(e.target.value)}
                  placeholder="Enter workflow name"
                />
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={e => setWorkflowDescription(e.target.value)}
                  placeholder="Enter workflow description"
                  rows={3}
                />
              </div>
              {createdWorkflowId && (
                <Alert>
                  <AlertDescription>
                    <strong>Created Workflow ID:</strong>
                    <code className="ml-2 text-xs">{createdWorkflowId}</code>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Operations</CardTitle>
              <CardDescription>
                Click buttons to test different database operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={testOperations.createWorkflow}
                  disabled={isLoading}
                  variant="default"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Create
                </Button>
                <Button
                  onClick={testOperations.listWorkflows}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  List
                </Button>
                <Button
                  onClick={testOperations.updateWorkflow}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Update
                </Button>
                <Button
                  onClick={testOperations.executeWorkflow}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Execute
                </Button>
                <Button
                  onClick={testOperations.checkAccess}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Check Access
                </Button>
                <Button
                  onClick={testOperations.getStats}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Get Stats
                </Button>
                <Button
                  onClick={testOperations.deleteWorkflow}
                  disabled={isLoading}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button
                  onClick={testOperations.testRealtime}
                  disabled={isLoading}
                  variant="secondary"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Real-time
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Results</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResult(null)
                  setError(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            ) : result ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Operation completed successfully
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-[500px]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click a test operation to see results here
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}
