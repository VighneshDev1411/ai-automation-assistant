'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { WorkflowBuilderWrapper } from './WorkflowBuilder'
import { ValidationEngine } from '@/lib/workflow-engine/core/ValidationEngine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

interface WorkflowBuilderEnhancedProps {
  workflowId?: string
  initialWorkflow?: any
  onSave?: (workflow: any) => void
  onExecute?: (workflow: any) => void
}

export function WorkflowBuilderEnhanced(props: WorkflowBuilderEnhancedProps) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }>({ isValid: true, errors: [], warnings: [] })
  
  const [isValidating, setIsValidating] = useState(false)
  const validationEngine = new ValidationEngine()

  // Real-time validation with debounce
  const validateWorkflowRealtime = useCallback(
    debounce(async (workflow: any) => {
      if (!workflow) return
      
      setIsValidating(true)
      try {
        const result = await validationEngine.validateWorkflow(workflow)
        setValidationResult(result)
      } catch (error) {
        setValidationResult({
          isValid: false,
          errors: ['Validation failed'],
          warnings: []
        })
      } finally {
        setIsValidating(false)
      }
    }, 1000),
    []
  )

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <WorkflowBuilderEnhanced {...props} />
      </div>
      
      {/* Real-time Validation Panel */}
      <Card className="w-80 rounded-none border-l">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Real-time Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isValidating ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 animate-pulse" />
              Validating...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="default">Valid</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <Badge variant="destructive">Invalid</Badge>
                  </>
                )}
              </div>

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Errors ({validationResult.errors.length}):</div>
                    <ul className="space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Warnings ({validationResult.warnings.length}):</div>
                    <ul className="space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success message */}
              {validationResult.isValid && validationResult.errors.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Workflow is valid and ready to save or execute.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}