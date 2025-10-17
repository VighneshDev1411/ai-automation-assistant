// Update schedule to run in 2 minutes for testing
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hpelxxyntnhbtslphsar.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZWx4eHludG5oYnRzbHBoc2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU2MDk3MywiZXhwIjoyMDY5MTM2OTczfQ.DsQAC2i9F_IaazR2cWOEoxFsXHO7et7gUBy84SnXR5M'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateSchedule() {
  // Get current Chicago time
  const now = new Date()
  const chicagoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const currentMinute = chicagoTime.getMinutes()
  const currentHour = chicagoTime.getHours()

  // Set to run 2 minutes from now
  const testMinute = (currentMinute + 2) % 60
  const testHour = testMinute < currentMinute ? (currentHour + 1) % 24 : currentHour

  const testCron = `${testMinute} ${testHour} * * *`

  console.log(`🕐 Current Chicago time: ${chicagoTime.toLocaleTimeString()}`)
  console.log(`⏰ Setting schedule to: ${testCron} (in ~2 minutes)\n`)

  // Update the schedule
  const { data: schedule } = await supabase
    .from('workflow_schedules')
    .select('id, workflow_id')
    .eq('status', 'active')
    .single()

  if (!schedule) {
    console.error('❌ No active schedule found')
    return
  }

  // Calculate next_run_at using cron-parser
  const cronParser = require('cron-parser').default || require('cron-parser')
  const interval = cronParser.parseExpression(testCron, {
    tz: 'America/Chicago',
    currentDate: new Date()
  })
  const nextRunAt = interval.next().toDate()

  // Update schedule
  const { error: updateError } = await supabase
    .from('workflow_schedules')
    .update({
      cron_expression: testCron,
      next_run_at: nextRunAt.toISOString()
    })
    .eq('id', schedule.id)

  if (updateError) {
    console.error('❌ Error updating schedul', updateError)
    return
  }

  console.log('✅ Schedule updated!')
  console.log(`   Cron: ${testCron}`)
  console.log(`   Next Run: ${nextRunAt.toLocaleString('en-US', { timeZone: 'America/Chicago' })}`)
  console.log(`\n⏳ Workflow will execute in ~2 minutes...`)
  console.log(`   Check Vercel logs or run: node test-cron.js`)
}

updateSchedule().catch(console.error)
