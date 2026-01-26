# Phase 1.1.3 - Webhook Triggers & Manual Execution 🔗

**Start Date:** January 26, 2026  
**Status:** 🚧 IN PROGRESS  
**Priority:** HIGH  
**Dependencies:** Phase 1.1.1 ✅ & Phase 1.1.2 ✅

---

## 🎯 Objectives

Implement **Webhook Triggers** and **Manual Workflow Execution** to complete the core trigger system. This enables external systems to trigger workflows and allows users to test/execute workflows on-demand.

---

## 📋 Current State Analysis

### ✅ What We Have:
- ✅ Schedule triggers (Phase 1.1.1) - WORKING
- ✅ Email actions (Phase 1.1.2) - WORKING
- ✅ Workflow execution engine - WORKING
- ✅ UI components for webhook/manual triggers - EXISTS (not connected)
- ✅ Database schema for workflows

### ❌ What's Missing:
- ❌ Webhook endpoint to receive HTTP requests
- ❌ Webhook authentication/security
- ❌ Manual execution API endpoint
- ❌ Manual execution UI button
- ❌ Webhook URL generation and display
- ❌ Request payload validation
- ❌ Webhook logs and monitoring

---

## 🏗️ Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              External System / User                      │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  Webhook Endpoint│            │  Manual Trigger  │
│  /api/webhooks/  │            │  /api/workflows/ │
│  [workflow_id]   │            │  [id]/execute    │
└──────────────────┘            └──────────────────┘
          │                               │
          └───────────────┬───────────────┘
                          ▼
              ┌─────────────────────┐
              │  Validate Request   │
              │  - Auth check       │
              │  - Payload validate │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  Add to BullMQ      │
              │  (workflow-queue)   │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  Workflow Worker    │
              │  (Existing)         │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  Execution Engine   │
              │  (Existing)         │
              └─────────────────────┘
```

---

## 📦 Implementation Tasks

### Task 1: Database Schema Updates (30 minutes)

#### Add webhook configuration to workflows table
```sql
-- Add webhook settings to workflows
ALTER TABLE workflows 
ADD COLUMN webhook_enabled BOOLEAN DEFAULT false,
ADD COLUMN webhook_secret VARCHAR(255),
ADD COLUMN webhook_auth_type VARCHAR(50) DEFAULT 'none',
ADD COLUMN webhook_config JSONB DEFAULT '{}'::jsonb;

-- Create webhook_logs table
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    -- Request details
    method VARCHAR(10) NOT NULL,
    headers JSONB NOT NULL,
    query_params JSONB,
    body JSONB,
    source_ip VARCHAR(50),
    
    -- Response details
    status_code INTEGER NOT NULL,
    response_body JSONB,
    
    -- Execution tracking
    execution_id UUID REFERENCES workflow_executions(id),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Timing
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_workflow_id ON webhook_logs(workflow_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);

-- RLS policies for webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view webhook logs"
ON webhook_logs FOR SELECT
USING (organization_id IN (SELECT get_user_organizations(auth.uid())));
```

---

### Task 2: Webhook API Endpoint (2-3 hours)

#### File: `src/app/api/webhooks/[workflowId]/route.ts`

```typescript
// POST /api/webhooks/[workflowId]
// Receives webhook requests and triggers workflows

