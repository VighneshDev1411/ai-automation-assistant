-- Migration: Add agent usage tracking function and indexes
-- File: supabase/migrations/[timestamp]_agent_usage_function.sql

-- Function to atomically update agent usage statistics
CREATE OR REPLACE FUNCTION update_agent_usage_stats(
  agent_id UUID,
  organization_id UUID,
  input_tokens INTEGER,
  output_tokens INTEGER,
  execution_time INTEGER,
  cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_agents 
  SET 
    usage_stats = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(usage_stats, '{}'::jsonb),
            '{total_requests}',
            (COALESCE((usage_stats->>'total_requests')::INTEGER, 0) + 1)::text::jsonb
          ),
          '{total_tokens}',
          (COALESCE((usage_stats->>'total_tokens')::INTEGER, 0) + input_tokens + output_tokens)::text::jsonb
        ),
        '{total_cost}',
        (COALESCE((usage_stats->>'total_cost')::DECIMAL, 0) + cost)::text::jsonb
      ),
      '{average_latency}',
      CASE 
        WHEN COALESCE((usage_stats->>'total_requests')::INTEGER, 0) = 0 THEN execution_time::text::jsonb
        ELSE ((COALESCE((usage_stats->>'average_latency')::INTEGER, 0) * COALESCE((usage_stats->>'total_requests')::INTEGER, 0) + execution_time) / (COALESCE((usage_stats->>'total_requests')::INTEGER, 0) + 1))::text::jsonb
      END
    ),
    updated_at = NOW()
  WHERE 
    id = agent_id 
    AND ai_agents.organization_id = update_agent_usage_stats.organization_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance on ai_agents table
CREATE INDEX IF NOT EXISTS idx_ai_agents_organization_active 
ON ai_agents(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ai_agents_created_at 
ON ai_agents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_agents_type 
ON ai_agents(type);

CREATE INDEX IF NOT EXISTS idx_ai_agents_model 
ON ai_agents(model);

-- Add index on profiles for better join performance
-- Note: profiles don't have organization_id, they link via organization_members
-- CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
-- ON profiles(organization_id);

-- Add RLS (Row Level Security) policies if not already exist
DO $$ 
BEGIN
  -- Enable RLS on ai_agents if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'ai_agents' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Policy: Users can only access agents from their organization
DROP POLICY IF EXISTS "Users can view agents from their organization" ON ai_agents;
CREATE POLICY "Users can view agents from their organization" ON ai_agents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert agents for their organization  
DROP POLICY IF EXISTS "Users can create agents for their organization" ON ai_agents;
CREATE POLICY "Users can create agents for their organization" ON ai_agents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update agents from their organization
DROP POLICY IF EXISTS "Users can update agents from their organization" ON ai_agents;
CREATE POLICY "Users can update agents from their organization" ON ai_agents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete agents from their organization
DROP POLICY IF EXISTS "Users can delete agents from their organization" ON ai_agents;
CREATE POLICY "Users can delete agents from their organization" ON ai_agents
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Create usage logs table for detailed tracking (optional)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  workflow_id UUID REFERENCES workflows(id),
  session_id UUID,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  model VARCHAR(100) NOT NULL,
  cost DECIMAL(10,6) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_usage_logs_agent_id ON ai_usage_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_organization_id ON ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_workflow_id ON ai_usage_logs(workflow_id);

-- RLS for usage logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage logs from their organization" ON ai_usage_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service can insert usage logs" ON ai_usage_logs
  FOR INSERT WITH CHECK (true);

-- Error logs table for debugging
CREATE TABLE IF NOT EXISTS ai_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  workflow_id UUID REFERENCES workflows(id),
  error_type VARCHAR(100),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  request_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_agent_id ON ai_error_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON ai_error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON ai_error_logs(created_at DESC);

-- RLS for error logs
ALTER TABLE ai_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view error logs from their organization" ON ai_error_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service can insert error logs" ON ai_error_logs
  FOR INSERT WITH CHECK (true);