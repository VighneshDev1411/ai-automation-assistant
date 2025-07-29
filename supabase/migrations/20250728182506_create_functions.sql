-- Function to create an organization and make the creator the owner
CREATE OR REPLACE FUNCTION create_organization(
    org_name VARCHAR(255),
    org_slug VARCHAR(255),
    org_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Insert the organization
    INSERT INTO organizations (name, slug, description)
    VALUES (org_name, org_slug, org_description)
    RETURNING id INTO new_org_id;
    
    -- Add the creator as owner
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    VALUES (new_org_id, current_user_id, 'owner', NOW());
    
    -- Log the action
    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id)
    VALUES (new_org_id, current_user_id, 'organization.created', 'organization', new_org_id);
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite a user to an organization
CREATE OR REPLACE FUNCTION invite_to_organization(
    org_id UUID,
    user_email VARCHAR(255),
    invite_role user_role DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    invited_user_id UUID;
    invitation_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Check if the inviter has permission
    IF NOT check_organization_membership(org_id, current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users';
    END IF;
    
    -- Get the user ID from email
    SELECT id INTO invited_user_id FROM profiles WHERE email = user_email;
    
    IF invited_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM organization_members WHERE organization_id = org_id AND user_id = invited_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this organization';
    END IF;
    
    -- Create the invitation
    INSERT INTO organization_members (organization_id, user_id, role, invited_by)
    VALUES (org_id, invited_user_id, invite_role, current_user_id)
    RETURNING id INTO invitation_id;
    
    -- Log the action
    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, changes)
    VALUES (org_id, current_user_id, 'member.invited', 'organization_member', invitation_id, 
            jsonb_build_object('invited_user_email', user_email, 'role', invite_role));
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an organization invitation
CREATE OR REPLACE FUNCTION accept_invitation(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Update the joined_at timestamp
    UPDATE organization_members
    SET joined_at = NOW()
    WHERE organization_id = org_id 
    AND user_id = current_user_id 
    AND joined_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No pending invitation found';
    END IF;
    
    -- Log the action
    INSERT INTO audit_logs (organization_id, user_id, action, resource_type)
    VALUES (org_id, current_user_id, 'member.joined', 'organization_member');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute a workflow
CREATE OR REPLACE FUNCTION execute_workflow(
    workflow_id UUID,
    trigger_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    execution_id UUID;
    workflow_record RECORD;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Get workflow details
    SELECT w.*, o.id as org_id 
    INTO workflow_record
    FROM workflows w
    JOIN organizations o ON w.organization_id = o.id
    WHERE w.id = workflow_id;
    
    IF workflow_record IS NULL THEN
        RAISE EXCEPTION 'Workflow not found';
    END IF;
    
    -- Check permissions
    IF NOT check_organization_membership(workflow_record.org_id, current_user_id, 'member') THEN
        RAISE EXCEPTION 'Insufficient permissions to execute workflow';
    END IF;
    
    -- Check if workflow is active
    IF workflow_record.status != 'active' THEN
        RAISE EXCEPTION 'Workflow is not active';
    END IF;
    
    -- Create execution log
    INSERT INTO execution_logs (
        workflow_id, 
        organization_id, 
        triggered_by, 
        status, 
        trigger_data
    )
    VALUES (
        workflow_id,
        workflow_record.org_id,
        current_user_id,
        'pending',
        trigger_data
    )
    RETURNING id INTO execution_id;
    
    -- Log the action
    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id)
    VALUES (workflow_record.org_id, current_user_id, 'workflow.executed', 'execution_log', execution_id);
    
    -- Note: Actual workflow execution would be handled by Edge Functions
    -- This just creates the execution record
    
    RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track API usage
CREATE OR REPLACE FUNCTION track_api_usage(
    service_name VARCHAR(100),
    endpoint_name VARCHAR(255),
    tokens INTEGER DEFAULT 0,
    cost_in_cents INTEGER DEFAULT 0,
    usage_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
    user_org_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Get user's first organization (for simplicity)
    SELECT organization_id INTO user_org_id
    FROM organization_members
    WHERE user_id = current_user_id
    LIMIT 1;
    
    IF user_org_id IS NULL THEN
        RAISE EXCEPTION 'User is not a member of any organization';
    END IF;
    
    -- Insert usage record
    INSERT INTO api_usage (
        organization_id,
        user_id,
        service,
        endpoint,
        tokens_used,
        cost_cents,
        metadata
    )
    VALUES (
        user_org_id,
        current_user_id,
        service_name,
        endpoint_name,
        tokens,
        cost_in_cents,
        usage_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search workflows
CREATE OR REPLACE FUNCTION search_workflows(
    search_query TEXT,
    org_id UUID DEFAULT NULL,
    status_filter workflow_status DEFAULT NULL,
    tag_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    status workflow_status,
    tags TEXT[],
    created_at TIMESTAMPTZ,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.description,
        w.status,
        w.tags,
        w.created_at,
        ts_rank(
            to_tsvector('english', w.name || ' ' || COALESCE(w.description, '')),
            plainto_tsquery('english', search_query)
        ) as relevance
    FROM workflows w
    WHERE 
        (org_id IS NULL OR w.organization_id = org_id)
        AND (org_id IS NOT NULL OR w.organization_id IN (SELECT get_user_organizations(auth.uid())))
        AND (status_filter IS NULL OR w.status = status_filter)
        AND (tag_filter IS NULL OR w.tags && tag_filter)
        AND (
            search_query IS NULL 
            OR to_tsvector('english', w.name || ' ' || COALESCE(w.description, '')) @@ plainto_tsquery('english', search_query)
        )
    ORDER BY relevance DESC, w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get workflow execution statistics
CREATE OR REPLACE FUNCTION get_workflow_stats(
    workflow_id UUID,
    time_range INTERVAL DEFAULT INTERVAL '30 days'
)
RETURNS TABLE (
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    average_duration_ms NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_executions,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_executions,
        AVG(duration_ms)::NUMERIC as average_duration_ms,
        (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC as success_rate
    FROM execution_logs
    WHERE 
        workflow_id = get_workflow_stats.workflow_id
        AND created_at >= NOW() - time_range;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to perform vector similarity search
CREATE OR REPLACE FUNCTION search_similar_documents(
    query_embedding vector(1536),
    knowledge_base_id UUID,
    match_count INTEGER DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    document_id UUID,
    chunk_index INTEGER,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.document_id,
        e.chunk_index,
        e.content,
        (1 - (e.embedding <=> query_embedding))::FLOAT as similarity
    FROM embeddings e
    JOIN documents d ON e.document_id = d.id
    WHERE 
        d.knowledge_base_id = search_similar_documents.knowledge_base_id
        AND (1 - (e.embedding <=> query_embedding)) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old execution logs
CREATE OR REPLACE FUNCTION cleanup_old_executions(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only allow admins to run this
    IF NOT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Only admins can run cleanup operations';
    END IF;
    
    -- Delete old execution logs and cascade will handle execution_steps
    DELETE FROM execution_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action
    INSERT INTO audit_logs (
        organization_id, 
        user_id, 
        action, 
        resource_type, 
        changes
    )
    SELECT 
        om.organization_id,
        auth.uid(),
        'system.cleanup',
        'execution_logs',
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    LIMIT 1;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization usage summary
CREATE OR REPLACE FUNCTION get_organization_usage(
    org_id UUID,
    start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    workflow_executions BIGINT,
    api_calls BIGINT,
    total_cost_cents BIGINT,
    total_tokens BIGINT
) AS $$
BEGIN
    -- Check permissions
    IF NOT check_organization_membership(org_id, auth.uid(), 'member') THEN
        RAISE EXCEPTION 'Insufficient permissions to view organization usage';
    END IF;
    
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(start_date, end_date, '1 day'::INTERVAL)::DATE as date
    ),
    execution_stats AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as executions
        FROM execution_logs
        WHERE 
            organization_id = org_id
            AND DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
    ),
    api_stats AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as api_calls,
            SUM(cost_cents) as total_cost,
            SUM(tokens_used) as total_tokens
        FROM api_usage
        WHERE 
            organization_id = org_id
            AND DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
    )
    SELECT 
        ds.date,
        COALESCE(es.executions, 0)::BIGINT as workflow_executions,
        COALESCE(api.api_calls, 0)::BIGINT as api_calls,
        COALESCE(api.total_cost, 0)::BIGINT as total_cost_cents,
        COALESCE(api.total_tokens, 0)::BIGINT as total_tokens
    FROM date_series ds
    LEFT JOIN execution_stats es ON ds.date = es.date
    LEFT JOIN api_stats api ON ds.date = api.date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;