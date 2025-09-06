-- GadgetGuru Dynamic AI-Adaptive Platform Schema
-- Optimized for adaptive user interfaces and dynamic OpenAI integration

-- Enhanced user profiles for adaptive AI interface
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Adaptive Interface Learning
  expertise_level VARCHAR(20) DEFAULT 'auto_detect', -- auto_detect, beginner, intermediate, expert
  interface_complexity_preference INTEGER DEFAULT 5, -- 1-10 scale
  preferred_interaction_style VARCHAR(20) DEFAULT 'conversational', -- conversational, technical, visual
  
  -- Dynamic Preference Learning (AI-driven)
  learned_preferences JSONB DEFAULT '{}', -- AI-extracted user preferences
  interaction_patterns JSONB DEFAULT '{}', -- Click patterns, time spent on features
  question_complexity_history JSONB DEFAULT '[]', -- Track complexity of questions asked
  
  -- Use Case Detection (Dynamic)
  detected_use_cases JSONB DEFAULT '{}', -- AI-detected: gaming, professional, student, creative
  use_case_confidence JSONB DEFAULT '{}', -- Confidence scores for each use case
  contextual_triggers JSONB DEFAULT '{}', -- What triggers different use cases
  
  -- Budget Intelligence (Adaptive)
  budget_patterns JSONB DEFAULT '{}', -- Historical budget considerations
  value_sensitivity DECIMAL(3,2) DEFAULT 0.5, -- How price-sensitive the user is
  financing_openness DECIMAL(3,2) DEFAULT 0.3, -- Openness to financing options
  
  -- Technical Depth Preferences (Dynamic)
  technical_interests JSONB DEFAULT '{}', -- CPU, GPU, RAM, storage, display interests
  benchmark_engagement JSONB DEFAULT '{}', -- How user engages with benchmarks
  spec_detail_preference INTEGER DEFAULT 5, -- 1-10 how much detail they want
  
  -- Conversation Context (AI-maintained)
  conversation_history JSONB DEFAULT '[]', -- Recent conversation context
  current_session_context JSONB DEFAULT '{}', -- Current shopping session context
  abandoned_searches JSONB DEFAULT '[]', -- Searches they started but didn't complete
  
  -- AI Personalization Vectors
  preference_embedding VECTOR(1024), -- OpenAI-generated preference embeddings
  interaction_embedding VECTOR(512), -- Behavior pattern embeddings
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dynamic conversation sessions for adaptive AI chat
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Context
  session_goal VARCHAR(100), -- find_laptop, compare_options, deep_dive_specs, etc.
  current_phase VARCHAR(50), -- discovery, refinement, comparison, decision
  complexity_level INTEGER DEFAULT 5, -- Current conversation complexity (1-10)
  
  -- AI Conversation State
  conversation_context JSONB NOT NULL DEFAULT '{}', -- Full conversation context
  user_preferences_extracted JSONB DEFAULT '{}', -- AI-extracted preferences
  mentioned_requirements JSONB DEFAULT '{}', -- Requirements mentioned in chat
  
  -- Dynamic Question Generation
  suggested_questions JSONB DEFAULT '[]', -- AI-generated follow-up questions
  question_priority_scores JSONB DEFAULT '{}', -- Priority scores for each question
  asked_questions JSONB DEFAULT '[]', -- Questions already asked
  
  -- Adaptive Recommendations
  current_recommendations JSONB DEFAULT '[]', -- Current recommendation set
  recommendation_reasoning JSONB DEFAULT '{}', -- AI reasoning for each recommendation
  user_feedback_history JSONB DEFAULT '[]', -- User feedback on recommendations
  
  -- Session Intelligence
  session_embedding VECTOR(768), -- Session context embedding
  intent_classification JSONB DEFAULT '{}', -- Classified user intents
  
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
  component_visibility JSONB NOT NULL DEFAULT '{}', -- Which components to show/hide
  component_complexity JSONB NOT NULL DEFAULT '{}', -- Complexity level for each component
  layout_preferences JSONB NOT NULL DEFAULT '{}', -- Grid vs list, compact vs detailed
  
  -- Dynamic Filtering
  active_filters JSONB NOT NULL DEFAULT '{}', -- Currently applied filters
  filter_suggestions JSONB NOT NULL DEFAULT '[]', -- AI-suggested filters
  hidden_filters JSONB NOT NULL DEFAULT '[]', -- Filters hidden based on expertise
  
  -- Content Personalization
  content_detail_levels JSONB NOT NULL DEFAULT '{}', -- Detail level per content type
  preferred_metrics JSONB NOT NULL DEFAULT '[]', -- Which benchmarks/specs to highlight
  comparison_preferences JSONB NOT NULL DEFAULT '{}', -- How to display comparisons
  
  -- AI-Generated Interface Elements
  personalized_labels JSONB NOT NULL DEFAULT '{}', -- Custom labels for technical terms
  contextual_tooltips JSONB NOT NULL DEFAULT '{}', -- AI-generated explanations
  smart_shortcuts JSONB NOT NULL DEFAULT '[]', -- Personalized quick actions
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced laptops table for dynamic AI processing
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS target_personas JSONB DEFAULT '{}';
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS complexity_适合度 JSONB DEFAULT '{}'; -- Suitability for different complexity levels
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS dynamic_tags JSONB DEFAULT '[]';
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}';
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS comparison_highlights JSONB DEFAULT '{}';

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
  user_satisfaction DECIMAL(3,2), -- If user provides feedback
  follow_up_clicked BOOLEAN DEFAULT false,
  recommendation_clicked BOOLEAN DEFAULT false,
  
  -- Learning Signals
  successful_turn BOOLEAN, -- Whether this turn was successful
  error_type VARCHAR(50), -- If there was an error
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
  score_components JSONB NOT NULL, -- Breakdown of how score was calculated
  confidence_level DECIMAL(3,2) NOT NULL,
  
  -- Adaptive Reasoning
  ai_reasoning TEXT NOT NULL, -- Natural language explanation
  reasoning_complexity_level INTEGER NOT NULL, -- 1-10 complexity of explanation
  personalized_highlights JSONB NOT NULL, -- Key points for this specific user
  potential_concerns JSONB DEFAULT '[]', -- AI-identified concerns
  
  -- Context-Aware Information
  budget_fit_explanation TEXT,
  use_case_alignment JSONB NOT NULL, -- How it fits their use cases
  technical_deep_dive JSONB, -- Detailed technical information (if requested)
  
  -- Comparison Context
  comparison_advantages JSONB DEFAULT '[]', -- Advantages vs alternatives
  comparison_tradeoffs JSONB DEFAULT '[]', -- Tradeoffs vs alternatives
  alternative_suggestions JSONB DEFAULT '[]', -- Alternative options
  
  -- User Interaction Tracking
  presentation_format VARCHAR(50), -- how it was shown to user
  user_engagement_time INTEGER, -- how long user looked at it
  user_action VARCHAR(50), -- clicked, saved, dismissed, etc.
  
  -- AI Model Context
  model_version VARCHAR(50),
  generated_with_context JSONB, -- Context used for generation
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

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
  -- Get current expertise level
  SELECT expertise_level INTO current_level
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  -- Analyze interaction complexity
  SELECT array_agg((interaction->>'complexity')::INTEGER)
  INTO complexity_signals
  FROM jsonb_array_elements(p_interaction_data) AS interaction
  WHERE interaction->>'complexity' IS NOT NULL;
  
  IF array_length(complexity_signals, 1) > 0 THEN
    SELECT AVG(unnest) INTO avg_complexity FROM unnest(complexity_signals);
    
    -- Update expertise level based on complexity patterns
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
$$ LANGUAGE plpgsql;

