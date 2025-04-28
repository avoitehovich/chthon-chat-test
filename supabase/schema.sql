-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  tier TEXT NOT NULL DEFAULT 'freemium',
  tier_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  tokens INTEGER NOT NULL DEFAULT 0,
  processing_time INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  user_tier TEXT
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON public.analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_provider ON public.analytics(provider);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.analytics(type);
CREATE INDEX IF NOT EXISTS idx_analytics_success ON public.analytics(success);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_updated ON public.chat_sessions(last_updated);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);

CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only read and update their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Chat sessions
CREATE POLICY "Users can CRUD own chat sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can CRUD messages in own chat sessions" ON public.messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Analytics - only admins can access all analytics
CREATE POLICY "Users can read own analytics" ON public.analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Admin settings - only service role can modify
CREATE POLICY "Anyone can read admin settings" ON public.admin_settings
  FOR SELECT USING (true);

-- Create functions
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
-- Trigger to update the updated_at column on users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update the updated_at column on admin_settings table
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin settings
INSERT INTO public.admin_settings (id, settings)
VALUES ('global', '{"default_tier": "freemium", "allow_registration": true, "maintenance_mode": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;
