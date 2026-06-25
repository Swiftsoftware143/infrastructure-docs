-- ADASwift Integration Events Schema
-- Tracks leads coming from FunnelSwift and other sources

-- Table to log all integration events
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source information
  source TEXT NOT NULL, -- 'funnelswift', 'manual', 'api'
  event_type TEXT NOT NULL, -- 'demo.created', 'demo.upgraded', 'widget.installed'
  
  -- Related records
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  website_id UUID REFERENCES personal_websites(id) ON DELETE SET NULL,
  
  -- Tracking (for affiliate attribution)
  tracking_id TEXT,
  referred_by_user_id UUID, -- FunnelSwift user who referred this lead
  funnelswift_contact_id TEXT,
  funnelswift_tenant_id TEXT,
  
  -- Event payload
  payload JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, processed, failed
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_events_source ON integration_events(source);
CREATE INDEX IF NOT EXISTS idx_integration_events_client ON integration_events(client_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_tracking ON integration_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_referred_by ON integration_events(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_created ON integration_events(created_at);

-- Add columns to clients table for tracking
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS funnelswift_contact_id TEXT,
ADD COLUMN IF NOT EXISTS funnelswift_tracking_id TEXT,
ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add columns to personal_websites table for tracking
ALTER TABLE personal_websites
ADD COLUMN IF NOT EXISTS funnelswift_tracking_id TEXT,
ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT;

-- Enable RLS
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on integration_events"
ON integration_events FOR ALL
USING (true)
WITH CHECK (true);
