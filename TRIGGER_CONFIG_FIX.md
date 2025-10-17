# Trigger Configuration Fix: Unified Configuration System

## Problem

The trigger node had **two separate configuration interfaces**, causing data inconsistencies:

### Before (Broken):
```json
{
  "cron": "21 4 * *",           // From NodeInspector (right panel)
  "path": "/webhook/demo-form",  // From NodeInspector
  "type": "schedule",            // From NodeInspector
  "config": {},                  // Empty!
  "schedule": "19 4 * * *"       // From TriggerNode dialog
}
```

**Issues:**
1. Two different cron expressions (`cron` vs `schedule`)
2. Conflicting data stored in different locations
3. User confusion about which configuration UI to use
4. Data not being saved properly to the workflow

---

## Solution

**Single Source of Truth:** TriggerNode's Settings Dialog

### After (Fixed):
```json
{
  "triggerType": "schedule",
  "config": {
    "schedule": "48 7 * * *",
    "timezone": "America/Chicago",
    "enabled": true
  },
  "label": "Schedule Trigger",
  "isActive": true
}
```

---

## Changes Made

### 1. **Removed Duplicate Configuration from NodeInspector**

**File:** `/src/app/components/workflow-builder/NodeInspector.tsx`

**Before:**
```tsx
const renderTriggerConfig = () => (
  <div>
    <Select value={config.type} onChange={...}>
      <SelectItem value="schedule">Schedule</SelectItem>
    </Select>
    {config.type === 'schedule' && (
      <Input value={config.cron} onChange={...} />
    )}
  </div>
)
```

**After:**
```tsx
const renderTriggerConfig = () => (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm">⚙️ Configure Trigger</p>
    <p className="text-xs">
      Click the <strong>Settings icon</strong> on the trigger node
      (in the canvas) to configure trigger settings.
    </p>
  </div>

  {/* Show current configuration (read-only) */}
  {node?.data?.triggerType && (
    <div>
      <strong>Type:</strong> {node.data.triggerType}
      <strong>Schedule:</strong> {node.data.config.schedule}
      <strong>Timezone:</strong> {node.data.config.timezone}
    </div>
  )}
)
```

### 2. **TriggerNode Dialog is Now Primary**

**File:** `/src/components/workflow-builder/nodes/TriggerNode.tsx`

The TriggerNode's settings dialog already has comprehensive configuration:
- Trigger type selection (webhook, schedule, email, file, database)
- Dynamic field configuration based on type
- Field validation
- Timezone support with Chicago as default
- Visual feedback (badges, colors, status)

### 3. **Clear Data Structure**

```typescript
interface TriggerNodeData {
  label: string                      // "Schedule Trigger"
  triggerType?: keyof typeof triggerTypes  // "schedule"
  config: {                          // Type-specific configuration
    // For schedule type:
    schedule: string                 // "48 7 * * *"
    timezone: string                 // "America/Chicago"
    enabled: boolean                 // true

    // For webhook type:
    path?: string                    // "/webhook/demo-form"
    method?: string                  // "POST"
    authentication?: string          // "none"

    // For email type:
    emailAddress?: string
    filterSubject?: string
    // ... etc
  }
  isActive?: boolean                 // Whether trigger is active
  webhookUrl?: string                // Generated webhook URL (for webhook type)
}
```

---

## How to Configure Triggers

### Step-by-Step Guide

1. **Add Trigger Node to Canvas**
   - Drag & drop from the nodes panel
   - Or use the "Add Node" button

2. **Click the Settings Icon ⚙️**
   - Located on the trigger node card
   - Opens the configuration dialog

3. **Select Trigger Type**
   - Webhook
   - Schedule (recommended for cron jobs)
   - Email Received
   - File Upload
   - Database Change

4. **Configure Type-Specific Fields**

   **For Schedule:**
   - **Cron Expression** (required): `48 7 * * *`
   - **Timezone** (defaults to America/Chicago)
   - **Enabled** (toggle on/off)

   **For Webhook:**
   - **HTTP Method**: POST, GET, PUT, PATCH
   - **Webhook Path** (required): `/webhook/my-trigger`
   - **Authentication**: none, api_key, bearer_token
   - **Response Format**: json, xml, text

5. **Save Configuration**
   - Click "Save Configuration" button
   - Configuration is immediately applied to the node
   - Visual feedback shows configured state

6. **Verify Configuration**
   - Node shows green checkmark ✓
   - Key details displayed on the node card
   - Badge shows "Active" or "Inactive" status

---

## Where NOT to Configure

### ❌ Don't Use Right Panel for Triggers

The **NodeInspector** (right sidebar panel) now shows:
- **Info message** directing you to use the TriggerNode dialog
- **Read-only display** of current configuration
- **No editable fields** for trigger configuration

**Why?** To avoid data conflicts and confusion.

---

## Data Flow

