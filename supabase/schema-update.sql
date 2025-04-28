-- Add new columns to analytics table for detailed provider information
ALTER TABLE public.analytics 
ADD COLUMN IF NOT EXISTS provider_details JSONB,
ADD COLUMN IF NOT EXISTS response_time INTEGER,
ADD COLUMN IF NOT EXISTS request_size INTEGER,
ADD COLUMN IF NOT EXISTS response_size INTEGER;

-- Create functions for analytics queries
CREATE OR REPLACE FUNCTION get_analytics_totals()
RETURNS TABLE (
  total_cost NUMERIC,
  total_tokens BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(cost)::NUMERIC AS total_cost,
    SUM(tokens)::BIGINT AS total_tokens
  FROM public.analytics;
END;
$$;

CREATE OR REPLACE FUNCTION get_provider_totals()
RETURNS TABLE (
  provider TEXT,
  total_cost NUMERIC,
  total_tokens BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    analytics.provider,
    SUM(cost)::NUMERIC AS total_cost,
    SUM(tokens)::BIGINT AS total_tokens
  FROM public.analytics
  GROUP BY analytics.provider;
END;
$$;

CREATE OR REPLACE FUNCTION get_type_totals()
RETURNS TABLE (
  type TEXT,
  count BIGINT,
  total_cost NUMERIC,
  total_tokens BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    analytics.type,
    COUNT(*)::BIGINT AS count,
    SUM(cost)::NUMERIC AS total_cost,
    SUM(tokens)::BIGINT AS total_tokens
  FROM public.analytics
  GROUP BY analytics.type;
END;
$$;

CREATE OR REPLACE FUNCTION get_tier_totals()
RETURNS TABLE (
  user_tier TEXT,
  count BIGINT,
  total_cost NUMERIC,
  total_tokens BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    analytics.user_tier,
    COUNT(*)::BIGINT AS count,
    SUM(cost)::NUMERIC AS total_cost,
    SUM(tokens)::BIGINT AS total_tokens
  FROM public.analytics
  GROUP BY analytics.user_tier;
END;
$$;

CREATE OR REPLACE FUNCTION get_daily_usage()
RETURNS TABLE (
  date TEXT,
  count BIGINT,
  total_cost NUMERIC,
  total_tokens BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(analytics.timestamp, 'YYYY-MM-DD') AS date,
    COUNT(*)::BIGINT AS count,
    SUM(cost)::NUMERIC AS total_cost,
    SUM(tokens)::BIGINT AS total_tokens
  FROM public.analytics
  GROUP BY TO_CHAR(analytics.timestamp, 'YYYY-MM-DD')
  ORDER BY date DESC;
END;
$$;

-- Add password column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password'
    ) THEN
        ALTER TABLE users ADD COLUMN password TEXT;
    END IF;
END $$;
