// src/lib/ai/SafetyManager.ts
export interface SafetyPolicy {
  id: string
  name: string
  description: string
  rules: SafetyRule[]
  isActive: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export interface SafetyRule {
  id: string
  type: 'content_filter' | 'input_validation' | 'output_restriction' | 'compliance_check'
  pattern: string | RegExp
  action: 'blocked' | 'warned' | 'flagged' | 'modified'
  message: string
  category: 'inappropriate' | 'sensitive_data' | 'harmful' | 'confidential' | 'regulatory'
  enabled: boolean
}

export interface SafetyViolation {
  id: string
  content: string
  violationType: 'input' | 'output' | 'behavior'
  rulesViolated: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'blocked' | 'warned' | 'flagged' | 'modified'
  timestamp: Date
  userId?: string
  sessionId: string
  context: {
    agentId?: string
    toolUsed?: string
    organizationId: string
  }
}

export interface SafetyAuditLog {
  id: string
  event: 'content_filtered' | 'policy_triggered' | 'emergency_stop' | 'manual_review'
  details: {
    original_content?: string
    filtered_content?: string
    violation_reason: string
    action_taken: string
    reviewer?: string
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  sessionId: string
  organizationId: string
}

export class SafetyManager {
  private policies: Map<string, SafetyPolicy> = new Map()
  private violations: SafetyViolation[] = []
  private auditLogs: SafetyAuditLog[] = []
  private emergencyStop: boolean = false

  constructor() {
    this.initializeDefaultPolicies()
  }

  /**
   * Filter content for safety violations
   */
  async filterContent(
    content: string,
    type: 'input' | 'output',
    context: {
      sessionId: string
      organizationId: string
      agentId?: string
      toolUsed?: string
      userId?: string
    }
  ): Promise<{
    isAllowed: boolean
    filteredContent: string
    violations: SafetyViolation[]
    action: 'allow' | 'block' | 'warn' | 'modify'
  }> {
    if (this.emergencyStop) {
      return {
        isAllowed: false,
        filteredContent: '',
        violations: [],
        action: 'block'
      }
    }

    const violations: SafetyViolation[] = []
    let filteredContent = content
    let finalAction: 'allow' | 'block' | 'warn' | 'modify' = 'allow'

    // Check all active policies
    for (const policy of this.policies.values()) {
      if (!policy.isActive) continue

      for (const rule of policy.rules) {
        if (!rule.enabled) continue

        const violation = this.checkRule(content, rule, type, context)
        if (violation) {
          violations.push(violation)
          
          // Apply most restrictive action
          if (rule.action === 'blocked') {
            finalAction = 'block'
            filteredContent = ''
          } else if (rule.action === 'modified' && finalAction !== 'block') {
            finalAction = 'modify'
            filteredContent = this.applyContentModification(content, rule)
          } else if (rule.action === 'warned' && finalAction === 'allow') {
            finalAction = 'warn'
          }
        }
      }
    }

    // Log violations
    violations.forEach(violation => {
      this.violations.push(violation)
      this.logAuditEvent('content_filtered', {
        original_content: content,
        filtered_content: filteredContent,
        violation_reason: violation.rulesViolated.join(', '),
        action_taken: finalAction
      }, violation.severity, context.sessionId, context.organizationId)
    })

    return {
      isAllowed: finalAction !== 'block',
      filteredContent,
      violations,
      action: finalAction
    }
  }

