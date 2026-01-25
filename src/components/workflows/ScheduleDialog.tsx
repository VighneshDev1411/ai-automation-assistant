'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, Clock, AlertCircle } from 'lucide-react'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  workflowName: string
  existingSchedule?: any
  onSuccess?: () => void
}

const commonCronExpressions = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every day at 5 PM', value: '0 17 * * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'First day of month', value: '0 0 1 * *' },
  { label: 'Custom', value: 'custom' },
]

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
]

export function ScheduleDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  existingSchedule,
  onSuccess,
}: ScheduleDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState('*/15 * * * *')
  const [customCron, setCustomCron] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<{
    valid: boolean
    error?: string
    nextRuns?: string[]
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (existingSchedule) {
      setCustomCron(existingSchedule.cron_expression)
      setSelectedPreset('custom')
      setTimezone(existingSchedule.timezone || 'UTC')
      setEnabled(existingSchedule.enabled)
    }
  }, [existingSchedule])

  const getCronExpression = () => {
    return selectedPreset === 'custom' ? customCron : selectedPreset
  }

  useEffect(() => {
    const cronExpression = getCronExpression()
    if (cronExpression) {
      validateCron(cronExpression)
    }
  }, [selectedPreset, customCron])

  const validateCron = async (expression: string) => {
    if (!expression) return

    setValidating(true)
    try {
      const response = await fetch('/api/utils/validate-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronExpression: expression }),
      })

      const data = await response.json()
      setValidation(data)
    } catch (error) {
      setValidation({ valid: false, error: 'Failed to validate cron expression' })
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async () => {
    const cronExpression = getCronExpression()

    if (!cronExpression) {
      toast({
        title: 'Error',
        description: 'Please select or enter a cron expression',
        variant: 'destructive',
      })
      return
    }

    if (validation && !validation.valid) {
      toast({
        title: 'Invalid Cron Expression',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cronExpression,
          timezone,
          enabled,
          name: `${workflowName} Schedule`,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Schedule created successfully',
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create schedule')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create schedule',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule Workflow</DialogTitle>
          <DialogDescription>
            Automate the execution of "{workflowName}" with a cron schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="preset">Schedule Preset</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger id="preset">
                <SelectValue placeholder="Select a schedule" />
              </SelectTrigger>
              <SelectContent>
                {commonCronExpressions.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Cron Expression */}
          {selectedPreset === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom-cron">Custom Cron Expression</Label>
              <Input
                id="custom-cron"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day month weekday (e.g., "0 9 * * 1-5" = weekdays at 9 AM)
              </p>
            </div>
          )}

          {/* Validation Result */}
          {validation && (
            <div
              className={`p-3 rounded-lg border ${
                validation.valid
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}
            >
              {validation.valid ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <Clock className="h-4 w-4" />
                    Next 5 Executions:
                  </div>
                  <div className="space-y-1">
                    {validation.nextRuns?.map((run, index) => (
                      <div
                        key={index}
                        className="text-xs text-green-600 dark:text-green-500"
                      >
                        {new Date(run).toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Invalid Expression</div>
                    <div className="text-xs mt-1">{validation.error}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enabled Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled" className="flex-1">
              <div className="font-medium">Enable Schedule</div>
              <div className="text-xs text-muted-foreground">
                Start executing this workflow automatically
              </div>
            </Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || validating || (validation && !validation.valid)}
          >
            {loading ? 'Creating...' : existingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
