import { NextResponse } from "next/server"

export async function GET() {
  try {
    const templates = [
      {
        id: 'email_validation',
        name: 'Email Validation',
        description: 'Validate email format and domain',
        category: 'validation',
        conditions: [
          {
            id: 'email_format',
            type: 'simple',
            field: 'user.email',
            operator: 'matches_regex',
            value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            metadata: { name: 'Email Format Check' }
          }
        ],
        onTrue: {
          actionIds: ['continue'],
          continueWorkflow: true
        },
        onFalse: {
          actionIds: ['validation_error'],
          continueWorkflow: false,
          setVariables: { error: 'Invalid email format' }
        },
        options: {
          evaluationMode: 'all',
          stopOnFirstFailure: true,
          timeout: 5000,
          cacheResults: true,
          logLevel: 'basic'
        }
      },
      {
        id: 'business_hours',
        name: 'Business Hours Check',
        description: 'Check if current time is within business hours',
        category: 'time',
        conditions: [
          {
            id: 'business_hours',
            type: 'custom',
            customFunction: 'timeBasedCondition',
            value: { businessHours: true },
            metadata: { name: 'Business Hours Check' }
          }
        ],
        onTrue: {
          actionIds: ['process_immediately'],
          continueWorkflow: true
        },
        onFalse: {
          actionIds: ['queue_for_business_hours'],
          continueWorkflow: false,
          setVariables: { queuedForLater: true }
        },
        options: {
          evaluationMode: 'all',
          stopOnFirstFailure: false,
          timeout: 3000,
          cacheResults: false,
          logLevel: 'basic'
        }
      },
      {
        id: 'approval_workflow',
        name: 'Approval Workflow',
        description: 'Check if item has required approvals',
        category: 'approval',
        conditions: [
          {
            id: 'approval_status',
            type: 'simple',
            field: 'approval.status',
            operator: 'equals',
            value: 'approved',
            metadata: { name: 'Approval Status' }
          },
          {
            id: 'approver_count',
            type: 'simple',
            field: 'approval.approvers',
            operator: 'array_length_greater_than',
            value: 1,
            metadata: { name: 'Minimum Approvers' }
          }
        ],
        onTrue: {
          actionIds: ['execute_approved_action'],
          continueWorkflow: true,
          setVariables: { approved: true, approvedAt: '{{_meta.timestamp}}' }
        },
        onFalse: {
          actionIds: ['request_additional_approval'],
          continueWorkflow: false,
          setVariables: { needsApproval: true }
        },
        options: {
          evaluationMode: 'all',
          stopOnFirstFailure: false,
          timeout: 10000,
          cacheResults: true,
          logLevel: 'detailed'
        }
      },
      {
        id: 'data_quality_check',
        name: 'Data Quality Check',
        description: 'Validate data completeness and quality',
        category: 'validation',
        conditions: [
          {
            id: 'required_fields',
            type: 'complex',
            operator: 'and',
            conditions: [
              {
                id: 'name_exists',
                type: 'simple',
                field: 'data.name',
                operator: 'is_not_empty',
                value: true
              },
              {
                id: 'email_exists',
                type: 'simple',
                field: 'data.email',
                operator: 'is_not_empty',
                value: true
              }
            ],
            metadata: { name: 'Required Fields Check' }
          },
          {
            id: 'data_freshness',
            type: 'simple',
            field: 'data.lastUpdated',
            operator: 'date_after',
            value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            metadata: { name: 'Data Freshness Check' }
          }
        ],
        filters: [
          {
            id: 'quality_filter',
            name: 'Data Quality Filter',
            operator: 'and',
            filters: [
              {
                id: 'completeness',
                name: 'Completeness Check',
                field: 'data.completeness',
                operator: 'greater_than',
                value: 0.8,
                enabled: true,
                priority: 1
              }
            ],
            enabled: true
          }
        ],
        onTrue: {
          actionIds: ['process_high_quality_data'],
          continueWorkflow: true,
          setVariables: { dataQuality: 'high' }
        },
        onFalse: {
          actionIds: ['data_cleaning_required'],
          continueWorkflow: false,
          setVariables: { dataQuality: 'low', requiresCleaning: true }
        },
        options: {
          evaluationMode: 'all',
          stopOnFirstFailure: false,
          timeout: 15000,
          cacheResults: true,
          logLevel: 'detailed'
        }
      }
    ]

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    })

  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}