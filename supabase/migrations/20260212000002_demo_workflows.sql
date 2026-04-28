-- Demo Workflows for Video Demonstration
-- Run this against your Supabase database to populate the 3 workflows

-- Get the organization and user IDs (update these with actual values)
DO $$
DECLARE
    v_org_id UUID := '06f18f69-f872-4333-8111-9c1b178c8f67';  -- Replace with actual org ID
    v_user_id UUID := 'f5735d03-5cfa-488b-8661-75816f53c915'; -- Replace with actual user ID
BEGIN

-- ============================================================================
-- 1. AI Email Triage → Slack Summary
-- ============================================================================
INSERT INTO workflows (
    id,
    organization_id,
    created_by,
    name,
    description,
    status,
    trigger_config,
    actions,
    nodes,
    edges,
    tags,
    template_category
) VALUES (
    gen_random_uuid(),
    v_org_id,
    v_user_id,
    'AI Email Triage → Slack Summary',
    'Automatically classify, summarize, and route important emails to Slack when they arrive from VIPs or contain keywords like "invoice" or "contract"',
    'active',
    jsonb_build_object(
        'type', 'email',
        'provider', 'gmail',
        'filters', jsonb_build_object(
            'conditions', jsonb_build_array(
                jsonb_build_object('field', 'from', 'operator', 'is_vip'),
                jsonb_build_object('field', 'subject', 'operator', 'contains', 'value', jsonb_build_array('invoice', 'contract'))
            ),
            'logic', 'OR'
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'type', 'ai_classify',
            'model', 'gpt-4',
            'prompt', 'Classify this email into: urgent, important, normal, low-priority'
        ),
        jsonb_build_object(
            'type', 'ai_summarize',
            'model', 'gpt-4',
            'prompt', 'Summarize this email in 2-3 sentences, highlighting action items'
        ),
        jsonb_build_object(
            'type', 'ai_assign',
            'prompt', 'Based on email content and sender, suggest the best team member to handle this'
        ),
        jsonb_build_object(
            'type', 'slack_message',
            'channel', '#inbox-vip',
            'template', '🔔 *New {{classification}} Email*\n*From:* {{sender}}\n*Subject:* {{subject}}\n*Summary:* {{summary}}\n*Suggested Owner:* {{assigned_to}}\n\n[View Email]({{email_link}})'
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'id', '1',
            'type', 'trigger',
            'position', jsonb_build_object('x', 100, 'y', 200),
            'data', jsonb_build_object(
                'label', 'New Email from VIP',
                'icon', 'mail',
                'config', jsonb_build_object('provider', 'gmail', 'filter', 'VIP or invoice/contract')
            )
        ),
        jsonb_build_object(
            'id', '2',
            'type', 'aiAgent',
            'position', jsonb_build_object('x', 350, 'y', 150),
            'data', jsonb_build_object(
                'label', 'Classify Email',
                'model', 'gpt-4',
                'prompt', 'Classify urgency level'
            )
        ),
        jsonb_build_object(
            'id', '3',
            'type', 'aiAgent',
            'position', jsonb_build_object('x', 350, 'y', 250),
            'data', jsonb_build_object(
                'label', 'Generate Summary',
                'model', 'gpt-4',
                'prompt', 'Create 2-3 sentence summary'
            )
        ),
        jsonb_build_object(
            'id', '4',
            'type', 'aiAgent',
            'position', jsonb_build_object('x', 600, 'y', 200),
            'data', jsonb_build_object(
                'label', 'Assign Owner',
                'model', 'gpt-4',
                'prompt', 'Suggest best team member'
            )
        ),
        jsonb_build_object(
            'id', '5',
            'type', 'action',
            'position', jsonb_build_object('x', 850, 'y', 200),
            'data', jsonb_build_object(
                'label', 'Post to Slack',
                'provider', 'slack',
                'channel', '#inbox-vip'
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object('id', 'e1', 'source', '1', 'target', '2'),
        jsonb_build_object('id', 'e2', 'source', '1', 'target', '3'),
        jsonb_build_object('id', 'e3', 'source', '2', 'target', '4'),
        jsonb_build_object('id', 'e4', 'source', '3', 'target', '4'),
        jsonb_build_object('id', 'e5', 'source', '4', 'target', '5')
    ),
    ARRAY['email', 'ai', 'slack', 'automation', 'triage'],
    'communication'
);

-- ============================================================================
-- 2. Meeting Follow-up Autopilot
-- ============================================================================
INSERT INTO workflows (
    id,
    organization_id,
    created_by,
    name,
    description,
    status,
    trigger_config,
    actions,
    nodes,
    edges,
    tags,
    template_category
) VALUES (
    gen_random_uuid(),
    v_org_id,
    v_user_id,
    'Meeting Follow-up Autopilot',
    'When a meeting ends, automatically generate a recap, extract action items, create tasks, and email all attendees with the summary',
    'active',
    jsonb_build_object(
        'type', 'webhook',
        'provider', 'calendar',
        'event', 'meeting.ended'
    ),
    jsonb_build_array(
        jsonb_build_object(
            'type', 'ai_generate_recap',
            'model', 'gpt-4',
            'prompt', 'Generate a professional meeting recap including: attendees, main discussion points, decisions made'
        ),
        jsonb_build_object(
            'type', 'ai_extract_action_items',
            'model', 'gpt-4',
            'prompt', 'Extract all action items with owners and deadlines'
        ),
        jsonb_build_object(
            'type', 'create_tasks',
            'provider', 'asana',
            'template', 'Create task for each action item with assignee and due date'
        ),
        jsonb_build_object(
            'type', 'send_email',
            'to', '{{attendees}}',
            'subject', 'Meeting Recap: {{meeting_title}}',
            'template', 'Hi team,\n\nThanks for joining today''s meeting.\n\n**Summary:**\n{{recap}}\n\n**Action Items:**\n{{action_items}}\n\nAll tasks have been created in Asana.\n\nBest,\nAutomation Bot'
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'id', '1',
            'type', 'webhook',
            'position', jsonb_build_object('x', 100, 'y', 200),
            'data', jsonb_build_object(
                'label', 'Meeting Ended',
                'icon', 'calendar',
                'config', jsonb_build_object('source', 'Google Calendar')
            )
        ),
        jsonb_build_object(
            'id', '2',
            'type', 'aiAgent',
            'position', jsonb_build_object('x', 350, 'y', 150),
            'data', jsonb_build_object(
                'label', 'Generate Recap',
                'model', 'gpt-4',
                'prompt', 'Create meeting summary'
            )
        ),
        jsonb_build_object(
            'id', '3',
            'type', 'aiAgent',
            'position', jsonb_build_object('x', 350, 'y', 250),
            'data', jsonb_build_object(
                'label', 'Extract Action Items',
                'model', 'gpt-4',
                'prompt', 'Find all tasks with owners'
            )
        ),
        jsonb_build_object(
            'id', '4',
            'type', 'action',
            'position', jsonb_build_object('x', 600, 'y', 150),
            'data', jsonb_build_object(
                'label', 'Create Tasks',
                'provider', 'asana'
            )
        ),
        jsonb_build_object(
            'id', '5',
            'type', 'action',
            'position', jsonb_build_object('x', 600, 'y', 250),
            'data', jsonb_build_object(
                'label', 'Email Attendees',
                'provider', 'gmail'
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object('id', 'e1', 'source', '1', 'target', '2'),
        jsonb_build_object('id', 'e2', 'source', '1', 'target', '3'),
        jsonb_build_object('id', 'e3', 'source', '2', 'target', '4'),
        jsonb_build_object('id', 'e4', 'source', '2', 'target', '5'),
        jsonb_build_object('id', 'e5', 'source', '3', 'target', '4')
    ),
    ARRAY['meeting', 'ai', 'email', 'productivity', 'automation'],
    'productivity'
);

-- ============================================================================
-- 3. Support Escalation
-- ============================================================================
INSERT INTO workflows (
    id,
    organization_id,
    created_by,
    name,
    description,
    status,
    trigger_config,
    actions,
    nodes,
    edges,
    tags,
    template_category
) VALUES (
    gen_random_uuid(),
    v_org_id,
    v_user_id,
    'Support Escalation - Urgent Issues',
    'Detect angry or urgent support emails using AI sentiment analysis, automatically route to on-call engineer, create high-priority ticket, and notify team via Slack',
    'active',
    jsonb_build_object(
        'type', 'email',
        'provider', 'gmail',
        'filters', jsonb_build_object(
            'label', 'support',
            'conditions', jsonb_build_array(
                jsonb_build_object('field', 'to', 'value', 'support@company.com')
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'type', 'ai_sentiment_analysis',
            'model', 'gpt-4',
            'prompt', 'Analyze sentiment: angry, frustrated, urgent, neutral, positive. Also check for urgency keywords.'
        ),
        jsonb_build_object(
            'type', 'condition',
            'rule', 'sentiment IN ["angry", "frustrated"] OR contains_urgent_keywords = true'
        ),
        jsonb_build_object(
            'type', 'get_on_call',
            'provider', 'pagerduty',
            'schedule', 'support-escalation'
        ),
        jsonb_build_object(
            'type', 'create_ticket',
            'provider', 'zendesk',
            'priority', 'high',
            'assignee', '{{on_call_engineer}}',
            'tags', jsonb_build_array('escalated', 'urgent')
        ),
        jsonb_build_object(
            'type', 'slack_alert',
            'channel', '#support-escalations',
            'template', '🚨 *URGENT SUPPORT ESCALATION*\n*Customer:* {{customer_name}}\n*Sentiment:* {{sentiment}}\n*Assigned to:* {{on_call_engineer}}\n*Subject:* {{subject}}\n*Ticket:* {{ticket_url}}\n\n*Customer Message:*\n> {{email_preview}}'
        ),
        jsonb_build_object(
            'type', 'trigger_runbook',
            'runbook', 'support-escalation-checklist',
            'steps', jsonb_build_array(
                '1. Acknowledge within 5 minutes',
                '2. Assess severity',
                '3. Engage engineering if needed',
                '4. Update customer every 30 min'
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'id', '1',
            'type', 'trigger',
            'position', jsonb_build_object('x', 100, 'y', 250),
            'data', jsonb_build_object(
                'label', 'Support Email',
                'icon', 'mail',
                'config', jsonb_build_object('provider', 'gmail', 'filter', 'support inbox')
            )
        ),
        jsonb_build_object(
            'id', '2',
            'type', 'aiAgent',
            'position', jsonb_build_object('x', 300, 'y', 250),
            'data', jsonb_build_object(
                'label', 'Sentiment Analysis',
                'model', 'gpt-4',
                'prompt', 'Detect anger/urgency'
            )
        ),
        jsonb_build_object(
            'id', '3',
            'type', 'condition',
            'position', jsonb_build_object('x', 500, 'y', 250),
            'data', jsonb_build_object(
                'label', 'Is Urgent?',
                'condition', 'angry OR urgent keywords'
            )
        ),
        jsonb_build_object(
            'id', '4',
            'type', 'action',
            'position', jsonb_build_object('x', 700, 'y', 150),
            'data', jsonb_build_object(
                'label', 'Get On-Call',
                'provider', 'pagerduty'
            )
        ),
        jsonb_build_object(
            'id', '5',
            'type', 'action',
            'position', jsonb_build_object('x', 900, 'y', 100),
            'data', jsonb_build_object(
                'label', 'Create High-Priority Ticket',
                'provider', 'zendesk'
            )
        ),
        jsonb_build_object(
            'id', '6',
            'type', 'action',
            'position', jsonb_build_object('x', 900, 'y', 200),
            'data', jsonb_build_object(
                'label', 'Alert Slack',
                'provider', 'slack',
                'channel', '#support-escalations'
            )
        ),
        jsonb_build_object(
            'id', '7',
            'type', 'action',
            'position', jsonb_build_object('x', 900, 'y', 300),
            'data', jsonb_build_object(
                'label', 'Start Runbook',
                'type', 'runbook',
                'name', 'Escalation Checklist'
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object('id', 'e1', 'source', '1', 'target', '2'),
        jsonb_build_object('id', 'e2', 'source', '2', 'target', '3'),
        jsonb_build_object('id', 'e3', 'source', '3', 'target', '4', 'label', 'Yes'),
        jsonb_build_object('id', 'e4', 'source', '4', 'target', '5'),
        jsonb_build_object('id', 'e5', 'source', '4', 'target', '6'),
        jsonb_build_object('id', 'e6', 'source', '4', 'target', '7')
    ),
    ARRAY['support', 'escalation', 'ai', 'slack', 'urgent', 'automation'],
    'automation'
);

END $$;
