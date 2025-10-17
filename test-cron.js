// Manually test cron execution
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hpelxxyntnhbtslphsar.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZWx4eHludG5oYnRzbHBoc2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU2MDk3MywiZXhwIjoyMDY5MTM2OTczfQ.DsQAC2i9F_IaazR2cWOEoxFsXHO7et7gUBy84SnXR5M'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCronExecution() {
  console.log('🧪 Testing Cron Execution...\n')

  // Step 1: Check for schedules that should run
  const now = new Date()
  console.log(`Current time: ${now.toISOString()}`)
  console.log(`Chicago time: ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })}\n`)

  const { data: schedules, error } = await supabase
    .from('workflow_schedules')
    .select(`
      id,
      workflow_id,
      cron_expression,
      timezone,
      next_run_at,
      workflows!inner (
        id,
        name,
        status
      )
    `)
    .eq('status', 'active')
    .eq('workflows.status', 'active')

  if (error) {
    console.error('❌ Error fetching schedules:', error)
    return
  }

  console.log(`Found ${schedules.length} active schedule(s)\n`)

  // Step 2: Find schedules that should run (or are close)
  const shouldRun = schedules.filter(s => {
    const nextRun = new Date(s.next_run_at)
    const diffSeconds = (nextRun - now) / 1000
    return diffSeconds <= 120 // Within 2 minutes
  })

  if (shouldRun.length === 0) {
    console.log('⚠️  No schedules ready to run right now')
    console.log('\nNext scheduled run:')
    schedules.forEach(s => {
      const nextRun = new Date(s.next_run_at)
      const diffSeconds = Math.floor((nextRun - now) / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      console.log(`  - ${s.workflows.name}: in ${diffSeconds}s (${diffMinutes} min)`)
    })
    console.log('\n💡 To test now, update the schedule to run in the next 1-2 minutes')
    return
  }

  console.log(`🔥 ${shouldRun.length} schedule(s) ready to execute!\n`)

  // Step 3: Execute each workflow
  for (const schedule of shouldRun) {
    console.log(`Executing: ${schedule.workflows.name}`)
    console.log(`  Cron: ${schedule.cron_expression}`)
    console.log(`  Next Run: ${schedule.next_run_at}\n`)

    try {
      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: schedule.workflow_id,
          status: 'pending',
          trigger_type: 'scheduled',
          trigger_data: {
            schedule_id: schedule.id,
            cron: schedule.cron_expression
          },
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (execError) {
        console.error('  ❌ Error creating execution:', execError)
        continue
      }

      console.log(`  ✅ Execution created: ${execution.id}`)

      // Update last_run_at and calculate next_run_at
      const cronParser = require('cron-parser')
      const interval = cronParser.parseExpression(schedule.cron_expression, {
        tz: schedule.timezone,
        currentDate: new Date()
      })
      const nextRunAt = interval.next().toDate().toISOString()

      await supabase
        .from('workflow_schedules')
        .update({
          last_run_at: now.toISOString(),
          next_run_at: nextRunAt
        })
        .eq('id', schedule.id)

      console.log(`  ⏰ Next run scheduled for: ${new Date(nextRunAt).toLocaleString('en-US', { timeZone: schedule.timezone })}`)
      console.log()
    } catch (err) {
      console.error(`  ❌ Error executing:`, err.message)
    }
  }

  console.log('✅ Test complete!')
}

testCronExecution().catch(console.error)
