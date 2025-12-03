-- AI Lesson Planner Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'school')),
  subscription_id TEXT,
  subscription_status TEXT,
  subscription_current_period_end TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lesson-plan', 'syllabus', 'paper', 'quiz', 'study-notes', 'concept-map', 'other')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  template_id TEXT,
  image_url TEXT,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'school')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Logs Table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  document_type TEXT,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth0_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth0_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own usage logs" ON usage_logs
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Function to reset monthly usage count
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET usage_count = 0, 
      usage_reset_date = NOW() + INTERVAL '1 month'
  WHERE usage_reset_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(user_auth0_id TEXT)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  limit_value INTEGER;
  result JSONB;
BEGIN
  SELECT * INTO user_record FROM users WHERE auth0_id = user_auth0_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Reset if needed
  IF user_record.usage_reset_date < NOW() THEN
    UPDATE users 
    SET usage_count = 0, 
        usage_reset_date = NOW() + INTERVAL '1 month'
    WHERE auth0_id = user_auth0_id;
    user_record.usage_count := 0;
  END IF;
  
  -- Determine limit based on tier
  CASE user_record.subscription_tier
    WHEN 'free' THEN limit_value := 5;
    WHEN 'pro' THEN limit_value := 999999; -- Unlimited
    WHEN 'school' THEN limit_value := 999999; -- Unlimited
    ELSE limit_value := 5;
  END CASE;
  
  IF user_record.usage_count >= limit_value THEN
    result := jsonb_build_object(
      'allowed', false, 
      'reason', 'Usage limit reached',
      'current', user_record.usage_count,
      'limit', limit_value,
      'tier', user_record.subscription_tier
    );
  ELSE
    result := jsonb_build_object(
      'allowed', true,
      'current', user_record.usage_count,
      'limit', limit_value,
      'tier', user_record.subscription_tier
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(user_auth0_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET usage_count = usage_count + 1
  WHERE auth0_id = user_auth0_id;
END;
$$ LANGUAGE plpgsql;
