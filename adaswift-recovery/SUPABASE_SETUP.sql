-- ADA Console Supabase Setup
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ENABLE AUTH PROVIDERS
-- ============================================
-- Go to Authentication → Providers in Supabase Dashboard
-- Enable "Email" provider

-- ============================================
-- 2. CREATE USER (Run this after first deploy)
-- ============================================
-- Option A: Use Supabase Dashboard (Recommended)
-- Go to Authentication → Users → Add User
-- Email: swiftsoftware143@yahoo.com
-- Password: (create a strong password)

-- Option B: SQL (if you have admin access)
-- Note: This creates a user but you'll need to verify email via dashboard

-- ============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS widget_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_websites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read widget_requests" ON widget_requests;
DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can read personal_websites" ON personal_websites;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read widget_requests"
  ON widget_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read personal_websites"
  ON personal_websites FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 4. OPTIONAL: CREATE USER VIA SQL
-- ============================================
-- Uncomment and run this if you want to create user via SQL
-- Note: Password must be hashed, better to use dashboard

/*
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'swiftsoftware143@yahoo.com',
  crypt('YOUR_PASSWORD_HERE', gen_salt('bf')),
  now(),
  now(),
  now()
);
*/

-- ============================================
-- 5. VERIFY SETUP
-- ============================================
-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('widget_requests', 'clients', 'personal_websites');
