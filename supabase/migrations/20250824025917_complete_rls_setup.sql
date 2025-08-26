-- Simple RLS Setup - Drop and recreate policies (avoids syntax issues)

-- Enable RLS on all tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations policies
DROP POLICY IF EXISTS "Users can read organizations they belong to" ON organizations;
CREATE POLICY "Users can read organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Organization owners can update organization" ON organizations;
CREATE POLICY "Organization owners can update organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Organization members policies
DROP POLICY IF EXISTS "Users can read organization memberships" ON organization_members;
CREATE POLICY "Users can read organization memberships" ON organization_members
    FOR SELECT USING (
        user_id = auth.uid() OR 
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
CREATE POLICY "Organization admins can manage members" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Workflows policies
DROP POLICY IF EXISTS "Users can read organization workflows" ON workflows;
CREATE POLICY "Users can read organization workflows" ON workflows
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Users can create workflows in their organizations" ON workflows;
CREATE POLICY "Users can create workflows in their organizations" ON workflows
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
        ) AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update workflows they created or admin access" ON workflows;
CREATE POLICY "Users can update workflows they created or admin access" ON workflows
    FOR UPDATE USING (
        created_by = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Users can delete workflows they created or admin access" ON workflows;
CREATE POLICY "Users can delete workflows they created or admin access" ON workflows
    FOR DELETE USING (
        created_by = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Integrations policies
DROP POLICY IF EXISTS "Users can read organization integrations" ON integrations;
CREATE POLICY "Users can read organization integrations" ON integrations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Users can manage integrations they created" ON integrations;
CREATE POLICY "Users can manage integrations they created" ON integrations
    FOR ALL USING (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

-- AI Agents policies  
DROP POLICY IF EXISTS "Users can read organization AI agents" ON ai_agents;
CREATE POLICY "Users can read organization AI agents" ON ai_agents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Users can create AI agents" ON ai_agents;
CREATE POLICY "Users can create AI agents" ON ai_agents
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
        ) AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update AI agents they created or admin access" ON ai_agents;
CREATE POLICY "Users can update AI agents they created or admin access" ON ai_agents
    FOR UPDATE USING (
        created_by = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- System policies for execution logs
DROP POLICY IF EXISTS "Users can read organization execution logs" ON execution_logs;
CREATE POLICY "Users can read organization execution logs" ON execution_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "System can insert execution logs" ON execution_logs;
CREATE POLICY "System can insert execution logs" ON execution_logs
    FOR INSERT WITH CHECK (true);

-- Execution steps policies
DROP POLICY IF EXISTS "Users can read execution steps" ON execution_steps;
CREATE POLICY "Users can read execution steps" ON execution_steps
    FOR SELECT USING (
        execution_id IN (
            SELECT id FROM execution_logs WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND joined_at IS NOT NULL
            )
        )
    );

DROP POLICY IF EXISTS "System can insert execution steps" ON execution_steps;
CREATE POLICY "System can insert execution steps" ON execution_steps
    FOR INSERT WITH CHECK (true);

-- API usage policies
DROP POLICY IF EXISTS "Users can read organization API usage" ON api_usage;
CREATE POLICY "Users can read organization API usage" ON api_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND joined_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "System can insert API usage" ON api_usage;
CREATE POLICY "System can insert API usage" ON api_usage
    FOR INSERT WITH CHECK (true);

-- Audit logs policies
DROP POLICY IF EXISTS "Organization admins can read audit logs" ON audit_logs;
CREATE POLICY "Organization admins can read audit logs" ON audit_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Skip function modifications entirely - they already exist and work