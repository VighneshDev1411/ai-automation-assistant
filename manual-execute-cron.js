// Manually execute the cron job logic (simulates what Vercel cron does)
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hpelxxyntnhbtslphsar.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZWx4eHludG5oYnRzbHBoc2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU2MDk3MywiZXhwIjoyMDY5MTM2OTczfQ.DsQAC2i9F_IaazR2cWOEoxFsXHO7et7gUBy84SnXR5M'

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeCron() {
  console.log('🚀 Manually Executing Cron Job Logic...\n')

  const now = new Date()
  console.log(`Current time: ${now.toISOString()}`)
  console.log(`Chicago time: ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })}\n`)

  // Step 1: Fetch schedules that should run
  const { data: schedules, error } = await supabase
    .from('workflow_schedules')
    .select(`
      id,
      workflow_id,
      cron_expression,
      timezone,
      next_run_at,
      last_run_at,
      workflows!inner (
        id,
        name,
        status,
        created_by
      )
    `)
    .eq('status', 'active')
    .eq('workflows.status', 'active')
    .lte('next_run_at', now.toISOString())

  if (error) {
    console.error('❌ Error fetching schedules:', error)
    return
  }

  console.log(`Found ${schedules.length} schedule(s) ready to execute\n`)

  if (schedules.length === 0) {
    console.log('⚠️  No schedules due to run right now')
    return
  }

  // Step 2: Execute each workflow
  let executedCount = 0

  for (const schedule of schedules) {
    console.log(`\n📋 Processing: ${schedule.workflows.name}`)
    console.log(`   Schedule ID: ${schedule.id}`)
    console.log(`   Cron: ${schedule.cron_expression}`)
    console.log(`   Next Run: ${schedule.next_run_at}`)

    try {
      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: schedule.workflow_id,
          status: 'running',
          trigger_data: {
            type: 'scheduled',
            schedule_id: schedule.id,
            cron: schedule.cron_expression,
            executed_at: now.toISOString()
          },
          result: {
            message: 'Workflow executed via cron scheduler'
          },
          created_by: schedule.workflows.created_by
        })
        .select()
        .single()

      if (execError) {
        console.error(`   ❌ Error creating execution:`, execError)
        continue
      }

      console.log(`   ✅ Execution created: ${execution.id}`)
      executedCount++

      // Calculate next run time using cron-parser
      try {
        const { parseExpression } = require('cron-parser')
        const interval = parseExpression(schedule.cron_expression, {
          tz: schedule.timezone,
          currentDate: now
        })
        const nextRunAt = interval.next().toDate().toISOString()

        console.log(`   📅 Next run: ${nextRunAt}`)
        console.log(`   📅 Chicago: ${new Date(nextRunAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })}`)

        // Update schedule
        await supabase
          .from('workflow_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt
          })
          .eq('id', schedule.id)

        console.log(`   ✅ Schedule updated`)
      } catch (cronError) {
        console.error(`   ⚠️  Could not calculate next run:`, cronError.message)
        // Fallback: manually set to tomorrow at same time
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setUTCHours(10, 7, 0, 0) // 5:07 AM Chicago time

        await supabase
          .from('workflow_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: tomorrow.toISOString()
          })
          .eq('id', schedule.id)

        console.log(`   ⚠️  Using fallback: tomorrow at 5:07 AM Chicago`)
      }

    } catch (error) {
      console.error(`   ❌ Error:`, error.message)
    }
  }

  console.log(`\n\n🎉 Cron execution completed!`)
  console.log(`   Executed: ${executedCount} workflow(s)`)
  console.log(`\n💡 Check workflow_executions table for results`)
}

executeCron().catch(console.error)
