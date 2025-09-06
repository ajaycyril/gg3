-- Dynamic AI-Adaptive Platform - Production Ready Migration
-- Comprehensive schema for adaptive user interfaces and OpenAI integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced user profiles for adaptive AI interface
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Adaptive Interface Learning
  expertise_level VARCHAR(20) DEFAULT 'auto_detect',
  interface_complexity_preference INTEGER DEFAULT 5,
  preferred_interaction_style VARCHAR(20) DEFAULT 'conversational',
  
  -- Dynamic Preference Learning (AI-driven)
  learned_preferences JSONB DEFAULT '{}',
  interaction_patterns JSONB DEFAULT '{}',
  question_complexity_history JSONB DEFAULT '[]',
  
  -- Use Case Detection (Dynamic)
  detected_use_cases JSONB DEFAULT '{}',
  use_case_confidence JSONB DEFAULT '{}',
  contextual_triggers JSONB DEFAULT '{}',
  
  -- Budget Intelligence (Adaptive)
  budget_patterns JSONB DEFAULT '{}',
  value_sensitivity DECIMAL(3,2) DEFAULT 0.5,
  financing_openness DECIMAL(3,2) DEFAULT 0.3,
  
  -- Technical Depth Preferences (Dynamic)
  technical_interests JSONB DEFAULT '{}',
  benchmark_engagement JSONB DEFAULT '{}',
  spec_detail_preference INTEGER DEFAULT 5,
  
  -- Conversation Context (AI-maintained)
  conversation_history JSONB DEFAULT '[]',
  current_session_context JSONB DEFAULT '{}',
  abandoned_searches JSONB DEFAULT '[]',
  
  -- AI Personalization Vectors
  preference_embedding VECTOR(1024),
  interaction_embedding VECTOR(512),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Dynamic conversation sessions for adaptive AI chat
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Context
  session_goal VARCHAR(100),
  current_phase VARCHAR(50),
  complexity_level INTEGER DEFAULT 5,
  
  -- AI Conversation State
  conversation_context JSONB NOT NULL DEFAULT '{}',
  user_preferences_extracted JSONB DEFAULT '{}',
  mentioned_requirements JSONB DEFAULT '{}',
  
  -- Dynamic Question Generation
  suggested_questions JSONB DEFAULT '[]',
  question_priority_scores JSONB DEFAULT '{}',
  asked_questions JSONB DEFAULT '[]',
  
  -- Adaptive Recommendations
  current_recommendations JSONB DEFAULT '[]',
  recommendation_reasoning JSONB DEFAULT '{}',
  user_feedback_history JSONB DEFAULT '[]',
  
  -- Session Intelligence
  session_embedding VECTOR(768),
  intent_classification JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Dynamic UI component configurations
CREATE TABLE IF NOT EXISTS adaptive_ui_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Interface Adaptation
  component_visibility JSONB NOT NULL DEFAULT '{}',
  component_complexity JSONB NOT NULL DEFAULT '{}',
  layout_preferences JSONB NOT NULL DEFAULT '{}',
  
  -- Dynamic Filtering
  active_filters JSONB NOT NULL DEFAULT '{}',
  filter_suggestions JSONB NOT NULL DEFAULT '[]',
  hidden_filters JSONB NOT NULL DEFAULT '[]',
  
  -- Content Personalization
  content_detail_levels JSONB NOT NULL DEFAULT '{}',
  preferred_metrics JSONB NOT NULL DEFAULT '[]',
  comparison_preferences JSONB NOT NULL DEFAULT '{}',
  
  -- AI-Generated Interface Elements
  personalized_labels JSONB NOT NULL DEFAULT '{}',
  contextual_tooltips JSONB NOT NULL DEFAULT '{}',
  smart_shortcuts JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- AI conversation logs for continuous learning
CREATE TABLE IF NOT EXISTS ai_conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation Turn
  turn_number INTEGER NOT NULL,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  
  -- AI Processing Context
  intent_detected VARCHAR(100),
  entities_extracted JSONB DEFAULT '{}',
  sentiment_score DECIMAL(3,2),
  complexity_level INTEGER,
  
  -- Response Generation Context
  openai_model_used VARCHAR(50),
  prompt_template_used VARCHAR(100),
  response_generation_time_ms INTEGER,
  
  -- User Interaction
  user_satisfaction DECIMAL(3,2),
  follow_up_clicked BOOLEAN DEFAULT false,
  recommendation_clicked BOOLEAN DEFAULT false,
  
  -- Learning Signals
  successful_turn BOOLEAN,
  error_type VARCHAR(50),
  improvement_suggestions TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dynamic product recommendations with AI reasoning
