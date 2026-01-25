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

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_organization_id ON workflow_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_enabled ON workflow_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run_at ON workflow_schedules(next_run_at) WHERE enabled = true;

-- Enable RLS
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view schedules in their organization"
    ON workflow_schedules FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create schedules in their organization"
    ON workflow_schedules FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update schedules in their organization"
    ON workflow_schedules FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete schedules in their organization"
    ON workflow_schedules FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workflow_schedules_updated_at_trigger ON workflow_schedules;
CREATE TRIGGER update_workflow_schedules_updated_at_trigger
    BEFORE UPDATE ON workflow_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_schedules_updated_at();

-- Function to increment run counters
CREATE OR REPLACE FUNCTION increment_schedule_run_counter(
    p_workflow_id UUID,
    p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    IF p_success THEN
        UPDATE workflow_schedules
        SET 
            total_runs = total_runs + 1,
            successful_runs = successful_runs + 1,
            last_run_at = NOW(),
            updated_at = NOW()
        WHERE workflow_id = p_workflow_id;
    ELSE
        UPDATE workflow_schedules
        SET 
            total_runs = total_runs + 1,
            failed_runs = failed_runs + 1,
            last_run_at = NOW(),
            updated_at = NOW()
        WHERE workflow_id = p_workflow_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
