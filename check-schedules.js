// Check active schedules
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchedules() {
  console.log('🔍 Checking active schedules...\n')

  const { data: schedules, error } = await supabase
    .from('workflow_schedules')
    .select(`
      id,
      workflow_id,
      cron_expression,
      timezone,
      next_run_at,
      last_run_at,
      status,
      workflows (
        id,
        name,
        status
      )
    `)
    .eq('status', 'active')
    .order('next_run_at', { ascending: true })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (schedules.length === 0) {
    console.log('⚠️  No active schedules found!')
    console.log('\nTo create a schedule:')
    console.log('1. Open workflow builder')
    console.log('2. Configure trigger node with schedule')
    console.log('3. Save the workflow')
    return
  }

  console.log(`📋 Found ${schedules.length} active schedule(s):\n`)

  const now = new Date()

  schedules.forEach((schedule, index) => {
    const nextRun = new Date(schedule.next_run_at)
    const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null
    const timeUntilRun = Math.floor((nextRun - now) / 1000 / 60) // minutes

    console.log(`${index + 1}. ${schedule.workflows?.name || 'Unknown Workflow'}`)
    console.log(`   Cron: ${schedule.cron_expression}`)
    console.log(`   Timezone: ${schedule.timezone}`)
    console.log(`   Next Run: ${nextRun.toLocaleString('en-US', { timeZone: schedule.timezone })}`)
    console.log(`   Status: ${timeUntilRun <= 0 ? '🔥 SHOULD RUN NOW!' : `⏰ In ${timeUntilRun} minutes`}`)
    console.log(`   Last Run: ${lastRun ? lastRun.toLocaleString('en-US', { timeZone: schedule.timezone }) : 'Never'}`)
    console.log(`   Workflow Status: ${schedule.workflows?.status || 'unknown'}`)
    console.log()
  })

  // Show current time in different timezones
  console.log('🕐 Current Time:')
  console.log(`   UTC: ${now.toISOString()}`)
  console.log(`   Chicago: ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })}`)
  console.log()

  // Check for schedules that should run now
  const shouldRunNow = schedules.filter(s => new Date(s.next_run_at) <= now)
  if (shouldRunNow.length > 0) {
    console.log(`🔥 ${shouldRunNow.length} schedule(s) ready to execute!`)
  }
}

checkSchedules().catch(console.error)