import { NextRequest, NextResponse } from 'next/server'
import { createWorkerClient } from '@/lib/supabase/worker-client'
import { QueueManager } from '@/lib/queue/queue-manager'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const startTime = Date.now()
  const supabase = createWorkerClient()
  
  try {
    const workflowId = params.workflowId
    
    // Get workflow configuration
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()
    
    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    // Check if webhook is enabled
    if (!workflow.webhook_enabled) {
      return NextResponse.json(
        { error: 'Webhook not enabled for this workflow' },
        { status: 403 }
      )
    }
    
    // Validate authentication
    const authValid = await validateWebhookAuth(request, workflow)
    if (!authValid) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const headers = Object.fromEntries(request.headers)
    const query = Object.fromEntries(request.nextUrl.searchParams)
    
    // Queue workflow execution
    const queueManager = QueueManager.getInstance()
    const job = await queueManager.addWorkflowExecution({
      workflowId,
      organizationId: workflow.organization_id,
      userId: workflow.created_by,
      triggerType: 'webhook',
      triggerData: {
        body,
        headers,
        query,
        method: request.method,
        timestamp: new Date().toISOString(),
        sourceIp: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })
    
    const duration = Date.now() - startTime
    
    // Log webhook request
    await supabase.from('webhook_logs').insert({
      workflow_id: workflowId,
      organization_id: workflow.organization_id,
      method: request.method,
      headers,
      query_params: query,
      body,
      source_ip: request.headers.get('x-forwarded-for') || 'unknown',
      status_code: 200,
      response_body: { jobId: job.id },
      success: true,
      duration_ms: duration,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Workflow triggered successfully',
      workflowId,
      jobId: job.id,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error: any) {
    console.error('Webhook error:', error)
    
    // Log error
    try {
      await supabase.from('webhook_logs').insert({
        workflow_id: params.workflowId,
        organization_id: 'unknown',
        method: request.method,
        headers: {},
        status_code: 500,
        success: false,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
      })
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Also support GET for testing
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  return NextResponse.json({
    message: 'Webhook endpoint active',
    workflowId: params.workflowId,
    method: 'POST',
    timestamp: new Date().toISOString(),
  })
}

async function validateWebhookAuth(
  request: NextRequest,
  workflow: any
): Promise<boolean> {
  const authType = workflow.webhook_auth_type || 'none'
  
  switch (authType) {
    case 'none':
      return true
    
    case 'api_key':
      const apiKey = request.headers.get('x-api-key')
      return apiKey === workflow.webhook_secret
    
    case 'bearer_token':
      const auth = request.headers.get('authorization')
      const token = auth?.replace('Bearer ', '')
      return token === workflow.webhook_secret
    
    case 'hmac':
      const signature = request.headers.get('x-webhook-signature')
      const body = await request.text()
      const expectedSignature = crypto
        .createHmac('sha256', workflow.webhook_secret)
        .update(body)
        .digest('hex')
      return signature === expectedSignature
    
    default:
      return false
  }
}
```

---

### Task 3: Manual Execution API (1 hour)

#### File: `src/app/api/workflows/[id]/execute/route.ts`

```typescript
// POST /api/workflows/[id]/execute
// Manually trigger a workflow execution

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueueManager } from '@/lib/queue/queue-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const workflowId = params.id
    
    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*, organization_id')
      .eq('id', workflowId)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    // Parse input data from request
    const body = await request.json().catch(() => ({}))
    const inputData = body.input || {}
    
    // Queue workflow execution
    const queueManager = QueueManager.getInstance()
    const job = await queueManager.addWorkflowExecution({
      workflowId,
      organizationId: workflow.organization_id,
      userId: user.id,
      triggerType: 'manual',
      triggerData: {
        ...inputData,
        triggeredBy: user.id,
        triggeredAt: new Date().toISOString(),
        manual: true,
      },
    })
    
    console.log(`✅ Manual execution queued: ${workflow.name}`)
    
    return NextResponse.json({
      success: true,
      message: 'Workflow execution started',
      workflowId,
      jobId: job.id,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error: any) {
    console.error('Manual execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow', details: error.message },
      { status: 500 }
    )
  }
}
```

---

### Task 4: Webhook Configuration UI (2-3 hours)

#### File: `src/components/workflows/WebhookConfigDialog.tsx`

Features:
- Enable/disable webhook
- Generate unique webhook URL
- Choose authentication type (none, API key, bearer token, HMAC)
- Generate/regenerate webhook secret
- Copy webhook URL
- Test webhook with sample request
- View recent webhook logs

---

### Task 5: Manual Execution Button (1 hour)

Add "Execute Now" button to:
- Workflow detail page
- Workflows list (dropdown menu)
- Workflow editor toolbar

Features:
- Input data form (optional)
- Confirmation dialog
- Real-time execution status
- Link to execution logs

---

### Task 6: Webhook Logs Dashboard (2 hours)

#### Page: `src/app/(dashboard)/webhooks/page.tsx`

Features:
- List all webhook requests
- Filter by workflow, status, date
- View request/response details
- Retry failed webhooks
- Export logs

---

## 🧪 Testing Strategy

### Test 1: Webhook Trigger
```bash
# Test webhook endpoint
curl -X POST https://app.cogniflow.com/api/webhooks/{workflow-id} \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-secret" \
  -d '{
    "event": "order.created",
    "orderId": "12345",
    "customer": "John Doe"
  }'
```

### Test 2: Manual Execution
```typescript
// Via UI: Click "Execute Now" button
// Via API:
await fetch('/api/workflows/{id}/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: {
      testData: 'Manual execution test'
    }
  })
})
```

### Test 3: Webhook Authentication
- Test with no auth
- Test with valid API key
- Test with invalid API key
- Test with HMAC signature

---

## 📊 Success Metrics

- [ ] Webhook endpoint responds < 200ms
- [ ] Manual execution works from UI
- [ ] Webhook authentication works
- [ ] Logs captured correctly
- [ ] No security vulnerabilities
- [ ] UI is intuitive

---

## 🔒 Security Considerations

1. **Authentication**
   - Support multiple auth types
   - Secure secret generation (crypto.randomBytes)
   - Rate limiting per workflow
   - IP whitelisting (optional)

2. **Validation**
   - Validate workflow exists and is active
   - Validate payload size (limit to 1MB)
   - Sanitize input data
   - Prevent injection attacks

3. **Monitoring**
   - Log all webhook requests
   - Alert on unusual patterns
   - Track failed authentications
   - Monitor execution times

---

## ⏱️ Estimated Timeline

| Task | Time | Priority |
|------|------|----------|
| Database Schema | 30 min | HIGH |
| Webhook API | 2-3 hrs | HIGH |
| Manual Execution API | 1 hr | HIGH |
| Webhook Config UI | 2-3 hrs | MEDIUM |
| Manual Execution Button | 1 hr | HIGH |
| Webhook Logs Dashboard | 2 hrs | LOW |
| Testing & Documentation | 2 hrs | HIGH |
| **Total** | **10-13 hrs** | |

**Estimated Completion:** 1-2 days

---

## 🚀 Implementation Order

1. ✅ **Phase 1:** Core Functionality (Must Have)
   - Database migration
   - Webhook API endpoint
   - Manual execution API
   - Basic authentication

2. ⭐ **Phase 2:** User Experience (Should Have)
   - Manual execution button in UI
   - Webhook configuration dialog
   - Simple webhook URL display

3. 🎨 **Phase 3:** Advanced Features (Nice to Have)
   - Webhook logs dashboard
   - Test webhook UI
   - Retry functionality
   - Advanced auth options

---

## 📝 Definition of Done

Phase 1.1.3 is complete when:
- [x] Webhook endpoint receives and processes requests
- [x] Manual execution works from UI and API
- [x] Webhook authentication is implemented
- [x] All requests are logged to database
- [x] UI shows webhook URL and config
- [x] Documentation is complete
- [x] Tests pass
- [x] No security vulnerabilities

---

**Let's build it! 🚀**