  /**
   * Check compliance for enterprise requirements
   */
  async checkCompliance(
    content: string,
    complianceType: 'gdpr' | 'hipaa' | 'sox' | 'pci' | 'general',
    organizationId: string
  ): Promise<{
    isCompliant: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    switch (complianceType) {
      case 'gdpr':
        if (this.containsPersonalData(content)) {
          issues.push('Content may contain personal data subject to GDPR')
          recommendations.push('Ensure user consent for data processing')
          recommendations.push('Implement data anonymization if possible')
        }
        break

      case 'hipaa':
        if (this.containsHealthInfo(content)) {
          issues.push('Content may contain protected health information')
          recommendations.push('Ensure HIPAA-compliant data handling')
          recommendations.push('Implement access controls and audit logging')
        }
        break

      case 'pci':
        if (this.containsPaymentInfo(content)) {
          issues.push('Content may contain payment card information')
          recommendations.push('Ensure PCI DSS compliance')
          recommendations.push('Implement data encryption and tokenization')
        }
        break

      case 'general':
        if (this.containsSensitiveInfo(content)) {
          issues.push('Content may contain sensitive information')
          recommendations.push('Review content classification policies')
          recommendations.push('Implement appropriate access controls')
        }
        break
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Emergency stop all AI operations
   */
  activateEmergencyStop(reason: string, activatedBy: string): void {
    this.emergencyStop = true
    
    this.logAuditEvent('emergency_stop', {
      violation_reason: reason,
      action_taken: 'All AI operations stopped',
      reviewer: activatedBy
    }, 'critical', 'system', 'system')

    console.error(`🚨 EMERGENCY STOP ACTIVATED: ${reason} by ${activatedBy}`)
  }

  /**
   * Deactivate emergency stop
   */
  deactivateEmergencyStop(deactivatedBy: string): void {
    this.emergencyStop = false
    
    this.logAuditEvent('emergency_stop', {
      violation_reason: 'Emergency stop deactivated',
      action_taken: 'AI operations resumed',
      reviewer: deactivatedBy
    }, 'high', 'system', 'system')
  }

  /**
   * Get safety statistics
   */
  getSafetyStats(timeRange: { start: Date; end: Date }): {
    totalViolations: number
    violationsByType: Record<string, number>
    violationsBySeverity: Record<string, number>
    topViolatedRules: Array<{ rule: string; count: number }>
    complianceScore: number
  } {
    const filteredViolations = this.violations.filter(v => 
      v.timestamp >= timeRange.start && v.timestamp <= timeRange.end
    )

    const violationsByType = filteredViolations.reduce((acc, v) => {
      acc[v.violationType] = (acc[v.violationType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const violationsBySeverity = filteredViolations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalViolations: filteredViolations.length,
      violationsByType,
      violationsBySeverity,
      topViolatedRules: [], // Would implement with real data
      complianceScore: Math.max(0, 100 - (filteredViolations.length * 2)) // Simple scoring
    }
  }

  /**
   * List all violations
   */
  getViolations(limit: number = 50): SafetyViolation[] {
    return this.violations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * List audit logs
   */
  getAuditLogs(limit: number = 100): SafetyAuditLog[] {
    return this.auditLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Private methods
  private checkRule(
    content: string,
    rule: SafetyRule,
    type: 'input' | 'output',
    context: any
  ): SafetyViolation | null {
    let isViolation = false

    if (typeof rule.pattern === 'string') {
      isViolation = content.toLowerCase().includes(rule.pattern.toLowerCase())
    } else {
      isViolation = rule.pattern.test(content)
    }

    if (isViolation) {
      return {
        id: crypto.randomUUID(),
        content,
        violationType: type,
        rulesViolated: [rule.id],
        severity: this.getSeverityFromRule(rule),
        action: rule.action,
        timestamp: new Date(),
        userId: context.userId,
        sessionId: context.sessionId,
        context: {
          agentId: context.agentId,
          toolUsed: context.toolUsed,
          organizationId: context.organizationId
        }
      }
    }

    return null
  }

  private applyContentModification(content: string, rule: SafetyRule): string {
    // Simple content modification - in production, use more sophisticated filtering
    if (typeof rule.pattern === 'string') {
      return content.replace(new RegExp(rule.pattern, 'gi'), '[FILTERED]')
    } else {
      return content.replace(rule.pattern, '[FILTERED]')
    }
  }

  private getSeverityFromRule(rule: SafetyRule): 'low' | 'medium' | 'high' | 'critical' {
    switch (rule.category) {
      case 'harmful': return 'critical'
      case 'confidential': return 'high'
      case 'sensitive_data': return 'high'
      case 'regulatory': return 'medium'
      case 'inappropriate': return 'low'
      default: return 'medium'
    }
  }

  private containsPersonalData(content: string): boolean {
    const patterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ // Phone
    ]
    return patterns.some(pattern => pattern.test(content))
  }

  private containsHealthInfo(content: string): boolean {
    const healthTerms = ['diagnosis', 'medication', 'treatment', 'patient', 'medical', 'health record']
    return healthTerms.some(term => content.toLowerCase().includes(term))
  }

  private containsPaymentInfo(content: string): boolean {
    const patterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\bcvv\b/i,
      /\bexpir/i
    ]
    return patterns.some(pattern => pattern.test(content))
  }

  private containsSensitiveInfo(content: string): boolean {
    const sensitiveTerms = ['password', 'secret', 'private key', 'confidential', 'internal only']
    return sensitiveTerms.some(term => content.toLowerCase().includes(term))
  }

  private logAuditEvent(
    event: SafetyAuditLog['event'],
    details: SafetyAuditLog['details'],
    severity: SafetyAuditLog['severity'],
    sessionId: string,
    organizationId: string
  ): void {
    const auditLog: SafetyAuditLog = {
      id: crypto.randomUUID(),
      event,
      details,
      severity,
      timestamp: new Date(),
      sessionId,
      organizationId
    }

    this.auditLogs.push(auditLog)
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicy: SafetyPolicy = {
      id: 'default-safety-policy',
      name: 'Default Safety Policy',
      description: 'Basic safety rules for AI content filtering',
      rules: [
        {
          id: 'harmful-content',
          type: 'content_filter',
          pattern: /\b(violence|hate|harassment|illegal)\b/i,
          action: 'blocked',
          message: 'Content contains potentially harmful language',
          category: 'harmful',
          enabled: true
        },
        {
          id: 'sensitive-data',
          type: 'input_validation',
          pattern: /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
          action: 'warned',
          message: 'Content may contain sensitive personal data',
          category: 'sensitive_data',
          enabled: true
        },
        {
          id: 'inappropriate-language',
          type: 'content_filter',
          pattern: /\b(inappropriate|offensive)\b/i,
          action: 'warned',
          message: 'Content flagged for review',
          category: 'inappropriate',
          enabled: true
        }
      ],
      isActive: true,
      severity: 'medium',
      organizationId: 'default',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.policies.set(defaultPolicy.id, defaultPolicy)
  }
}

// Export singleton instance
export const safetyManager = new SafetyManager()