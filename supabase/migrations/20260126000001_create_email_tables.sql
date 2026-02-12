-- Phase 1.1.2: Email Support Tables
-- Migration: Create email_logs and email_templates tables

-- ============================================
-- 1. EMAIL LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES execution_logs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Email details
  from_email VARCHAR(255) NOT NULL,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  reply_to VARCHAR(255),
  
  subject VARCHAR(500) NOT NULL,
  body_text TEXT,
  body_html TEXT,
  template_id UUID,
  template_vars JSONB DEFAULT '{}',
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Provider details
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  provider_response JSONB,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email_logs
CREATE INDEX idx_email_logs_workflow_id ON email_logs(workflow_id);
CREATE INDEX idx_email_logs_execution_id ON email_logs(execution_id);
CREATE INDEX idx_email_logs_organization_id ON email_logs(organization_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. EMAIL TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Template content
  subject VARCHAR(500) NOT NULL,
  body_text TEXT,
  body_html TEXT NOT NULL,
  
  -- Variables (JSON array of variable names)
  variables JSONB DEFAULT '[]',
  
  -- Sample data for preview
  sample_data JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email_templates
CREATE INDEX idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Email Logs Policies
CREATE POLICY "Users can view organization email logs" ON email_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND joined_at IS NOT NULL
    )
  );

CREATE POLICY "System can insert email logs" ON email_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update email logs" ON email_logs
  FOR UPDATE
  USING (true);

-- Email Templates Policies
CREATE POLICY "Users can view organization templates" ON email_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND joined_at IS NOT NULL
    )
    OR is_public = true
  );

CREATE POLICY "Users can create templates" ON email_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
      AND joined_at IS NOT NULL
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own templates" ON email_templates
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND joined_at IS NOT NULL
    )
  );

CREATE POLICY "Users can delete own templates" ON email_templates
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND joined_at IS NOT NULL
    )
  );

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = template_uuid;
END;
$$;

-- Function to get email statistics
CREATE OR REPLACE FUNCTION get_email_stats(org_id UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  total_bounced BIGINT,
  delivery_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
    COUNT(*) FILTER (WHERE status = 'bounced') as total_bounced,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'sent') > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / 
           COUNT(*) FILTER (WHERE status = 'sent')::NUMERIC) * 100, 
          2
        )
      ELSE 0
    END as delivery_rate
  FROM email_logs
  WHERE 
    organization_id = org_id
    AND created_at >= NOW() - (days || ' days')::INTERVAL;
END;
$$;

-- ============================================
-- 5. DEFAULT EMAIL TEMPLATES
-- ============================================

-- Insert default welcome template (public template)
INSERT INTO email_templates (
  name, 
  description, 
  category,
  subject,
  body_text,
  body_html,
  variables,
  sample_data,
  is_public
) VALUES (
  'Welcome Email',
  'Default welcome email template for new users',
  'onboarding',
  'Welcome to {{organization.name}}!',
  'Hi {{user.name}},

Welcome to {{organization.name}}! We''re excited to have you on board.

Your account has been created successfully and you can now start using our platform.

Best regards,
The {{organization.name}} Team',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to {{organization.name}}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi {{user.name}},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                We''re excited to have you on board! Your account has been created successfully and you can now start using our platform.
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #333333;">
                If you have any questions, feel free to reach out to our support team.
              </p>
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="#" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Get Started</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">
                Best regards,<br>
                The {{organization.name}} Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["user.name", "user.email", "organization.name"]',
  '{"user": {"name": "John Doe", "email": "john@example.com"}, "organization": {"name": "CogniFlow"}}',
  true
);

-- Insert notification template
INSERT INTO email_templates (
  name,
  description,
  category,
  subject,
  body_text,
  body_html,
  variables,
  sample_data,
  is_public
) VALUES (
  'Notification Email',
  'General notification template for alerts and updates',
  'notification',
  '{{notification.title}}',
  '{{notification.title}}

{{notification.message}}

Time: {{timestamp}}

This is an automated notification from {{organization.name}}.',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">{{notification.title}}</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                {{notification.message}}
              </p>
              <p style="margin: 0; font-size: 14px; color: #6c757d;">
                <strong>Time:</strong> {{timestamp}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">
                This is an automated notification from {{organization.name}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["notification.title", "notification.message", "timestamp", "organization.name"]',
  '{"notification": {"title": "Important Update", "message": "Your workflow has completed successfully."}, "timestamp": "2026-01-26 10:00:00", "organization": {"name": "CogniFlow"}}',
  true
);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Add comment
COMMENT ON TABLE email_logs IS 'Stores all email sending logs and delivery status';
COMMENT ON TABLE email_templates IS 'Stores HTML email templates with variable support';
