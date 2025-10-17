// Watch for workflow execution
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hpelxxyntnhbtslphsar.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZWx4eHludG5oYnRzbHBoc2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU2MDk3MywiZXhwIjoyMDY5MTM2OTczfQ.DsQAC2i9F_IaazR2cWOEoxFsXHO7et7gUBy84SnXR5M'

const supabase = createClient(supabaseUrl, supabaseKey)

let lastExecutionCount = 0

async function checkExecutions() {
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('id, status, started_at, completed_at, trigger_type')
    .order('started_at', { ascending: false })
    .limit(5)

  console.clear()
  console.log('⏱️  Watching for workflow executions...')
  console.log(`Time: ${new Date().toISOString()}\n`)

  if (executions && executions.length > 0) {
    if (executions.length > lastExecutionCount) {
      console.log('🎉 NEW EXECUTION DETECTED!\n')
    }
    lastExecutionCount = executions.length

    console.log('Recent Executions:')
    executions.forEach((exec, i) => {
      const started = new Date(exec.started_at)
      console.log(`${i + 1}. ${exec.id}`)
      console.log(`   Status: ${exec.status}`)
      console.log(`   Trigger: ${exec.trigger_type}`)
      console.log(`   Started: ${started.toLocaleString('en-US', { timeZone: 'America/Chicago' })}`)
      if (exec.completed_at) {
        const completed = new Date(exec.completed_at)
        const duration = Math.floor((completed - started) / 1000)
        console.log(`   Duration: ${duration}s`)
      }
      console.log()
    })
  } else {
    console.log('No executions yet. Waiting...\n')
  }

  // Show schedule status
  const { data: schedule } = await supabase
    .from('workflow_schedules')
    .select('next_run_at, last_run_at')
    .eq('status', 'active')
    .single()

  if (schedule) {
    const nextRun = new Date(schedule.next_run_at)
    const now = new Date()
    const secondsUntil = Math.floor((nextRun - now) / 1000)

    console.log('Schedule Status:')
    console.log(`Next Run: ${nextRun.toISOString()} (in ${secondsUntil}s)`)
    if (schedule.last_run_at) {
      console.log(`Last Run: ${new Date(schedule.last_run_at).toISOString()}`)
    }
  }

  console.log('\nPress Ctrl+C to stop')
}

// Check every 5 seconds
setInterval(checkExecutions, 5000)
checkExecutions()
