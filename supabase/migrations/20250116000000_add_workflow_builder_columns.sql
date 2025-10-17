-- Add nodes and edges columns to workflows table for visual workflow builder
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS nodes JSONB DEFAULT '[]';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS edges JSONB DEFAULT '[]';

-- Make organization_id nullable to support users without organizations
ALTER TABLE workflows ALTER COLUMN organization_id DROP NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN workflows.nodes IS 'Visual workflow nodes for React Flow builder';
COMMENT ON COLUMN workflows.edges IS 'Visual workflow connections for React Flow builder';
