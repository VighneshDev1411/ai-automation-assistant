require('dotenv').config({ path: '.env.local' });
const { Queue } = require('bullmq');
const Redis = require('ioredis');

async function testWorkflowExecution() {
  console.log('🧪 Testing Workflow Execution Engine\n');

  // Create Redis connection
  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  // Create queue instance
  const workflowQueue = new Queue('workflow-execution', { connection });

  const workflowId = '6432c9e2-3bb7-4aeb-aa1f-d0301b8fc709';
  const organizationId = '4e1cc9f8-b493-4109-8d1e-36e70932389d';
  const userId = '3b9fe96f-8c82-49a5-a20a-68b7b2c1f6bf';

  console.log('📋 Test Details:');
  console.log(`   Workflow: GitHub Activity Monitor`);
  console.log(`   Workflow ID: ${workflowId}`);
  console.log(`   Organization ID: ${organizationId}`);
  console.log(`   User ID: ${userId}\n`);

  try {
    console.log('🚀 Adding job to queue...');
    
    const job = await workflowQueue.add(
      'execute-workflow',
      {
        workflowId,
        organizationId,
        userId,
        triggerType: 'manual',
        triggerData: {
          testMode: true,
          executedAt: new Date().toISOString()
        }
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
        attempts: 1
      }
    );

    console.log(`✅ Job added successfully!`);
    console.log(`   Job ID: ${job.id}`);
    console.log(`   Job Name: ${job.name}\n`);

    console.log('📊 Monitor execution in:');
    console.log('   1. Worker logs (npm run worker:dev)');
    console.log('   2. Database: workflow_executions table');
    console.log('   3. Database: execution_logs table\n');

    console.log('🔍 Check execution status:');
    console.log(`   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c \\
     "SELECT id, status, started_at, completed_at, result FROM workflow_executions \\
      WHERE workflow_id = '${workflowId}' ORDER BY started_at DESC LIMIT 1;"\n`);

    console.log('📝 View execution logs:');
    console.log(`   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c \\
     "SELECT step, status, message, created_at FROM execution_logs \\
      WHERE workflow_id = '${workflowId}' ORDER BY created_at DESC LIMIT 10;"\n`);

    await connection.quit();
    console.log('✅ Test execution trigger completed!');
  } catch (error) {
    console.error('❌ Error triggering workflow:', error);
    await connection.quit();
    process.exit(1);
  }
}

testWorkflowExecution();
