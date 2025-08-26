-- supabase/migrations/[timestamp]_fix_auth_flow.sql

-- Create profile automatically when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, onboarded)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Ensure create_organization function exists and works correctly
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
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Check if slug is already taken
    IF EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) THEN
        RAISE EXCEPTION 'Organization slug already exists';
    END IF;
    
    -- Insert the organization
    INSERT INTO organizations (name, slug, description)
    VALUES (org_name, org_slug, org_description)
    RETURNING id INTO new_org_id;
    
    -- Add the creator as owner
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    VALUES (new_org_id, current_user_id, 'owner', NOW());
    
    -- Log the action if audit_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id)
        VALUES (new_org_id, current_user_id, 'organization.created', 'organization', new_org_id);
    END IF;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for checking membership
CREATE OR REPLACE FUNCTION check_organization_membership(
    org_id UUID,
    user_id UUID,
    required_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_id 
    AND joined_at IS NOT NULL;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check role hierarchy: owner > admin > member > viewer
    CASE required_role
        WHEN 'owner' THEN
            RETURN user_role = 'owner';
        WHEN 'admin' THEN
            RETURN user_role IN ('owner', 'admin');
        WHEN 'member' THEN
            RETURN user_role IN ('owner', 'admin', 'member');
        WHEN 'viewer' THEN
            RETURN user_role IN ('owner', 'admin', 'member', 'viewer');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;