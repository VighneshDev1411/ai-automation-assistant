// src/lib/ai/tools/WorkflowTools.ts
import { ToolDefinition } from '../FunctionCallingSystem'

/**
 * Workflow Tools - Integration between Function Calling and Workflow Engine
 */

export const triggerWorkflow: ToolDefinition = {
  name: 'trigger_workflow',
  description:
    'Execute a workflow with provided data. Can trigger any available workflow in the system.',
  parameters: {
    workflow_id: {
      name: 'workflow_id',
      type: 'string',
      description: 'ID of the workflow to execute (e.g., wf_001)',
      required: false,
    },
    workflow_name: {
      name: 'workflow_name',
      type: 'string',
      description: 'Name of the workflow to execute (e.g., Email Notification)',
      required: false,
    },
    input_data: {
      name: 'input_data',
      type: 'object',
      description: 'Data to pass to the workflow as input/trigger data',
      required: false,
    },
    trigger_type: {
      name: 'trigger_type',
      type: 'string',
      description: 'Type of trigger (manual, webhook, scheduled)',
      required: false,
      enum: ['manual', 'webhook', 'scheduled'],
    },
  },
  category: 'automation',
  enabled: true,
  timeout: 30000,
  handler: async params => {
    const {
      workflow_id,
      workflow_name,
      input_data = {},
      trigger_type = 'manual',
    } = params

    try {
      // Mock workflows - keep consistent with list_workflows
      const mockWorkflows = [
        {
          id: 'wf_001',
          name: 'Email Notification Workflow',
          description: 'Send personalized email notifications to users',
        },
        {
          id: 'wf_002',
          name: 'Data Processing Workflow',
          description: 'Process and transform incoming data files',
        },
        {
          id: 'wf_003',
          name: 'Report Generation Workflow',
          description: 'Generate automated reports from database',
        },
        {
          id: 'wf_004',
          name: 'User Onboarding Workflow',
          description:
            'Automated user onboarding with welcome emails and setup',
        },
        {
          id: 'wf_005',
          name: 'Backup Workflow',
          description: 'Automated database and file backup workflow',
        },
      ]

      // If no workflow specified, return available workflows
      if (!workflow_id && !workflow_name) {
        return {
          success: false,
          message: 'No workflow specified. Available workflows:',
          available_workflows: mockWorkflows.map(wf => ({
            id: wf.id,
            name: wf.name,
            description: wf.description,
          })),
          example_usage:
            'Use: trigger_workflow with workflow_id="wf_001" or workflow_name="Email Notification"',
        }
      }

      // Find workflow by ID or name - IMPROVED MATCHING
      let selectedWorkflow = null
      if (workflow_id) {
        selectedWorkflow = mockWorkflows.find(wf => wf.id === workflow_id)
      } else if (workflow_name) {
        // Try exact match first
        selectedWorkflow = mockWorkflows.find(
          wf => wf.name.toLowerCase() === workflow_name.toLowerCase()
        )

        // If no exact match, try partial match
        if (!selectedWorkflow) {
          selectedWorkflow = mockWorkflows.find(
            wf =>
              wf.name.toLowerCase().includes(workflow_name.toLowerCase()) ||
              workflow_name
                .toLowerCase()
                .includes(wf.name.toLowerCase().split(' ')[0])
          )
        }
      }

      if (!selectedWorkflow) {
        return {
          success: false,
          error: `Workflow not found: "${workflow_id || workflow_name}"`,
          suggestion:
            'Try using the exact workflow name or ID from the list_workflows tool',
          available_workflows: mockWorkflows.map(wf => ({
            id: wf.id,
            name: wf.name,
            usage_example: `trigger_workflow with workflow_id="${wf.id}"`,
          })),
        }
      }

      // Mock execution
      const executionId = `exec_${Date.now()}`

      return {
        success: true,
        execution_id: executionId,
        workflow_id: selectedWorkflow.id,
        workflow_name: selectedWorkflow.name,
        status: 'running',
        message: `✅ Successfully triggered "${selectedWorkflow.name}"`,
        details: {
          description: selectedWorkflow.description,
          input_data,
          trigger_type,
          started_at: new Date().toISOString(),
          estimated_duration: '2-5 minutes',
          next_steps: `Use get_workflow_status with execution_id="${executionId}" to check progress`,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to trigger workflow: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },
}
export const getWorkflowStatus: ToolDefinition = {
  name: 'get_workflow_status',
  description: 'Check the status of a running or completed workflow execution',
  parameters: {
    execution_id: {
      name: 'execution_id',
      type: 'string',
      description: 'ID of the workflow execution to check',
      required: true,
    },
  },
  category: 'automation',
  enabled: true,
  timeout: 10000,
  handler: async params => {
    const { execution_id } = params

    try {
      // Mock status check - replace with actual workflow engine integration
      const mockStatuses = ['running', 'completed', 'failed', 'pending']
      const randomStatus =
        mockStatuses[Math.floor(Math.random() * mockStatuses.length)]

      const mockExecution = {
        execution_id,
        status: randomStatus,
        workflow_name: 'Email Notification Workflow',
        started_at: new Date(Date.now() - Math.random() * 300000).toISOString(), // Random recent time
        completed_at:
          randomStatus === 'completed' || randomStatus === 'failed'
            ? new Date().toISOString()
            : null,
        progress:
          randomStatus === 'running'
            ? Math.floor(Math.random() * 80) + 10
            : 100,
        steps_completed:
          randomStatus === 'running' ? Math.floor(Math.random() * 5) + 1 : 6,
        total_steps: 6,
        result:
          randomStatus === 'completed'
            ? {
                message: 'Workflow completed successfully',
                emails_sent: 3,
                notifications_sent: 5,
              }
            : null,
        error:
          randomStatus === 'failed'
            ? 'Email service temporarily unavailable'
            : null,
      }

      // Here you would integrate with your actual workflow engine:
      // const execution = await workflowEngine.getExecutionStatus(execution_id)

      return {
        success: true,
        ...mockExecution,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get workflow status: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },
}

export const listWorkflows: ToolDefinition = {
  name: 'list_workflows',
  description: 'Get a list of all available workflows that can be executed',
  parameters: {
    category: {
      name: 'category',
      type: 'string',
      description: 'Filter workflows by category (optional)',
      required: false,
      enum: ['email', 'data', 'reports', 'notifications', 'automation'],
    },
    status: {
      name: 'status',
      type: 'string',
      description: 'Filter by workflow status (optional)',
      required: false,
      enum: ['active', 'inactive', 'draft'],
    },
  },
  category: 'automation',
  enabled: true,
  timeout: 10000,
  handler: async params => {
    const { category, status } = params

    try {
      // Mock workflows - replace with actual workflow engine integration
      const mockWorkflows = [
        {
          id: 'wf_001',
          name: 'Email Notification Workflow',
          description: 'Send personalized email notifications to users',
          category: 'email',
          status: 'active',
          created_at: '2024-01-15T10:30:00Z',
          last_executed: '2024-01-20T14:22:00Z',
          execution_count: 42,
          success_rate: 98.5,
          triggers: ['webhook', 'manual'],
          required_inputs: ['recipient_email', 'message_template'],
        },
        {
          id: 'wf_002',
          name: 'Data Processing Workflow',
          description: 'Process and transform incoming data files',
          category: 'data',
          status: 'active',
          created_at: '2024-01-10T09:15:00Z',
          last_executed: '2024-01-20T16:45:00Z',
          execution_count: 128,
          success_rate: 95.2,
          triggers: ['webhook', 'scheduled'],
          required_inputs: ['data_source', 'output_format'],
        },
        {
          id: 'wf_003',
          name: 'Report Generation Workflow',
          description: 'Generate automated reports from database',
          category: 'reports',
          status: 'active',
          created_at: '2024-01-08T11:00:00Z',
          last_executed: '2024-01-20T08:00:00Z',
          execution_count: 89,
          success_rate: 99.1,
          triggers: ['scheduled', 'manual'],
          required_inputs: ['report_type', 'date_range'],
        },
        {
          id: 'wf_004',
          name: 'User Onboarding Workflow',
          description:
            'Automated user onboarding with welcome emails and setup',
          category: 'automation',
          status: 'active',
          created_at: '2024-01-05T13:20:00Z',
          last_executed: '2024-01-19T20:30:00Z',
          execution_count: 67,
          success_rate: 97.8,
          triggers: ['webhook', 'manual'],
          required_inputs: ['user_id', 'user_email', 'plan_type'],
        },
        {
          id: 'wf_005',
          name: 'Backup Workflow',
          description: 'Automated database and file backup workflow',
          category: 'automation',
          status: 'inactive',
          created_at: '2024-01-03T07:45:00Z',
          last_executed: '2024-01-18T02:00:00Z',
          execution_count: 156,
          success_rate: 99.9,
          triggers: ['scheduled'],
          required_inputs: [],
        },
      ]

      // Apply filters
      let filteredWorkflows = mockWorkflows

      if (category) {
        filteredWorkflows = filteredWorkflows.filter(
          wf => wf.category.toLowerCase() === category.toLowerCase()
        )
      }

      if (status) {
        filteredWorkflows = filteredWorkflows.filter(
          wf => wf.status.toLowerCase() === status.toLowerCase()
        )
      }

      // Here you would integrate with your actual workflow engine:
      // const workflows = await workflowEngine.listWorkflows({ category, status })

      return {
        success: true,
        workflows: filteredWorkflows,
        total_count: filteredWorkflows.length,
        filters_applied: {
          category: category || 'all',
          status: status || 'all',
        },
        available_categories: [
          'email',
          'data',
          'reports',
          'notifications',
          'automation',
        ],
        available_statuses: ['active', 'inactive', 'draft'],
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list workflows: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },
}

// Export all workflow tools
export const WORKFLOW_TOOLS: ToolDefinition[] = [
  triggerWorkflow,
  getWorkflowStatus,
  listWorkflows,
]
