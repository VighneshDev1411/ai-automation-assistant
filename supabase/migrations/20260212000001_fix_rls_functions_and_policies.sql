-- Migration: Fix ambiguous column references in RLS functions and broken policies
-- Root cause: check_organization_membership() parameter names collide with column names,
-- causing error 42702 ("column reference is ambiguous") which breaks ALL RLS evaluation
-- on profiles, organizations, and organization_members tables.

BEGIN;

-- ============================================================================
-- PHASE 1: Drop ALL dependent policies so functions can be safely dropped
-- ============================================================================

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- organizations
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can read organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update organization" ON organizations;

-- organization_members
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Admins can invite members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can read organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete organization members" ON organization_members;

-- workflows
DROP POLICY IF EXISTS "Members can view organization workflows" ON workflows;
DROP POLICY IF EXISTS "Members can create workflows" ON workflows;
DROP POLICY IF EXISTS "Members can update workflows" ON workflows;
DROP POLICY IF EXISTS "Members can delete workflows" ON workflows;
DROP POLICY IF EXISTS "Users can read organization workflows" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their organizations" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows they created or admin access" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows they created or admin access" ON workflows;

-- integrations
DROP POLICY IF EXISTS "Users can view own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can create integrations" ON integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can read organization integrations" ON integrations;
DROP POLICY IF EXISTS "Users can manage integrations they created" ON integrations;

-- ai_agents
DROP POLICY IF EXISTS "Members can view organization AI agents" ON ai_agents;
DROP POLICY IF EXISTS "Members can create AI agents" ON ai_agents;
DROP POLICY IF EXISTS "Members can update AI agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can view agents from their organization" ON ai_agents;
DROP POLICY IF EXISTS "Users can create agents for their organization" ON ai_agents;
DROP POLICY IF EXISTS "Users can update agents from their organization" ON ai_agents;
DROP POLICY IF EXISTS "Users can delete agents from their organization" ON ai_agents;
DROP POLICY IF EXISTS "Users can read organization AI agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can create AI agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can update AI agents they created or admin access" ON ai_agents;

-- knowledge_bases
DROP POLICY IF EXISTS "Members can view organization knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Members can create knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Members can update knowledge bases" ON knowledge_bases;

-- documents
DROP POLICY IF EXISTS "Members can view documents" ON documents;
DROP POLICY IF EXISTS "Members can upload documents" ON documents;

-- execution_logs
DROP POLICY IF EXISTS "Members can view execution logs" ON execution_logs;
DROP POLICY IF EXISTS "Users can read organization execution logs" ON execution_logs;
DROP POLICY IF EXISTS "System can insert execution logs" ON execution_logs;

-- execution_steps
DROP POLICY IF EXISTS "Members can view execution steps" ON execution_steps;
DROP POLICY IF EXISTS "Users can read execution steps" ON execution_steps;
DROP POLICY IF EXISTS "System can insert execution steps" ON execution_steps;

-- api_usage
DROP POLICY IF EXISTS "Members can view API usage" ON api_usage;
DROP POLICY IF EXISTS "Users can read organization API usage" ON api_usage;
DROP POLICY IF EXISTS "System can insert API usage" ON api_usage;

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Organization admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- ai_usage_logs
DROP POLICY IF EXISTS "Users can view usage logs from their organization" ON ai_usage_logs;
DROP POLICY IF EXISTS "Service can insert usage logs" ON ai_usage_logs;

-- ai_error_logs
DROP POLICY IF EXISTS "Users can view error logs from their organization" ON ai_error_logs;
DROP POLICY IF EXISTS "Service can insert error logs" ON ai_error_logs;

-- ai_execution_logs
DROP POLICY IF EXISTS "Users can view execution logs from their organization" ON ai_execution_logs;
DROP POLICY IF EXISTS "Users can insert execution logs" ON ai_execution_logs;

-- ai_model_comparisons
DROP POLICY IF EXISTS "Users can view comparisons from their organization" ON ai_model_comparisons;
DROP POLICY IF EXISTS "Users can insert comparisons" ON ai_model_comparisons;

-- ai_ab_tests
DROP POLICY IF EXISTS "Users can view AB tests from their organization" ON ai_ab_tests;
DROP POLICY IF EXISTS "Users can manage AB tests" ON ai_ab_tests;

-- webhook_logs (uses get_user_organizations)
DROP POLICY IF EXISTS "Organization members can view webhook logs" ON webhook_logs;
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON webhook_logs;

-- ============================================================================
-- PHASE 2: Drop both overloads of check_organization_membership AND
--          get_user_organizations (can't rename params with CREATE OR REPLACE)
-- ============================================================================
DROP FUNCTION IF EXISTS check_organization_membership(UUID, UUID, user_role);
DROP FUNCTION IF EXISTS check_organization_membership(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_organizations(UUID);

-- ============================================================================
-- PHASE 3: Recreate functions with prefixed parameter names and
--          fully-qualified column references
-- ============================================================================

CREATE FUNCTION check_organization_membership(
    p_org_id UUID,
    p_user_id UUID,
    p_required_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
      AND om.joined_at IS NOT NULL;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF p_required_role IS NULL THEN
        RETURN TRUE;
    END IF;

    CASE p_required_role
        WHEN 'owner' THEN
            RETURN v_user_role = 'owner';
        WHEN 'admin' THEN
            RETURN v_user_role IN ('owner', 'admin');
        WHEN 'member' THEN
            RETURN v_user_role IN ('owner', 'admin', 'member');
        WHEN 'viewer' THEN
            RETURN v_user_role IN ('owner', 'admin', 'member', 'viewer');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 4: Recreate ALL policies
-- ============================================================================

-- ---- profiles ----
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view organization member profiles" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT om.user_id
            FROM organization_members om
            WHERE om.organization_id IN (SELECT get_user_organizations(auth.uid()))
        )
    );

-- ---- organizations ----
CREATE POLICY "Members can view their organizations" ON organizations
    FOR SELECT USING (
        id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Owners can update organizations" ON organizations
    FOR UPDATE USING (
        check_organization_membership(id, auth.uid(), 'owner')
    );

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- ---- organization_members ----
CREATE POLICY "Members can view organization members" ON organization_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Admins can insert organization members" ON organization_members
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'admin')
    );