```
User configures trigger
       ↓
TriggerNode Dialog
       ↓
handleSave() function
       ↓
Updates node.data
       ↓
{
  triggerType: "schedule",
  config: { schedule, timezone, enabled },
  label: "Schedule Trigger"
}
       ↓
React Flow state
       ↓
WorkflowBuilder
       ↓
API /workflows/:id (on save)
       ↓
Supabase workflows table
```

---

## For Developers

### Reading Trigger Configuration

```typescript
// In WorkflowBuilder or other components
const trigger = workflow.nodes.find(n => n.type === 'trigger')

if (trigger && trigger.data.triggerType === 'schedule') {
  const cronExpression = trigger.data.config.schedule
  const timezone = trigger.data.config.timezone
  const enabled = trigger.data.config.enabled

  // Use these values to create a schedule
  await createSchedule({
    workflowId: workflow.id,
    cron: cronExpression,
    timezone: timezone
  })
}
```

### Updating Trigger Configuration Programmatically

```typescript
// Update trigger node data
const updatedNode = {
  ...triggerNode,
  data: {
    ...triggerNode.data,
    triggerType: 'schedule',
    config: {
      schedule: '0 9 * * 1-5',
      timezone: 'America/Chicago',
      enabled: true
    },
    label: 'Schedule Trigger'
  }
}

// Apply update to React Flow
onNodesChange([
  {
    type: 'update',
    id: triggerNode.id,
    item: updatedNode
  }
])
```

---

## Testing the Fix

### 1. Create a New Workflow

1. Go to workflow builder
2. Add a trigger node
3. Click the settings icon on the node
4. Select "Schedule" trigger type
5. Enter cron expression: `48 7 * * *`
6. Select timezone: `America/Chicago`
7. Enable the trigger
8. Click "Save Configuration"
9. Save the workflow

### 2. Verify Data Structure

Check the saved workflow in the database:

```sql
SELECT nodes FROM workflows WHERE id = 'your-workflow-id';
```

Should see:
```json
[
  {
    "id": "trigger-1",
    "type": "trigger",
    "data": {
      "triggerType": "schedule",
      "config": {
        "schedule": "48 7 * * *",
        "timezone": "America/Chicago",
        "enabled": true
      },
      "label": "Schedule Trigger"
    },
    "position": { "x": 100, "y": 100 }
  }
]
```

### 3. Verify No Conflicts

The config should NOT have:
- ❌ `cron` and `schedule` fields together
- ❌ `type` field at the root level
- ❌ Empty `config: {}` object
- ❌ Duplicate data in different locations

---

## Benefits

✅ **Single Configuration Interface**
- One place to configure all trigger settings
- No confusion about which UI to use

✅ **Consistent Data Structure**
- All trigger data in `triggerType` and `config`
- No duplicate or conflicting fields

✅ **Better UX**
- Clear visual feedback on the node
- Comprehensive configuration dialog
- Validation and error handling

✅ **Easier Debugging**
- Single data structure to inspect
- Clear separation of concerns
- Predictable data flow

✅ **Maintainable Code**
- One component responsible for trigger config
- Reduced code duplication
- Clear ownership

---

## Migration Guide

### If You Have Existing Workflows with Old Structure

Run this migration script:

```typescript
// migrate-trigger-config.ts
async function migrateTriggerConfig(workflowId: string) {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('nodes')
    .eq('id', workflowId)
    .single()

  const nodes = workflow.nodes.map(node => {
    if (node.type !== 'trigger') return node

    // Old structure
    const oldConfig = node.data.config || {}

    // Migrate to new structure
    return {
      ...node,
      data: {
        triggerType: oldConfig.type || 'webhook',
        config: {
          // For schedule type
          schedule: oldConfig.cron || oldConfig.schedule,
          timezone: oldConfig.timezone || 'America/Chicago',
          enabled: oldConfig.enabled !== false,

          // For webhook type
          path: oldConfig.path,
          method: oldConfig.method,
          authentication: oldConfig.authentication,
          responseFormat: oldConfig.responseFormat,
        },
        label: node.data.label || `${oldConfig.type || 'webhook'} Trigger`,
        isActive: oldConfig.enabled !== false
      }
    }
  })

  await supabase
    .from('workflows')
    .update({ nodes })
    .eq('id', workflowId)
}
```

---

## Related Files

- `/src/components/workflow-builder/nodes/TriggerNode.tsx` - Primary configuration UI
- `/src/app/components/workflow-builder/NodeInspector.tsx` - Updated to show info only
- `/src/app/components/workflow-builder/WorkflowBuilder.tsx` - Main workflow editor
- `/src/lib/workflow-engine/core/TriggerSystem.ts` - Backend trigger handling

---

## Support

If you see duplicate or conflicting trigger configuration:
1. Delete the trigger node
2. Add a fresh trigger node
3. Configure using the Settings icon ⚙️ on the node
4. Do not use the right panel for trigger configuration
5. Save the workflow

The new structure will ensure clean, consistent data.
