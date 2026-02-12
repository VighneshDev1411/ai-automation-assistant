-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check organization membership and role
CREATE OR REPLACE FUNCTION check_organization_membership(p_org_id UUID, p_user_id UUID, p_required_role user_role DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role user_role;
BEGIN
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.organization_id = p_org_id AND om.user_id = p_user_id;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF p_required_role IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Role hierarchy: owner > admin > member > viewer
    CASE p_required_role
        WHEN 'owner' THEN
            RETURN v_user_role = 'owner';
        WHEN 'admin' THEN
            RETURN v_user_role IN ('owner', 'admin');
        WHEN 'member' THEN
            RETURN v_user_role IN ('owner', 'admin', 'member');
        WHEN 'viewer' THEN
            RETURN TRUE; -- All roles can view
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can view profiles of members in their organizations
CREATE POLICY "Users can view organization member profiles" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT om.user_id
            FROM organization_members om
            WHERE om.organization_id IN (SELECT get_user_organizations(auth.uid()))
        )
    );

-- ORGANIZATIONS POLICIES
-- Members can view their organizations
CREATE POLICY "Members can view their organizations" ON organizations
    FOR SELECT USING (
        id IN (SELECT get_user_organizations(auth.uid()))
    );

-- Only owners can update organizations
CREATE POLICY "Owners can update organizations" ON organizations
    FOR UPDATE USING (
        check_organization_membership(id, auth.uid(), 'owner')
    );

-- Admins and owners can insert organizations (becomes owner)
CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- ORGANIZATION MEMBERS POLICIES
-- Members can view members of their organizations
CREATE POLICY "Members can view organization members" ON organization_members
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- Admins can invite new members
CREATE POLICY "Admins can invite members" ON organization_members
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- Admins can update member roles (except owners)
CREATE POLICY "Admins can update member roles" ON organization_members
    FOR UPDATE USING (
        check_organization_membership(organization_id, auth.uid(), 'admin')
        AND role != 'owner'
    );

-- Admins can remove members (except owners)
CREATE POLICY "Admins can remove members" ON organization_members
    FOR DELETE USING (
        check_organization_membership(organization_id, auth.uid(), 'admin')
        AND role != 'owner'
    );

-- WORKFLOWS POLICIES
-- Members can view workflows in their organizations
CREATE POLICY "Members can view organization workflows" ON workflows
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- Members can create workflows
CREATE POLICY "Members can create workflows" ON workflows
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'member')
        AND created_by = auth.uid()
    );

-- Members can update workflows they created or admins can update any
CREATE POLICY "Members can update workflows" ON workflows
    FOR UPDATE USING (
        (created_by = auth.uid() AND check_organization_membership(organization_id, auth.uid(), 'member'))
        OR check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- Members can delete their own workflows or admins can delete any
CREATE POLICY "Members can delete workflows" ON workflows
    FOR DELETE USING (
        (created_by = auth.uid() AND check_organization_membership(organization_id, auth.uid(), 'member'))
        OR check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- INTEGRATIONS POLICIES
-- Users can view their own integrations
CREATE POLICY "Users can view own integrations" ON integrations
    FOR SELECT USING (
        user_id = auth.uid() AND 
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- Users can create their own integrations
CREATE POLICY "Users can create integrations" ON integrations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        check_organization_membership(organization_id, auth.uid(), 'member')
    );

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations" ON integrations
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations" ON integrations
    FOR DELETE USING (user_id = auth.uid());

-- AI AGENTS POLICIES
-- Members can view AI agents in their organizations
CREATE POLICY "Members can view organization AI agents" ON ai_agents
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- Members can create AI agents
CREATE POLICY "Members can create AI agents" ON ai_agents
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'member')
        AND created_by = auth.uid()
    );

-- Creators and admins can update AI agents
CREATE POLICY "Members can update AI agents" ON ai_agents
    FOR UPDATE USING (
        (created_by = auth.uid() AND check_organization_membership(organization_id, auth.uid(), 'member'))
        OR check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- KNOWLEDGE BASES POLICIES
-- Members can view knowledge bases in their organizations
CREATE POLICY "Members can view organization knowledge bases" ON knowledge_bases
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- Members can create knowledge bases
CREATE POLICY "Members can create knowledge bases" ON knowledge_bases
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'member')
    );

-- Members can update knowledge bases
CREATE POLICY "Members can update knowledge bases" ON knowledge_bases
    FOR UPDATE USING (
        check_organization_membership(organization_id, auth.uid(), 'member')
    );

-- DOCUMENTS POLICIES
-- Members can view documents in their organization's knowledge bases
CREATE POLICY "Members can view documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = documents.knowledge_base_id
            AND kb.organization_id IN (SELECT get_user_organizations(auth.uid()))
        )
    );

-- Members can upload documents
CREATE POLICY "Members can upload documents" ON documents
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = documents.knowledge_base_id
            AND check_organization_membership(kb.organization_id, auth.uid(), 'member')
        )
    );

-- EXECUTION LOGS POLICIES
-- Members can view execution logs for their organization's workflows
CREATE POLICY "Members can view execution logs" ON execution_logs
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- System can insert execution logs (via service role)
-- No direct user insertion allowed

-- EXECUTION STEPS POLICIES
-- Members can view execution steps for their organization's executions
CREATE POLICY "Members can view execution steps" ON execution_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM execution_logs el
            WHERE el.id = execution_steps.execution_id
            AND el.organization_id IN (SELECT get_user_organizations(auth.uid()))
        )
    );

-- API USAGE POLICIES
-- Members can view their organization's API usage
CREATE POLICY "Members can view API usage" ON api_usage
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- AUDIT LOGS POLICIES
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();