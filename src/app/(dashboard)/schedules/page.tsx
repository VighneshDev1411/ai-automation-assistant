'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { ScheduleDialog } from '@/components/workflows/ScheduleDialog'

interface Schedule {
  id: string
  workflow_id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  successful_runs: number
  failed_runs: number
  created_at: string
  workflow?: {
    id: string
    name: string
    status: string
  }
}

export default function SchedulesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's organization
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

      const membership = (memberships || []).find(m => m)

      if (!membership) {
        setSchedules([])
        setLoading(false)
        return
      }

      // Load schedules with workflow info
      const { data, error } = await supabase
        .from('workflow_schedules')
        .select(`
          *,
          workflow:workflows (
            id,
            name,
            status
          )
        `)
        .eq('organization_id', membership.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSchedules(data || [])
    } catch (error: any) {
      console.error('Error loading schedules:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load schedules',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSchedule = async (schedule: Schedule) => {
    try {
      const newEnabled = !schedule.enabled

      const response = await fetch(`/api/workflows/${schedule.workflow_id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update schedule')
      }

      toast({
        title: newEnabled ? 'Schedule Enabled' : 'Schedule Disabled',
        description: `Workflow will ${newEnabled ? 'now' : 'no longer'} run automatically`
      })

      loadSchedules()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const deleteSchedule = async (schedule: Schedule) => {
    if (!confirm(`Delete schedule "${schedule.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/workflows/${schedule.workflow_id}/schedule`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete schedule')
      }

      toast({
        title: 'Schedule Deleted',
        description: 'The workflow schedule has been removed'
      })

      loadSchedules()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const formatNextRun = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled'
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff < 0) return 'Overdue'
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`
    return 'in less than a minute'
  }

  const getSuccessRate = (schedule: Schedule) => {
    if (schedule.total_runs === 0) return 0
    return Math.round((schedule.successful_runs / schedule.total_runs) * 100)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated workflow executions
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && schedules.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scheduled Workflows</h3>
            <p className="text-muted-foreground text-center mb-4">
              Schedule workflows to run automatically at specific times
            </p>
            <Button onClick={() => router.push('/workflows')}>
              Go to Workflows
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedules Grid */}
      {!loading && schedules.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      {schedule.workflow?.name || 'Unknown Workflow'}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {schedule.name}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={() => toggleSchedule(schedule)}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {schedule.enabled ? (
                    <Badge className="bg-green-500">
                      <Play className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Pause className="mr-1 h-3 w-3" />
                      Paused
                    </Badge>
                  )}
                  
                  {getSuccessRate(schedule) >= 90 && schedule.total_runs > 0 && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {getSuccessRate(schedule)}%
                    </Badge>
                  )}
                  {getSuccessRate(schedule) < 90 && schedule.total_runs > 0 && (
                    <Badge variant="outline" className="text-orange-600">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      {getSuccessRate(schedule)}%
                    </Badge>
                  )}
                </div>

                {/* Schedule Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {schedule.cron_expression}
                    </code>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {schedule.enabled
                        ? `Next: ${formatNextRun(schedule.next_run_at)}`
                        : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{schedule.total_runs}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {schedule.successful_runs}
                    </div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {schedule.failed_runs}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSchedule(schedule)
                      setShowDialog(true)
                    }}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteSchedule(schedule)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {selectedSchedule && (
        <ScheduleDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          workflowId={selectedSchedule.workflow_id}
          workflowName={selectedSchedule.workflow?.name || 'Workflow'}
          existingSchedule={selectedSchedule}
          onSuccess={() => {
            setShowDialog(false)
            loadSchedules()
          }}
        />
      )}
    </div>
  )
}

