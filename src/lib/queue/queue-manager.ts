// src/lib/queue/queue-manager.ts
/**
 * Job Queue Manager using BullMQ
 * Handles workflow execution, scheduled jobs, and background tasks
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { getRedisConnectionOptions } from '@/lib/redis/client'

// Queue names
export const QUEUE_NAMES = {
  WORKFLOW_EXECUTION: 'workflow-execution',
  SCHEDULED_WORKFLOWS: 'scheduled-workflows',
  EMAIL_SENDING: 'email-sending',
  FILE_PROCESSING: 'file-processing',
  AI_AGENT_TASKS: 'ai-agent-tasks',
  INTEGRATION_SYNC: 'integration-sync',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// Job data types
export interface WorkflowExecutionJobData {
  workflowId: string
  organizationId: string
  userId: string
  triggerData?: any
  source: 'manual' | 'scheduled' | 'webhook' | 'api'
  executionId?: string
}

export interface ScheduledWorkflowJobData {
  workflowId: string
  organizationId: string
  userId: string
  cronExpression: string
  timezone: string
  enabled: boolean
}

// Queue instances (singletons)
const queues: Map<string, Queue> = new Map()
const workers: Map<string, Worker> = new Map()
const queueEvents: Map<string, QueueEvents> = new Map()

/**
 * Get or create a queue instance
 */
export function getQueue(queueName: QueueName): Queue {
  if (queues.has(queueName)) {
    return queues.get(queueName)!
  }

  const queue = new Queue(queueName, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2 seconds initial delay
      },
      removeOnComplete: {
        age: 60 * 60 * 24 * 7, // Keep completed jobs for 7 days
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 30, // Keep failed jobs for 30 days
      },
    },
  })

  queues.set(queueName, queue)
  console.log(`✅ Queue created: ${queueName}`)

  return queue
}

/**
 * Get queue events listener
 */
