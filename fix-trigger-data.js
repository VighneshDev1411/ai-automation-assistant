// Run this script to fix trigger node data in your database
// Usage: node fix-trigger-data.js

const { createClient } = require('@supabase/supabase-js')

// Get your Supabase credentials from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Clean trigger nodes
function cleanTriggerNodes(nodes) {
  return nodes.map((node) => {
    if (node.type !== 'trigger') return node

    const data = node.data || {}
    let config = { ...(data.config || {}) }

    // FIX NESTED CONFIG ISSUE: If config.config exists, flatten it
    if (config.config) {
      // Move fields from nested config up one level
      const nestedConfig = config.config
      delete config.config

      // If there's a schedule at the parent config level, use it
      if (config.schedule) {
        config.schedule = config.schedule
      }
      if (config.timezone) {
        config.timezone = config.timezone
      }
      if (config.enabled !== undefined) {
        config.enabled = config.enabled
      }
    }

    // Move root-level fields into config
    if (data.schedule && !config.schedule) config.schedule = data.schedule
    if (data.timezone && !config.timezone) config.timezone = data.timezone
    if (data.enabled !== undefined && config.enabled === undefined) config.enabled = data.enabled
    if (data.cron && !config.schedule) config.schedule = data.cron

    // Ensure defaults for schedule triggers
    if (data.triggerType === 'schedule' || data.type === 'schedule') {
      if (!config.timezone) config.timezone = 'America/Chicago'
      if (config.enabled === undefined) config.enabled = true
    }

    // Create clean data with proper structure
    return {
      ...node,
      data: {
        triggerType: data.triggerType || data.type,
        config: config,
        label: data.label || 'Trigger',
        ...(data.webhookUrl && { webhookUrl: data.webhookUrl }),
      },
    }
  })
}

async function fixWorkflows() {
  console.log('🔧 Fetching workflows...')

  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('id, name, nodes')

  if (error) {
    console.error('❌ Error fetching workflows:', error)
    return
  }

  console.log(`📋 Found ${workflows.length} workflows`)

  let fixedCount = 0

  for (const workflow of workflows) {
    const nodes = workflow.nodes || []
    const triggerNodes = nodes.filter(n => n.type === 'trigger')

    if (triggerNodes.length === 0) continue

    // Check if trigger nodes need fixing
    const needsFix = triggerNodes.some(n => {
      const data = n.data || {}
      const config = data.config || {}

      // Check for nested config issue
      const hasNestedConfig = config.config !== undefined

      // Check if fields are at root level (wrong structure)
      const hasRootSchedule = data.schedule !== undefined && !config.schedule
      const hasRootTimezone = data.timezone !== undefined && !config.timezone
      const hasRootEnabled = data.enabled !== undefined && config.enabled === undefined
      const hasOldCron = data.cron !== undefined

      return hasNestedConfig || hasRootSchedule || hasRootTimezone || hasRootEnabled || hasOldCron
    })

    if (!needsFix) {
      console.log(`✓ ${workflow.name}: Already clean`)
      console.log(`  Trigger data:`, JSON.stringify(triggerNodes[0].data, null, 2))
      continue
    }

    console.log(`🔄 ${workflow.name}: Cleaning trigger nodes...`)
    console.log('   Before:', JSON.stringify(triggerNodes[0].data, null, 2))

    const cleanedNodes = cleanTriggerNodes(nodes)

    console.log('   After:', JSON.stringify(cleanedNodes.find(n => n.type === 'trigger').data, null, 2))

    const { error: updateError } = await supabase
      .from('workflows')
      .update({
        nodes: cleanedNodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflow.id)

    if (updateError) {
      console.error(`   ❌ Error updating: ${updateError.message}`)
    } else {
      console.log(`   ✅ Fixed!`)
      fixedCount++
    }
  }

  console.log(`\n🎉 Done! Fixed ${fixedCount} workflow(s)`)
}

fixWorkflows().catch(console.error)
