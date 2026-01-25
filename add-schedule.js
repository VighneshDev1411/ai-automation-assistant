// Quick script to add schedule to BullMQ
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redis = new Redis('redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const queue = new Queue('workflow-execution', {
  connection: redis,
});

async function addSchedule() {
  try {
    console.log('Adding schedule to BullMQ...');
    
    const job = await queue.add(
      'execute-workflow',
      {
        workflowId: '3d120385-f1dc-4b6d-83ed-7dcddb01afb0',
        organizationId: '4e1cc9f8-b493-4109-8d1e-36e70932389d',
        userId: '3b9fe96f-8c82-49a5-a20a-68b7b2c1f6bf',
        triggerData: {
          trigger_type: 'schedule',
          scheduled_at: new Date().toISOString(),
        },
        source: 'scheduled',
      },
      {
        repeat: {
          pattern: '*/5 * * * *',
          tz: 'America/New_York',
        },
        jobId: 'scheduled-3d120385-f1dc-4b6d-83ed-7dcddb01afb0',
      }
    );

    console.log('✅ Schedule added to queue!');
    console.log('Job ID:', job.id);
    console.log('Job name:', job.name);
    
    // Get repeatable jobs
    const repeatableJobs = await queue.getRepeatableJobs();
    console.log('\n📅 All repeatable jobs:');
    repeatableJobs.forEach(job => {
      console.log(`  - ${job.name} (${job.id})`);
      console.log(`    Pattern: ${job.pattern}`);
      console.log(`    Next run: ${new Date(job.next).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await queue.close();
    await redis.quit();
    process.exit(0);
  }
}

addSchedule();
