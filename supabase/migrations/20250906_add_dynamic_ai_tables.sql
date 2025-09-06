-- Add missing tables for dynamic AI system
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expertise_level TEXT DEFAULT 'intermediate' CHECK (expertise_level IN ('beginner', 'intermediate', 'expert')),
    interface_complexity_preference INTEGER DEFAULT 5 CHECK (interface_complexity_preference >= 1 AND interface_complexity_preference <= 10),
    preferred_interaction_style TEXT DEFAULT 'conversational' CHECK (preferred_interaction_style IN ('conversational', 'technical', 'casual')),
    learned_preferences JSONB DEFAULT '{}',
    technical_interests JSONB DEFAULT '{}',
    spec_detail_preference INTEGER DEFAULT 5 CHECK (spec_detail_preference >= 1 AND spec_detail_preference <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Allow anonymous users with 'anonymous' as user_id
    session_goal TEXT,
    current_phase TEXT DEFAULT 'discovery',
    complexity_level INTEGER DEFAULT 5,
    conversation_context JSONB DEFAULT '{}',
    user_preferences_extracted JSONB DEFAULT '{}',
    session_embedding VECTOR(1536), -- For OpenAI text-embedding-3-large
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_turns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    complexity_level INTEGER DEFAULT 5,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ui_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    configuration JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON public.conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_session_id ON public.conversation_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_ui_configurations_user_id ON public.ui_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);

-- Enable RLS (Row Level Security) for all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous and authenticated users
CREATE POLICY "Users can manage their own profiles" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON public.conversation_sessions
    FOR ALL USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));

CREATE POLICY "Users can manage their own conversation turns" ON public.conversation_turns
    FOR ALL USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));

CREATE POLICY "Users can manage their own UI configurations" ON public.ui_configurations
    FOR ALL USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));

CREATE POLICY "Users can manage their own interactions" ON public.user_interactions
    FOR ALL USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));