CREATE TABLE IF NOT EXISTS dynamic_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES conversation_sessions(id),
  laptop_id UUID REFERENCES laptops(id),
  
  -- Dynamic Scoring (AI-computed)
  overall_score DECIMAL(5,4) NOT NULL,
  score_components JSONB NOT NULL,
  confidence_level DECIMAL(3,2) NOT NULL,
  
  -- Adaptive Reasoning
  ai_reasoning TEXT NOT NULL,
  reasoning_complexity_level INTEGER NOT NULL,
  personalized_highlights JSONB NOT NULL,
  potential_concerns JSONB DEFAULT '[]',
  
  -- Context-Aware Information
  budget_fit_explanation TEXT,
  use_case_alignment JSONB NOT NULL,
  technical_deep_dive JSONB,
  
  -- Comparison Context
  comparison_advantages JSONB DEFAULT '[]',
  comparison_tradeoffs JSONB DEFAULT '[]',
  alternative_suggestions JSONB DEFAULT '[]',
  
  -- User Interaction Tracking
  presentation_format VARCHAR(50),
  user_engagement_time INTEGER,
  user_action VARCHAR(50),
  
  -- AI Model Context
  model_version VARCHAR(50),
  generated_with_context JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enhance existing laptops table for dynamic AI processing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laptops' AND column_name = 'ai_generated_description') THEN
        ALTER TABLE laptops ADD COLUMN ai_generated_description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laptops' AND column_name = 'target_personas') THEN
        ALTER TABLE laptops ADD COLUMN target_personas JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laptops' AND column_name = 'complexity_suitability') THEN
        ALTER TABLE laptops ADD COLUMN complexity_suitability JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laptops' AND column_name = 'dynamic_tags') THEN
        ALTER TABLE laptops ADD COLUMN dynamic_tags JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laptops' AND column_name = 'ai_insights') THEN
        ALTER TABLE laptops ADD COLUMN ai_insights JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laptops' AND column_name = 'comparison_highlights') THEN
        ALTER TABLE laptops ADD COLUMN comparison_highlights JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_expertise ON user_profiles(user_id, expertise_level);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_active ON conversation_sessions(user_id, created_at DESC) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_session ON ai_conversation_logs(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_dynamic_recommendations_user_score ON dynamic_recommendations(user_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_expires ON conversation_sessions(expires_at) WHERE expires_at <= NOW();

-- Vector indexes for AI embeddings (if vector extension is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX IF NOT EXISTS idx_user_profiles_preference_embedding 
          ON user_profiles USING ivfflat (preference_embedding vector_cosine_ops) WITH (lists = 100);
        CREATE INDEX IF NOT EXISTS idx_conversation_sessions_embedding 
          ON conversation_sessions USING ivfflat (session_embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
END $$;

-- Enable RLS for all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_ui_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secure access
CREATE POLICY "Users own their profiles" ON user_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users own their conversations" ON conversation_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users own their UI configs" ON adaptive_ui_configs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users own their conversation logs" ON ai_conversation_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see their own recommendations" ON dynamic_recommendations
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Create functions for dynamic AI integration

-- Function to update user expertise level based on interactions
CREATE OR REPLACE FUNCTION update_user_expertise_level(
  p_user_id UUID,
  p_interaction_data JSONB
) RETURNS VOID AS $$
DECLARE
  current_level VARCHAR(20);
  complexity_signals INTEGER[];
  avg_complexity DECIMAL;
BEGIN
  SELECT expertise_level INTO current_level
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  SELECT array_agg((interaction->>'complexity')::INTEGER)
  INTO complexity_signals
  FROM jsonb_array_elements(p_interaction_data) AS interaction
  WHERE interaction->>'complexity' IS NOT NULL;
  
  IF array_length(complexity_signals, 1) > 0 THEN
    SELECT AVG(unnest) INTO avg_complexity FROM unnest(complexity_signals);
    
    UPDATE user_profiles 
    SET 
      expertise_level = CASE 
        WHEN avg_complexity >= 8 THEN 'expert'
        WHEN avg_complexity >= 6 THEN 'intermediate'
        WHEN avg_complexity >= 3 THEN 'beginner'
        ELSE 'auto_detect'
      END,
      interaction_patterns = interaction_patterns || p_interaction_data,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate dynamic UI configuration
CREATE OR REPLACE FUNCTION generate_adaptive_ui_config(
  p_user_id UUID,
  p_context JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  user_profile RECORD;
  ui_config JSONB;
BEGIN
  SELECT * INTO user_profile
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  ui_config := jsonb_build_object(
    'expertise_level', COALESCE(user_profile.expertise_level, 'auto_detect'),
    'show_advanced_filters', 
      CASE 
        WHEN user_profile.expertise_level IN ('expert', 'intermediate') THEN true
        ELSE false
      END,
    'benchmark_detail_level',
      CASE 
        WHEN user_profile.expertise_level = 'expert' THEN 'detailed'
        WHEN user_profile.expertise_level = 'intermediate' THEN 'moderate'
        ELSE 'simplified'
      END,
    'show_technical_specs',
      CASE 
        WHEN COALESCE(user_profile.spec_detail_preference, 5) >= 7 THEN true
        ELSE false
      END
  );
  
  RETURN ui_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_sessions WHERE expires_at <= NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create periodic cleanup job (if pg_cron is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('cleanup-expired-sessions', '0 */6 * * *', 'SELECT cleanup_expired_sessions();');
    END IF;
END $$;