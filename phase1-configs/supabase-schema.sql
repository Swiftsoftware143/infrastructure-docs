-- Supabase Schema for Credit System
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User credits table
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Credit transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment')),
  amount INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit usage tracking table
CREATE TABLE credit_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- 'openclaw', 'n8n', 'llm', 'crm'
  action TEXT NOT NULL, -- 'inference', 'workflow', 'agent', 'automation'
  credits_used INTEGER NOT NULL CHECK (credits_used > 0),
  cost_usd DECIMAL(10,6), -- Your actual cost
  revenue_usd DECIMAL(10,2), -- What you charged
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing tiers table
CREATE TABLE credit_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
  bonus_credits INTEGER DEFAULT 0 CHECK (bonus_credits >= 0),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing tiers
INSERT INTO credit_pricing (tier_name, credits, price_usd, bonus_credits) VALUES
  ('Starter', 100, 5.00, 0),
  ('Growth', 500, 20.00, 50),
  ('Pro', 2000, 75.00, 300),
  ('Enterprise', 10000, 300.00, 2000),
  ('Pay As You Go', 1, 0.10, 0);

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_service TEXT,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_description TEXT;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- Check if user exists
  IF v_current_balance IS NULL THEN
    -- Create record with 0 balance
    INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, 0);
    v_current_balance := 0;
  END IF;
  
  -- Check if enough credits
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Set description if not provided
  v_description := COALESCE(p_description, 
    p_service || ' - ' || p_action || ' (' || p_amount || ' credits)');
  
  -- Deduct credits
  UPDATE user_credits
  SET balance = balance - p_amount,
      lifetime_used = lifetime_used + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'usage', -p_amount, v_description);
  
  -- Record usage
  INSERT INTO credit_usage (user_id, service, action, credits_used)
  VALUES (p_user_id, p_service, p_action, p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Ensure user record exists
  INSERT INTO user_credits (user_id, balance, lifetime_purchased)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_credits.balance + p_amount,
    lifetime_purchased = user_credits.lifetime_purchased + p_amount,
    updated_at = NOW();
  
  -- Record transaction
  INSERT INTO credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, p_type, p_amount, COALESCE(p_description, p_type || ' of ' || p_amount || ' credits'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get credit balance
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM user_credits
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_credits_isolation ON user_credits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY credit_transactions_isolation ON credit_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY credit_usage_isolation ON credit_usage
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);

-- Grant permissions
GRANT ALL ON user_credits TO authenticated;
GRANT ALL ON credit_transactions TO authenticated;
GRANT ALL ON credit_usage TO authenticated;
GRANT ALL ON credit_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance TO authenticated;
