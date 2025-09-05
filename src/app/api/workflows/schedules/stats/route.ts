import { supabase } from '@/lib/supabase/supabase-test'
import { TriggerSystem } from '@/lib/workflow-engine/core/TriggerSystem'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const scheduler = new TriggerSystem(supabase)
    const stats = await scheduler.getStats()

    // Enhanced statistics
    const enhancedStats = {
      ...stats,
      systemInfo: {
        schedulerRunning: scheduler['isRunning'] || false,
        uptime: scheduler['startTime']
          ? Date.now() - scheduler['startTime']
          : 0,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
      performance: {
        averageExecutionTime: stats.averageExecutionTime,
        successRate: stats.successRate,
        totalExecutions: (await scheduler.getExecutionHistory(null, 10000))
          .length,
        failedExecutions: (
          await scheduler.getExecutionHistory(null, 10000)
        ).filter(e => e.status === 'failed').length,
      },
      upcoming: {
        nextHour: stats.nextScheduledExecutions.filter(
          (e: any) => e.scheduledTime.getTime() - Date.now() <= 60 * 60 * 1000
        ).length,
        next24Hours: stats.nextScheduledExecutions.filter(
          (e: any) =>
            e.scheduledTime.getTime() - Date.now() <= 24 * 60 * 60 * 1000
        ).length,
      },
    }

    return NextResponse.json({
      success: true,
      stats: enhancedStats,
    })
  } catch (error) {
    console.error('Error fetching scheduler stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
