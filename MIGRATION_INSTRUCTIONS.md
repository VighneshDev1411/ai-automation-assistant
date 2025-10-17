# Database Migration Required

## Issue
The workflow save is failing because the `workflows` table is missing the `nodes` and `edges` columns, and `organization_id` is currently required but some users don't have organizations.

## Solution
Run the following SQL in your Supabase SQL Editor:

### Steps:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hpelxxyntnhbtslphsar`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the SQL below
6. Click **Run** (or press Cmd/Ctrl + Enter)

### SQL to Run:

```sql
-- Add nodes and edges columns to workflows table for visual workflow builder
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS nodes JSONB DEFAULT '[]';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS edges JSONB DEFAULT '[]';

-- Make organization_id nullable to support users without organizations
ALTER TABLE workflows ALTER COLUMN organization_id DROP NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN workflows.nodes IS 'Visual workflow nodes for React Flow builder';
COMMENT ON COLUMN workflows.edges IS 'Visual workflow connections for React Flow builder';
```

## After Running the Migration

Once you've run this SQL, try saving your workflow again. The error should be resolved!

## What This Does

1. **Adds `nodes` column**: Stores the visual workflow nodes (positions, connections, configs)
2. **Adds `edges` column**: Stores the connections between nodes in the visual builder
3. **Makes `organization_id` optional**: Allows workflows to be created by users who aren't part of an organization yet

---

**Note:** The migration file has also been saved to:
`/Users/vigneshmac/ai-automation-platform/supabase/migrations/20250116000000_add_workflow_builder_columns.sql`
