// src/lib/ai/tools/SafetyTools.ts
import { ToolDefinition } from '../FunctionCallingSystem'
import { safetyManager } from '../SafetyManager'

/**
 * Safety Tools for content moderation and compliance
 */

export const checkContentSafety: ToolDefinition = {
  name: 'check_content_safety',
  description: 'Check if content meets safety guidelines and filter harmful content',
  parameters: {
    content: {
      name: 'content',
      type: 'string',
      description: 'Content to check for safety violations',
      required: true
    },
    content_type: {
      name: 'content_type',
      type: 'string',
      description: 'Type of content being checked',
      required: false,
      enum: ['input', 'output']
    },
    session_id: {
      name: 'session_id',
      type: 'string',
      description: 'Session ID for audit logging',
      required: false
    },
    organization_id: {
      name: 'organization_id',
      type: 'string',
      description: 'Organization ID',
      required: false
    }
  },
  category: 'automation',
  enabled: true,
  timeout: 5000,
  handler: async (params) => {
    const { 
      content, 
      content_type = 'output',
      session_id = crypto.randomUUID(),
      organization_id = 'default-org'
    } = params
    
    try {
      const result = await safetyManager.filterContent(
        content,
        content_type as 'input' | 'output',
        {
          sessionId: session_id,
          organizationId: organization_id,
          agentId: 'safety-check',
          toolUsed: 'check_content_safety'
        }
      )
      
      return {
        success: true,
        is_safe: result.isAllowed,
        action_taken: result.action,
        filtered_content: result.filteredContent,
        violations_found: result.violations.length,
        violations: result.violations.map(v => ({
          type: v.violationType,
          severity: v.severity,
          rules_violated: v.rulesViolated,
          timestamp: v.timestamp.toISOString()
        })),
        safety_score: result.violations.length === 0 ? 100 : Math.max(0, 100 - (result.violations.length * 20)),
        recommendations: result.violations.length > 0 ? [
          'Review content for compliance with safety policies',
          'Consider rephrasing to avoid flagged terms',
          'Ensure content meets organizational guidelines'
        ] : ['Content passes all safety checks'],
        checked_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Safety check failed: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const checkCompliance: ToolDefinition = {
  name: 'check_compliance',
  description: 'Check content for compliance with regulatory standards (GDPR, HIPAA, etc.)',
  parameters: {
    content: {
      name: 'content',
      type: 'string',
      description: 'Content to check for compliance',
      required: true
    },
    compliance_type: {
      name: 'compliance_type',
      type: 'string',
      description: 'Type of compliance standard to check against',
      required: true,
      enum: ['gdpr', 'hipaa', 'sox', 'pci', 'general']
    },
    organization_id: {
      name: 'organization_id',
      type: 'string',
      description: 'Organization ID',
      required: false
    }
  },
  category: 'automation',
  enabled: true,
  timeout: 5000,
  handler: async (params) => {
    const { content, compliance_type, organization_id = 'default-org' } = params
    
    try {
      const result = await safetyManager.checkCompliance(
        content,
        compliance_type as 'gdpr' | 'hipaa' | 'sox' | 'pci' | 'general',
        organization_id
      )
      
      const complianceNames = {
        gdpr: 'General Data Protection Regulation (GDPR)',
        hipaa: 'Health Insurance Portability and Accountability Act (HIPAA)',
        sox: 'Sarbanes-Oxley Act (SOX)',
        pci: 'Payment Card Industry Data Security Standard (PCI DSS)',
        general: 'General Compliance Standards'
      }
      
      return {
        success: true,
        is_compliant: result.isCompliant,
        compliance_standard: complianceNames[compliance_type as keyof typeof complianceNames],
        compliance_score: result.isCompliant ? 100 : Math.max(0, 100 - (result.issues.length * 25)),
        issues_found: result.issues.length,
        issues: result.issues,
        recommendations: result.recommendations,
        risk_level: result.issues.length === 0 ? 'low' : 
                   result.issues.length <= 2 ? 'medium' : 'high',
        next_steps: result.isCompliant ? [
          'Content meets compliance requirements',
          'No further action required'
        ] : [
          'Address identified compliance issues',
          'Implement recommended safeguards',
          'Review organizational compliance policies'
        ],
        checked_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Compliance check failed: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const getSafetyStats: ToolDefinition = {
  name: 'get_safety_stats',
  description: 'Get safety and compliance statistics for a time period',
  parameters: {
    days: {
      name: 'days',
      type: 'number',
      description: 'Number of days to look back (default: 7)',
      required: false
    },
    organization_id: {
      name: 'organization_id',
      type: 'string',
      description: 'Organization ID',
      required: false
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { days = 7, organization_id = 'default-org' } = params
    
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const stats = safetyManager.getSafetyStats({ start: startDate, end: endDate })
      
      return {
        success: true,
        time_period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days
        },
        overall_compliance_score: stats.complianceScore,
        total_violations: stats.totalViolations,
        violations_by_type: stats.violationsByType,
        violations_by_severity: stats.violationsBySeverity,
        safety_trends: {
          daily_average: Math.round(stats.totalViolations / days * 10) / 10,
          risk_level: stats.totalViolations === 0 ? 'low' : 
                     stats.totalViolations <= 5 ? 'medium' : 'high'
        },
        recommendations: stats.totalViolations === 0 ? [
          'Excellent safety performance',
          'Continue current safety practices'
        ] : [
          'Review safety policies for high-violation areas',
          'Provide additional training on content guidelines',
          'Consider stricter content filtering for repeat violations'
        ],
        generated_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get safety stats: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const getViolationHistory: ToolDefinition = {
  name: 'get_violation_history',
  description: 'Get recent safety violations and audit logs',
  parameters: {
    limit: {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of violations to return (default: 10)',
      required: false
    },
    severity: {
      name: 'severity',
      type: 'string',
      description: 'Filter by violation severity',
      required: false,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { limit = 10, severity } = params
    
    try {
      let violations = safetyManager.getViolations(limit * 2) // Get more to filter
      
      // Filter by severity if specified
      if (severity) {
        violations = violations.filter(v => v.severity === severity)
      }
      
      // Limit results
      violations = violations.slice(0, limit)
      
      return {
        success: true,
        total_violations: violations.length,
        violations: violations.map(v => ({
          id: v.id,
          violation_type: v.violationType,
          severity: v.severity,
          action_taken: v.action,
          rules_violated: v.rulesViolated,
          timestamp: v.timestamp.toISOString(),
          content_preview: v.content.substring(0, 100) + (v.content.length > 100 ? '...' : ''),
          session_id: v.sessionId,
          context: {
            agent_id: v.context.agentId,
            tool_used: v.context.toolUsed
          }
        })),
        audit_summary: {
          critical_violations: violations.filter(v => v.severity === 'critical').length,
          high_violations: violations.filter(v => v.severity === 'high').length,
          medium_violations: violations.filter(v => v.severity === 'medium').length,
          low_violations: violations.filter(v => v.severity === 'low').length
        },
        filters_applied: {
          limit,
          severity: severity || 'all'
        },
        generated_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get violation history: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const emergencyStop: ToolDefinition = {
  name: 'emergency_stop',
  description: 'Emergency stop all AI operations (use only in critical situations)',
  parameters: {
    reason: {
      name: 'reason',
      type: 'string',
      description: 'Reason for emergency stop',
      required: true
    },
    activated_by: {
      name: 'activated_by',
      type: 'string',
      description: 'Who is activating the emergency stop',
      required: false
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { reason, activated_by = 'ai-agent' } = params
    
    try {
      safetyManager.activateEmergencyStop(reason, activated_by)
      
      return {
        success: true,
        message: '🚨 EMERGENCY STOP ACTIVATED',
        reason,
        activated_by,
        status: 'All AI operations have been stopped',
        next_steps: [
          'Review the situation that triggered the emergency stop',
          'Address any safety concerns',
          'Use deactivate_emergency_stop when safe to resume',
          'Check audit logs for detailed information'
        ],
        activated_at: new Date().toISOString(),
        warning: 'All AI agents and tools are now disabled until emergency stop is deactivated'
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to activate emergency stop: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const deactivateEmergencyStop: ToolDefinition = {
  name: 'deactivate_emergency_stop',
  description: 'Deactivate emergency stop and resume AI operations',
  parameters: {
    deactivated_by: {
      name: 'deactivated_by',
      type: 'string',
      description: 'Who is deactivating the emergency stop',
      required: true
    },
    safety_confirmed: {
      name: 'safety_confirmed',
      type: 'boolean',
      description: 'Confirm that safety issues have been resolved',
      required: true
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { deactivated_by, safety_confirmed } = params
    
    if (!safety_confirmed) {
      return {
        success: false,
        error: 'Cannot deactivate emergency stop without safety confirmation'
      }
    }
    
    try {
      safetyManager.deactivateEmergencyStop(deactivated_by)
      
      return {
        success: true,
        message: '✅ Emergency stop deactivated',
        deactivated_by,
        status: 'AI operations have been resumed',
        safety_status: 'Confirmed safe to operate',
        next_steps: [
          'Monitor AI operations closely',
          'Review safety logs for any issues',
          'Ensure all safety policies are up to date'
        ],
        deactivated_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to deactivate emergency stop: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

// Export all safety tools
export const SAFETY_TOOLS: ToolDefinition[] = [
  checkContentSafety,
  checkCompliance,
  getSafetyStats,
  getViolationHistory,
  emergencyStop,
  deactivateEmergencyStop
]