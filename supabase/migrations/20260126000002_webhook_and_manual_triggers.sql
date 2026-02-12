-- Migration: Add Webhook & Manual Execution Support
-- Phase 1.1.3: Webhook Triggers & Manual Execution
-- Created: 2026-01-26

-- ============================================
-- 1. Add webhook configuration to workflows
-- ============================================

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS webhook_auth_type VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}'::jsonb;

-- Add index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_workflows_webhook_enabled ON workflows(webhook_enabled) WHERE webhook_enabled = true;

-- ============================================
-- 2. Create webhook_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    -- Request details
    method VARCHAR(10) NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    query_params JSONB DEFAULT '{}'::jsonb,
    body JSONB DEFAULT '{}'::jsonb,
    source_ip VARCHAR(50),
    user_agent TEXT,
    
    -- Response details
    status_code INTEGER NOT NULL,
    response_body JSONB DEFAULT '{}'::jsonb,
    
    -- Execution tracking
    execution_id UUID REFERENCES execution_logs(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    
    -- Timing
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Create indexes for webhook_logs
-- ============================================

CREATE INDEX IF NOT EXISTS idx_webhook_logs_workflow_id ON webhook_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_organization_id ON webhook_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_execution_id ON webhook_logs(execution_id) WHERE execution_id IS NOT NULL;

-- ============================================
-- 4. Add trigger_type to execution_logs
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'execution_logs' 
        AND column_name = 'trigger_type'
    ) THEN
        ALTER TABLE execution_logs 
        ADD COLUMN trigger_type VARCHAR(50) DEFAULT 'manual';
    END IF;
END $$;

-- Add index for trigger type queries
CREATE INDEX IF NOT EXISTS idx_execution_logs_trigger_type ON execution_logs(trigger_type);

-- ============================================
-- 5. RLS Policies for webhook_logs
-- ============================================

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can view webhook logs" ON webhook_logs;
DROP POLICY IF EXISTS "Organization members can insert webhook logs" ON webhook_logs;

-- Allow organization members to view webhook logs
CREATE POLICY "Organization members can view webhook logs"
ON webhook_logs FOR SELECT
USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

-- Allow service role to insert webhook logs (for API routes)
CREATE POLICY "Service role can insert webhook logs"
ON webhook_logs FOR INSERT
WITH CHECK (true);

-- ============================================
-- 6. Function to generate webhook secret
-- ============================================

CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS TEXT AS $$
DECLARE
    secret TEXT;
BEGIN
    -- Generate a random 32-character secret
    secret := encode(gen_random_bytes(24), 'base64');
    -- Remove any special characters that might cause issues
    secret := replace(secret, '/', '_');
    secret := replace(secret, '+', '-');
    secret := replace(secret, '=', '');
    RETURN 'whsec_' || secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Function to get webhook stats
-- ============================================

CREATE OR REPLACE FUNCTION get_webhook_stats(
    workflow_uuid UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    success_rate NUMERIC,
    avg_duration_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_requests,
        COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_requests,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as success_rate,
        ROUND(AVG(duration_ms), 2) as avg_duration_ms
    FROM webhook_logs
    WHERE workflow_id = workflow_uuid
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Add comments for documentation
-- ============================================

COMMENT ON TABLE webhook_logs IS 'Logs all webhook requests received for workflow triggers';
COMMENT ON COLUMN workflows.webhook_enabled IS 'Whether webhook trigger is enabled for this workflow';
COMMENT ON COLUMN workflows.webhook_secret IS 'Secret key for webhook authentication';
COMMENT ON COLUMN workflows.webhook_auth_type IS 'Authentication type: none, api_key, bearer_token, hmac';
COMMENT ON COLUMN workflows.webhook_config IS 'Additional webhook configuration (rate limits, IP whitelist, etc.)';
COMMENT ON COLUMN execution_logs.trigger_type IS 'How the workflow was triggered: manual, schedule, webhook, email';

-- ============================================
-- 9. Grant necessary permissions
-- ============================================

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION generate_webhook_secret() TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_stats(UUID, INTEGER) TO authenticated;

-- ============================================
-- Done!
-- ============================================

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 20260126000002 completed successfully!';
    RAISE NOTICE 'Added webhook support to workflows table';
    RAISE NOTICE 'Created webhook_logs table with RLS policies';
    RAISE NOTICE 'Added trigger_type to execution_logs';
    RAISE NOTICE 'Created helper functions for webhook management';
END $$;
