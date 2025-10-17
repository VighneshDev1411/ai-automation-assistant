-- Update existing organization members who don't have joined_at set
-- This fixes members who were added before we started tracking joined_at

UPDATE organization_members
SET joined_at = invited_at
WHERE joined_at IS NULL;

-- This assumes that if a member exists without joined_at, they've already joined
-- We use invited_at as the joined_at timestamp for historical records
