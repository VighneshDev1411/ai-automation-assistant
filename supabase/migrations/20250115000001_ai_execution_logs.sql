-- AI Execution Logs Table
CREATE TABLE IF NOT EXISTS ai_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    execution_id UUID, -- Links to workflow_executions
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Agent details
    agent_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100),
    model VARCHAR(100) NOT NULL,
    
    -- Execution metadata
    status VARCHAR(50) NOT NULL DEFAULT 'success', -- success, error, timeout
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration INTEGER NOT NULL, -- milliseconds
    
    -- Token usage
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    tokens_total INTEGER DEFAULT 0,
    
    -- Cost tracking
    cost DECIMAL(10, 6) DEFAULT 0,
    
    -- Request/Response
    request_prompt TEXT,
    request_parameters JSONB DEFAULT '{}',
    response_content TEXT,
    response_metadata JSONB DEFAULT '{}',
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(100),
    
    -- Session tracking
    session_id VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_agent_id ON ai_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_workflow_id ON ai_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_organization_id ON ai_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_timestamp ON ai_execution_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_status ON ai_execution_logs(status);

-- Model Comparison Results Table
CREATE TABLE IF NOT EXISTS ai_model_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Test configuration
    test_name VARCHAR(255),
    test_prompt TEXT NOT NULL,
    test_input TEXT,
    
    -- Model details
    model VARCHAR(100) NOT NULL,
    model_provider VARCHAR(50),
    
    -- Results
    response_content TEXT,
    
    -- Metrics
    duration INTEGER, -- milliseconds
    tokens_used INTEGER,
    cost DECIMAL(10, 6),
    quality_score INTEGER, -- 0-100
    relevance_score INTEGER, -- 0-100
    coherence_score INTEGER, -- 0-100
    
    -- Status
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    
    -- User feedback
    user_rating INTEGER, -- 1-5 stars
    user_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Results Table
CREATE TABLE IF NOT EXISTS ai_ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Test metadata
    test_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'running', -- running, completed, paused
    
    -- Variant A
    variant_a_name VARCHAR(255),
    variant_a_model VARCHAR(100),
    variant_a_prompt TEXT,
    
    -- Variant B
    variant_b_name VARCHAR(255),
    variant_b_model VARCHAR(100),
    variant_b_prompt TEXT,
    
    -- Statistics
    variant_a_executions INTEGER DEFAULT 0,
    variant_a_wins INTEGER DEFAULT 0,
    variant_b_executions INTEGER DEFAULT 0,
    variant_b_wins INTEGER DEFAULT 0,
    
    statistical_significance DECIMAL(5, 2) DEFAULT 0,
    winner VARCHAR(1), -- 'A', 'B', or NULL
    
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for ai_model_comparisons
CREATE INDEX IF NOT EXISTS idx_model_comparisons_org ON ai_model_comparisons(organization_id);
CREATE INDEX IF NOT EXISTS idx_model_comparisons_created ON ai_model_comparisons(created_at DESC);

-- Create indexes for ai_ab_tests
CREATE INDEX IF NOT EXISTS idx_ab_tests_org ON ai_ab_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ai_ab_tests(status);

-- Function to log AI execution
CREATE OR REPLACE FUNCTION log_ai_execution(
    p_agent_id UUID,
    p_workflow_id UUID,
    p_organization_id UUID,
    p_model VARCHAR,
    p_duration INTEGER,
    p_tokens_input INTEGER,
    p_tokens_output INTEGER,
    p_cost DECIMAL,
    p_status VARCHAR DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO ai_execution_logs (
        agent_id,
        workflow_id,
        organization_id,
        model,
        duration,
        tokens_input,
        tokens_output,
        tokens_total,
        cost,
        status,
        error_message
    ) VALUES (
        p_agent_id,
        p_workflow_id,
        p_organization_id,
        p_model,
        p_duration,
        p_tokens_input,
        p_tokens_output,
        p_tokens_input + p_tokens_output,
        p_cost,
        p_status,
        p_error_message
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE ai_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ab_tests ENABLE ROW LEVEL SECURITY;

-- Users can view logs from their organization
CREATE POLICY "Users can view execution logs from their organization" 
ON ai_execution_logs FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can insert logs
CREATE POLICY "Users can insert execution logs" 
ON ai_execution_logs FOR INSERT 
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Similar policies for other tables
CREATE POLICY "Users can view comparisons from their organization" 
ON ai_model_comparisons FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert comparisons" 
ON ai_model_comparisons FOR INSERT 
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view AB tests from their organization" 
ON ai_ab_tests FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage AB tests" 
ON ai_ab_tests FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);