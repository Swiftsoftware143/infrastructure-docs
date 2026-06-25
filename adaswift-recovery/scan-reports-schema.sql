-- ADA Scan Reports - Minimal Schema

CREATE TABLE IF NOT EXISTS client_scan_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  monthly_scan_enabled boolean DEFAULT false,
  last_scan_at timestamptz,
  last_scan_score integer,
  scan_count integer DEFAULT 0,
  UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS scan_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  scan_date timestamptz DEFAULT now(),
  domain text NOT NULL,
  overall_score integer,
  error_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  scan_results jsonb,
  previous_scan_id uuid REFERENCES scan_reports(id),
  improvement_score integer,
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz
);

CREATE OR REPLACE FUNCTION increment_scan_count(p_client_id uuid)
RETURNS integer AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT scan_count INTO current_count FROM client_scan_settings WHERE client_id = p_client_id;
  RETURN COALESCE(current_count, 0) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_scan_reports_client_id ON scan_reports(client_id);
CREATE INDEX idx_scan_reports_scan_date ON scan_reports(scan_date DESC);
CREATE INDEX idx_client_scan_settings_enabled ON client_scan_settings(monthly_scan_enabled) WHERE monthly_scan_enabled = true;

ALTER TABLE client_scan_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON client_scan_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON scan_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'Scan reports schema ready' as status;
