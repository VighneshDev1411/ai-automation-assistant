-- Create integration status enum if not exists
DO $$ BEGIN
    CREATE TYPE integration_status AS ENUM ('pending', 'connected', 'disconnected', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create integrations table if not exists
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    status integration_status DEFAULT 'pending',
    credentials JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, provider, user_id)
);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "integrations_select_own" ON integrations
    FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

CREATE POLICY "integrations_insert_own" ON integrations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

CREATE POLICY "integrations_update_own" ON integrations
    FOR UPDATE USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND joined_at IS NOT NULL
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integrations_org_provider ON integrations(organization_id, provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create webhook_events table for handling incoming webhooks
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_select_org" ON webhook_events
    FOR SELECT USING (
        integration_id IN (
            SELECT id FROM integrations 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND joined_at IS NOT NULL
            )
        )
    );

-- Create indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_integration ON webhook_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
