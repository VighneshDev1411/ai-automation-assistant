DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            avatar_url TEXT,
            job_title VARCHAR(255),
            phone VARCHAR(50),
            timezone VARCHAR(50) DEFAULT 'UTC',
            preferences JSONB DEFAULT '{}',
            onboarded BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can read own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);
            
        CREATE POLICY "Users can insert own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Check if organizations table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations') THEN
        -- Create enum types first
        CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
        
        CREATE TABLE organizations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            logo_url TEXT,
            settings JSONB DEFAULT '{}',
            subscription_tier VARCHAR(50) DEFAULT 'free',
            subscription_expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
        
        -- Create organization members table
        CREATE TABLE organization_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            role user_role NOT NULL DEFAULT 'member',
            invited_by UUID REFERENCES profiles(id),
            invited_at TIMESTAMPTZ DEFAULT NOW(),
            joined_at TIMESTAMPTZ,
            UNIQUE(organization_id, user_id)
        );
        
        -- Enable RLS
        ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for organizations
        CREATE POLICY "Users can read organizations they belong to" ON organizations
            FOR SELECT USING (
                id IN (
                    SELECT organization_id FROM organization_members 
                    WHERE user_id = auth.uid() AND joined_at IS NOT NULL
                )
            );
            
        CREATE POLICY "Organization owners can update organization" ON organizations
            FOR UPDATE USING (
                id IN (
                    SELECT organization_id FROM organization_members 
                    WHERE user_id = auth.uid() AND role = 'owner'
                )
            );
        
        -- Create RLS policies for organization_members
        CREATE POLICY "Users can read organization memberships" ON organization_members
            FOR SELECT USING (
                user_id = auth.uid() OR 
                organization_id IN (
                    SELECT organization_id FROM organization_members 
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at 
            BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
        CREATE TRIGGER update_organizations_updated_at 
            BEFORE UPDATE ON organizations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;