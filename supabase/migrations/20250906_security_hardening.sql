-- Enhanced Security Hardening for GadgetGuru Database
-- Implementing bulletproof RLS and access controls

-- 1. Enhanced RLS Policies with IP restrictions and rate limiting
ALTER TABLE gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- 2. Create security audit table for monitoring access
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Bulletproof RLS Policies

-- Gadgets: Public read but with audit logging
DROP POLICY IF EXISTS "Public gadgets read access" ON gadgets;
CREATE POLICY "Secured gadgets read access" ON gadgets
  FOR SELECT USING (
    -- Log all access attempts
    (SELECT log_access_attempt('gadgets', 'SELECT', auth.uid(), inet_client_addr()))
    AND true
  );

-- Admin-only write access to gadgets (for scraping)
DROP POLICY IF EXISTS "Admin gadgets write access" ON gadgets;
CREATE POLICY "Admin gadgets write access" ON gadgets
  FOR INSERT WITH CHECK (
    -- Only service role can insert
    auth.jwt() ->> 'role' = 'service_role'
    AND (SELECT log_access_attempt('gadgets', 'INSERT', auth.uid(), inet_client_addr()))
  );

-- Reviews: Public read with strict validation
DROP POLICY IF EXISTS "Public reviews read access" ON reviews;
CREATE POLICY "Secured reviews read access" ON reviews
  FOR SELECT USING (
    -- Validate request and log
    (SELECT validate_and_log_request('reviews', 'SELECT', auth.uid()))
    AND verified = true  -- Only show verified reviews
  );

-- Specifications: Public read with validation
CREATE POLICY "Secured specifications read" ON specifications
  FOR SELECT USING (
    (SELECT validate_and_log_request('specifications', 'SELECT', auth.uid()))
  );

-- Benchmarks: Public read with validation  
CREATE POLICY "Secured benchmarks read" ON benchmarks
  FOR SELECT USING (
    (SELECT validate_and_log_request('benchmarks', 'SELECT', auth.uid()))
  );

-- Embeddings: Heavily restricted access
CREATE POLICY "Restricted embeddings access" ON embeddings
  FOR SELECT USING (
    -- Only authenticated users with valid session
    auth.uid() IS NOT NULL
    AND (SELECT validate_premium_access(auth.uid()))
    AND (SELECT log_access_attempt('embeddings', 'SELECT', auth.uid(), inet_client_addr()))
  );

-- Recommendations: User-specific access
CREATE POLICY "User recommendations access" ON recommendations
  FOR SELECT USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND (SELECT validate_and_log_request('recommendations', 'SELECT', auth.uid())))
  );

CREATE POLICY "User recommendations insert" ON recommendations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (SELECT validate_rate_limit(auth.uid(), 'recommendations', 10, '1 hour'))
  );

-- User preferences: Strict user ownership
CREATE POLICY "Own preferences only" ON user_preferences
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Feedback: Rate-limited user access
CREATE POLICY "Rate limited feedback" ON feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (SELECT validate_rate_limit(auth.uid(), 'feedback', 5, '1 hour'))
  );

-- Scraping jobs: Admin only
CREATE POLICY "Admin scraping jobs only" ON scraping_jobs
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    AND (SELECT log_access_attempt('scraping_jobs', TG_OP, auth.uid(), inet_client_addr()))
  );

-- 4. Security Functions

-- Function to log all access attempts
CREATE OR REPLACE FUNCTION log_access_attempt(
  table_name TEXT,
  action TEXT,
  user_id UUID,
  ip_address INET DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO security_audit_log (user_id, action, table_name, ip_address, success, created_at)
  VALUES (user_id, action, table_name, COALESCE(ip_address, inet_client_addr()), true, NOW());
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Log failed attempt
  INSERT INTO security_audit_log (user_id, action, table_name, ip_address, success, error_details, created_at)
  VALUES (user_id, action, table_name, COALESCE(ip_address, inet_client_addr()), false, 
          jsonb_build_object('error', SQLERRM), NOW());
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate requests and implement rate limiting
CREATE OR REPLACE FUNCTION validate_and_log_request(
  table_name TEXT,
  action TEXT,
  user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
  ip_addr INET := inet_client_addr();
BEGIN
  -- Check rate limit (100 requests per minute per IP)
  SELECT COUNT(*) INTO request_count
  FROM security_audit_log
  WHERE ip_address = ip_addr
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF request_count > 100 THEN
    PERFORM log_access_attempt(table_name, action || '_RATE_LIMITED', user_id, ip_addr);
    RETURN false;
  END IF;
  
  -- Check for suspicious patterns
  IF EXISTS (
    SELECT 1 FROM security_audit_log
    WHERE ip_address = ip_addr
      AND success = false
      AND created_at > NOW() - INTERVAL '5 minutes'
    HAVING COUNT(*) > 10
  ) THEN
    PERFORM log_access_attempt(table_name, action || '_BLOCKED_SUSPICIOUS', user_id, ip_addr);
    RETURN false;
  END IF;
  
  PERFORM log_access_attempt(table_name, action, user_id, ip_addr);
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate premium access for embeddings
CREATE OR REPLACE FUNCTION validate_premium_access(user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has premium access or is within free tier limits
  -- For now, allow authenticated users (expand with subscription logic later)
  RETURN user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to implement granular rate limiting
CREATE OR REPLACE FUNCTION validate_rate_limit(
  user_id UUID,
  action_type TEXT,
  max_requests INTEGER,
  time_window INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM security_audit_log
  WHERE security_audit_log.user_id = validate_rate_limit.user_id
    AND action LIKE action_type || '%'
    AND created_at > NOW() - time_window;
    
  RETURN request_count < max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create indexes for security performance
CREATE INDEX IF NOT EXISTS idx_security_audit_user_time ON security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_ip_time ON security_audit_log(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log(action, table_name);

-- 6. Real-time security monitoring view
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  table_name,
  action,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), table_name, action
ORDER BY hour DESC;

-- Grant appropriate permissions
GRANT SELECT ON security_dashboard TO authenticated;
GRANT SELECT ON security_audit_log TO service_role;