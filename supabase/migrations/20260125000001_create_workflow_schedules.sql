-- Create workflow_schedules table
CREATE TABLE IF NOT EXISTS workflow_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    name VARCHAR(255),
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    enabled BOOLEAN DEFAULT true NOT NULL,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_organization_id ON workflow_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_enabled ON workflow_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run_at ON workflow_schedules(next_run_at);

-- Add RLS policies
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schedules in their organization
CREATE POLICY "Users can view organization schedules"
    ON workflow_schedules
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can create schedules in their organization
CREATE POLICY "Users can create organization schedules"
    ON workflow_schedules
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

-- Policy: Users can update schedules in their organization
CREATE POLICY "Users can update organization schedules"
    ON workflow_schedules
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

-- Policy: Users can delete schedules in their organization
CREATE POLICY "Users can delete organization schedules"
    ON workflow_schedules
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS workflow_schedules_updated_at ON workflow_schedules;
CREATE TRIGGER workflow_schedules_updated_at
    BEFORE UPDATE ON workflow_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_schedules_updated_at();

-- Create function to increment run counters
CREATE OR REPLACE FUNCTION increment_schedule_run_counter(
    p_workflow_id UUID,
    p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE workflow_schedules
    SET 
        total_runs = total_runs + 1,
        successful_runs = CASE WHEN p_success THEN successful_runs + 1 ELSE successful_runs END,
        failed_runs = CASE WHEN NOT p_success THEN failed_runs + 1 ELSE failed_runs END,
        last_run_at = NOW()
    WHERE workflow_id = p_workflow_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE workflow_schedules IS 'Stores scheduled workflow executions with cron expressions';
COMMENT ON COLUMN workflow_schedules.cron_expression IS 'Cron expression for scheduling (e.g., "0 9 * * 1-5" for weekdays at 9 AM)';
COMMENT ON COLUMN workflow_schedules.timezone IS 'Timezone for cron execution (e.g., "America/New_York")';
COMMENT ON COLUMN workflow_schedules.next_run_at IS 'Calculated next execution time';