export function getQueueEvents(queueName: QueueName): QueueEvents {
  if (queueEvents.has(queueName)) {
    return queueEvents.get(queueName)!
  }

  const events = new QueueEvents(queueName, {
    connection: getRedisConnectionOptions(),
  })

  // Set up event listeners
  events.on('completed', ({ jobId, returnvalue }) => {
    console.log(`✅ Job completed: ${jobId}`)
  })

  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Job failed: ${jobId}`, failedReason)
  })

  events.on('progress', ({ jobId, data }) => {
    console.log(`⏳ Job progress: ${jobId}`, data)
  })

  queueEvents.set(queueName, events)
  return events
}

/**
 * Add a job to the workflow execution queue
 */
export async function addWorkflowExecutionJob(
  data: WorkflowExecutionJobData,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
) {
  const queue = getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION)

  const job = await queue.add('execute-workflow', data, {
    jobId: options?.jobId || `workflow-${data.workflowId}-${Date.now()}`,
    priority: options?.priority || 0,
    delay: options?.delay || 0,
  })

  console.log(`📥 Workflow execution job added: ${job.id}`)
  return job
}

/**
 * Schedule a recurring workflow (cron job)
 */
export async function scheduleWorkflow(
  workflowId: string,
  cronExpression: string,
  data: Omit<WorkflowExecutionJobData, 'workflowId'>,
  timezone: string = 'UTC'
) {
  const queue = getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION)

  // Create repeatable job
  const job = await queue.add(
    'execute-workflow',
    {
      ...data,
      workflowId,
      source: 'scheduled',
    },
    {
      repeat: {
        pattern: cronExpression,
        tz: timezone,
      },
      jobId: `scheduled-${workflowId}`,
    }
  )

  console.log(`⏰ Scheduled workflow: ${workflowId} with cron: ${cronExpression}`)
  return job
}

/**
 * Remove a scheduled workflow
 */
export async function unscheduleWorkflow(workflowId: string) {
  const queue = getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION)

  // Remove repeatable job by key
  const repeatableJobs = await queue.getRepeatableJobs()
  const jobToRemove = repeatableJobs.find((job) => job.id === `scheduled-${workflowId}`)

  if (jobToRemove) {
    await queue.removeRepeatableByKey(jobToRemove.key)
    console.log(`🗑️ Unscheduled workflow: ${workflowId}`)
    return true
  }

  return false
}

/**
 * Get all scheduled workflows
 */
export async function getScheduledWorkflows() {
  const queue = getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION)
  const repeatableJobs = await queue.getRepeatableJobs()

  return repeatableJobs.map((job) => ({
    id: job.id,
    name: job.name,
    pattern: job.pattern,
    timezone: job.tz || 'UTC',
    next: job.next,
    key: job.key,
  }))
}

/**
 * Get job by ID
 */
export async function getJob(queueName: QueueName, jobId: string): Promise<Job | undefined> {
  const queue = getQueue(queueName)
  return await queue.getJob(jobId)
}

/**
 * Get job counts
 */
export async function getQueueCounts(queueName: QueueName) {
  const queue = getQueue(queueName)

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  }
}

/**
 * Get recent jobs
 */
export async function getRecentJobs(queueName: QueueName, limit: number = 50) {
  const queue = getQueue(queueName)

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaiting(0, limit),
    queue.getActive(0, limit),
    queue.getCompleted(0, limit),
    queue.getFailed(0, limit),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
  }
}

/**
 * Retry a failed job
 */
export async function retryJob(queueName: QueueName, jobId: string) {
  const job = await getJob(queueName, jobId)

  if (job && (await job.isFailed())) {
    await job.retry()
    console.log(`🔄 Retrying job: ${jobId}`)
    return true
  }

  return false
}

/**
 * Remove a job
 */
export async function removeJob(queueName: QueueName, jobId: string) {
  const job = await getJob(queueName, jobId)

  if (job) {
    await job.remove()
    console.log(`🗑️ Job removed: ${jobId}`)
    return true
  }

  return false
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: QueueName) {
  const queue = getQueue(queueName)
  await queue.pause()
  console.log(`⏸️ Queue paused: ${queueName}`)
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: QueueName) {
  const queue = getQueue(queueName)
  await queue.resume()
  console.log(`▶️ Queue resumed: ${queueName}`)
}

/**
 * Clean old jobs from queue
 */
export async function cleanQueue(
  queueName: QueueName,
  grace: number = 60000, // 1 minute
  limit: number = 1000,
  type: 'completed' | 'failed' = 'completed'
) {
  const queue = getQueue(queueName)
  const cleaned = await queue.clean(grace, limit, type)
  console.log(`🧹 Cleaned ${cleaned.length} ${type} jobs from ${queueName}`)
  return cleaned
}

/**
 * Obliterate a queue (delete all data)
 */
export async function obliterateQueue(queueName: QueueName) {
  const queue = getQueue(queueName)
  await queue.obliterate({ force: true })
  console.log(`💥 Queue obliterated: ${queueName}`)
}

/**
 * Close all queues and workers
 */
export async function closeAllQueues() {
  console.log('🔒 Closing all queues and workers...')

  // Close all workers
  for (const [name, worker] of workers.entries()) {
    await worker.close()
    console.log(`🔒 Worker closed: ${name}`)
  }

  // Close all queue events
  for (const [name, events] of queueEvents.entries()) {
    await events.close()
    console.log(`🔒 Queue events closed: ${name}`)
  }

  // Close all queues
  for (const [name, queue] of queues.entries()) {
    await queue.close()
    console.log(`🔒 Queue closed: ${name}`)
  }

  // Clear maps
  workers.clear()
  queueEvents.clear()
  queues.clear()

  console.log('✅ All queues and workers closed')
}

/**
 * Register a worker (used in worker process)
 */
export function registerWorker(queueName: QueueName, worker: Worker) {
  workers.set(queueName, worker)
  console.log(`👷 Worker registered: ${queueName}`)
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queues...')
  await closeAllQueues()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing queues...')
  await closeAllQueues()
  process.exit(0)
})