-- Function to generate dynamic UI configuration
CREATE OR REPLACE FUNCTION generate_adaptive_ui_config(
  p_user_id UUID,
  p_context JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  user_profile RECORD;
  ui_config JSONB;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  -- Generate base configuration
  ui_config := jsonb_build_object(
    'expertise_level', COALESCE(user_profile.expertise_level, 'auto_detect'),
    'show_advanced_filters', 
      CASE 
        WHEN user_profile.expertise_level = 'expert' THEN true
        WHEN user_profile.expertise_level = 'intermediate' THEN true
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
        WHEN user_profile.spec_detail_preference >= 7 THEN true
        ELSE false
      END
  );
  
  RETURN ui_config;
END;
$$ LANGUAGE plpgsql;

-- Indexes for dynamic queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_expertise ON user_profiles(user_id, expertise_level);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_active ON conversation_sessions(user_id, created_at DESC) 
  WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_session ON ai_conversation_logs(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_dynamic_recommendations_user_score ON dynamic_recommendations(user_id, overall_score DESC);

-- Vector indexes for AI embeddings
CREATE INDEX IF NOT EXISTS idx_user_profiles_preference_embedding 
  ON user_profiles USING ivfflat (preference_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_embedding 
  ON conversation_sessions USING ivfflat (session_embedding vector_cosine_ops) WITH (lists = 100);

-- RLS Policies for new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_ui_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_recommendations ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
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