CREATE POLICY "Admins can update organization members" ON organization_members
    FOR UPDATE USING (
        check_organization_membership(organization_id, auth.uid(), 'admin')
        AND role != 'owner'
    );

CREATE POLICY "Admins can delete organization members" ON organization_members
    FOR DELETE USING (
        check_organization_membership(organization_id, auth.uid(), 'admin')
        AND role != 'owner'
    );

-- ---- workflows ----
CREATE POLICY "Members can view organization workflows" ON workflows
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Members can create workflows" ON workflows
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'member')
        AND created_by = auth.uid()
    );

CREATE POLICY "Members can update workflows" ON workflows
    FOR UPDATE USING (
        (created_by = auth.uid() AND check_organization_membership(organization_id, auth.uid(), 'member'))
        OR check_organization_membership(organization_id, auth.uid(), 'admin')
    );

CREATE POLICY "Members can delete workflows" ON workflows
    FOR DELETE USING (
        (created_by = auth.uid() AND check_organization_membership(organization_id, auth.uid(), 'member'))
        OR check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- ---- integrations ----
CREATE POLICY "Users can view own integrations" ON integrations
    FOR SELECT USING (
        user_id = auth.uid() AND
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Users can create integrations" ON integrations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        check_organization_membership(organization_id, auth.uid(), 'member')
    );

CREATE POLICY "Users can update own integrations" ON integrations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own integrations" ON integrations
    FOR DELETE USING (user_id = auth.uid());

-- ---- ai_agents ----
CREATE POLICY "Members can view organization AI agents" ON ai_agents
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Members can create AI agents" ON ai_agents
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'member')
        AND created_by = auth.uid()
    );

CREATE POLICY "Members can update AI agents" ON ai_agents
    FOR UPDATE USING (
        (created_by = auth.uid() AND check_organization_membership(organization_id, auth.uid(), 'member'))
        OR check_organization_membership(organization_id, auth.uid(), 'admin')
    );

-- ---- knowledge_bases ----
CREATE POLICY "Members can view organization knowledge bases" ON knowledge_bases
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Members can create knowledge bases" ON knowledge_bases
    FOR INSERT WITH CHECK (
        check_organization_membership(organization_id, auth.uid(), 'member')
    );

CREATE POLICY "Members can update knowledge bases" ON knowledge_bases
    FOR UPDATE USING (
        check_organization_membership(organization_id, auth.uid(), 'member')
    );

-- ---- documents ----
CREATE POLICY "Members can view documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = documents.knowledge_base_id
            AND kb.organization_id IN (SELECT get_user_organizations(auth.uid()))
        )
    );

CREATE POLICY "Members can upload documents" ON documents
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = documents.knowledge_base_id
            AND check_organization_membership(kb.organization_id, auth.uid(), 'member')
        )
    );

-- ---- execution_logs ----
CREATE POLICY "Members can view execution logs" ON execution_logs
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "System can insert execution logs" ON execution_logs
    FOR INSERT WITH CHECK (true);

-- ---- execution_steps ----
CREATE POLICY "Members can view execution steps" ON execution_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM execution_logs el
            WHERE el.id = execution_steps.execution_id
            AND el.organization_id IN (SELECT get_user_organizations(auth.uid()))
        )
    );

CREATE POLICY "System can insert execution steps" ON execution_steps
    FOR INSERT WITH CHECK (true);

-- ---- api_usage ----
CREATE POLICY "Members can view API usage" ON api_usage
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "System can insert API usage" ON api_usage
    FOR INSERT WITH CHECK (true);

-- ---- audit_logs ----
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        check_organization_membership(organization_id, auth.uid(), 'admin')
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- ---- ai_usage_logs ----
CREATE POLICY "Users can view usage logs from their organization" ON ai_usage_logs
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Service can insert usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (true);

-- ---- ai_error_logs ----
CREATE POLICY "Users can view error logs from their organization" ON ai_error_logs
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Service can insert error logs" ON ai_error_logs
    FOR INSERT WITH CHECK (true);

-- ---- ai_execution_logs ----
CREATE POLICY "Users can view execution logs from their organization" ON ai_execution_logs
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Users can insert execution logs" ON ai_execution_logs
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- ---- ai_model_comparisons ----
CREATE POLICY "Users can view comparisons from their organization" ON ai_model_comparisons
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Users can insert comparisons" ON ai_model_comparisons
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- ---- ai_ab_tests ----
CREATE POLICY "Users can view AB tests from their organization" ON ai_ab_tests
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Users can manage AB tests" ON ai_ab_tests
    FOR ALL USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

-- ---- webhook_logs ----
CREATE POLICY "Organization members can view webhook logs" ON webhook_logs
    FOR SELECT USING (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Service role can insert webhook logs" ON webhook_logs
    FOR INSERT WITH CHECK (true);

COMMIT;
