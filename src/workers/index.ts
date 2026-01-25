// src/workers/index.ts
/**
 * Worker Process
 * Handles background job processing for workflows, emails, and other tasks
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for local development
config({ path: resolve(process.cwd(), '.env.local') })
// Also load .env as fallback
config()

import { Worker } from 'bullmq'
import { QUEUE_NAMES, registerWorker } from '@/lib/queue/queue-manager'
import { getRedisConnectionOptions } from '@/lib/redis/client'
import { workflowExecutionProcessor } from './processors/workflow-execution-processor'

console.log('🚀 Starting CogniFlow Worker Process...')
console.log('📋 Environment check:')
console.log('  - SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('  - SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
console.log('  - REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Missing')

// Create workflow execution worker
const workflowWorker = new Worker(
  QUEUE_NAMES.WORKFLOW_EXECUTION,
  workflowExecutionProcessor,
  {
    connection: getRedisConnectionOptions(),
    concurrency: 5, // Process up to 5 workflows simultaneously
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 1000, // per 1 second
    },
  }
)

// Register worker
registerWorker(QUEUE_NAMES.WORKFLOW_EXECUTION, workflowWorker)

// Worker event listeners
workflowWorker.on('ready', () => {
  console.log('✅ Workflow worker is ready')
})

workflowWorker.on('active', (job) => {
  console.log(`🔄 Processing job: ${job.id}`)
})

workflowWorker.on('completed', (job, result) => {
  console.log(`✅ Job completed: ${job.id}`)
})

workflowWorker.on('failed', (job, error) => {
  console.error(`❌ Job failed: ${job?.id}`, error.message)
})

workflowWorker.on('error', (error) => {
  console.error('❌ Worker error:', error)
})

workflowWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job stalled: ${jobId}`)
})

// Graceful shutdown
const shutdown = async () => {
  console.log('🔄 Shutting down worker...')
  
  await workflowWorker.close()
  
  console.log('✅ Worker shut down successfully')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log('✅ Worker process started successfully')
console.log('📊 Monitoring queues:', QUEUE_NAMES.WORKFLOW_EXECUTION)
