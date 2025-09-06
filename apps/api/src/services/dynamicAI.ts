// Dynamic AI Service for Adaptive User Interfaces
// OpenAI-powered conversation and UI adaptation engine

import OpenAI from 'openai';
import logger from '../utils/logger';
import { db } from '../db/supabaseClient';

interface UserProfile {
  expertise_level: string;
  interface_complexity_preference: number;
  preferred_interaction_style: string;
  learned_preferences: Record<string, any>;
  technical_interests: Record<string, any>;
  spec_detail_preference: number;
}

interface ConversationSession {
  id: string;
  user_id: string;
  session_goal: string;
  current_phase: string;
  complexity_level: number;
  conversation_context: Record<string, any>;
  user_preferences_extracted: Record<string, any>;
}

interface AdaptiveRecommendation {
  laptop_id: string;
  overall_score: number;
  ai_reasoning: string;
  reasoning_complexity_level: number;
  personalized_highlights: any[];
  budget_fit_explanation: string;
  use_case_alignment: Record<string, any>;
}

class DynamicAIService {
  private openai: OpenAI;
  private readonly MODEL_GPT4 = 'gpt-4-turbo-preview';
  private readonly MODEL_GPT35 = 'gpt-3.5-turbo';
  private readonly EMBEDDING_MODEL = 'text-embedding-3-large';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Dynamic conversation management with adaptive complexity
  async processConversation(
    userId: string,
    userInput: string,
    sessionId?: string
  ): Promise<{
    response: string;
    sessionId: string;
    suggestedActions: any[];
    uiConfiguration: Record<string, any>;
    recommendations?: AdaptiveRecommendation[];
  }> {
    try {
      // Get or create user profile
      const userProfile = await this.getUserProfile(userId);
      
      // Get or create conversation session
      const session = sessionId 
        ? await this.getConversationSession(sessionId)
        : await this.createConversationSession(userId, userInput);

      // Determine conversation complexity based on user input and profile
      const complexity = await this.determineConversationComplexity(userInput, userProfile, session);
      
      // Generate AI response with adaptive complexity
      const aiResponse = await this.generateAdaptiveResponse(
        userInput,
        userProfile,
        session,
        complexity
      );

      // Update conversation session
      await this.updateConversationSession(session.id, {
        conversation_context: {
          ...session.conversation_context,
          turns: [...(session.conversation_context.turns || []), {
            user: userInput,
            ai: aiResponse.response,
            timestamp: new Date().toISOString(),
            complexity: complexity
          }]
        },
        complexity_level: complexity,
        user_preferences_extracted: {
          ...session.user_preferences_extracted,
          ...aiResponse.extractedPreferences
        }
      });

      // Generate dynamic UI configuration
      const uiConfiguration = await this.generateDynamicUI(userProfile, session, aiResponse.context);

      // Generate recommendations if appropriate
      let recommendations: AdaptiveRecommendation[] = [];
      if (aiResponse.shouldGenerateRecommendations) {
        recommendations = await this.generateAdaptiveRecommendations(
          userProfile,
          session,
          aiResponse.extractedPreferences
        );
      }

      // Log conversation for learning
      await this.logConversationTurn(session.id, userId, userInput, aiResponse.response, complexity);

      return {
        response: aiResponse.response,
        sessionId: session.id,
        suggestedActions: aiResponse.suggestedActions || [],
        uiConfiguration,
        recommendations
      };

    } catch (error) {
      logger.error('Dynamic AI conversation processing failed:', error);
      throw error;
    }
  }

  // Adaptive UI configuration generation
  async generateDynamicUI(
    userProfile: UserProfile,
    session: ConversationSession,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      const prompt = this.buildUIConfigPrompt(userProfile, session, context);
      
      const response = await this.openai.chat.completions.create({
        model: this.MODEL_GPT35, // Faster for UI config
        messages: [
          {
            role: 'system',
            content: 'You are a UI/UX expert that generates adaptive interface configurations based on user expertise and preferences. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const uiConfig = JSON.parse(response.choices[0].message.content || '{}');
      
      // Save UI configuration to database
      await this.saveUIConfiguration(userProfile.user_id, uiConfig);
      
      return uiConfig;

    } catch (error) {
      logger.error('Dynamic UI generation failed:', error);
      // Return safe fallback configuration
      return this.getFallbackUIConfig(userProfile);
    }
  }

  // Determine conversation complexity dynamically
  private async determineConversationComplexity(
    userInput: string,
    userProfile: UserProfile,
    session: ConversationSession
  ): Promise<number> {
    try {
      const prompt = `Analyze this user input for technical complexity level (1-10 scale):
      
User Input: "${userInput}"
User Expertise Level: ${userProfile.expertise_level}
Previous Complexity Preference: ${userProfile.interface_complexity_preference}
Current Session Phase: ${session.current_phase}

Technical indicators to consider:
- Mentions of specific technical terms (CPU models, RAM specifications, benchmark scores)
- Questions about component details vs general recommendations
- Comparison requests with technical details
- Budget vs performance optimization discussions

Return only a single number from 1-10 where:
1-3: Basic/Simple (general recommendations, budget focus)
4-6: Intermediate (some technical details, feature comparisons)
7-10: Advanced/Expert (detailed specifications, benchmark analysis)`;

      const response = await this.openai.chat.completions.create({
        model: this.MODEL_GPT35,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 10
      });

      const complexity = parseInt(response.choices[0].message.content?.trim() || '5');
      return Math.max(1, Math.min(10, complexity));

    } catch (error) {
      logger.error('Complexity determination failed:', error);
      return userProfile.interface_complexity_preference || 5;
    }
  }

  // Generate adaptive AI response
  private async generateAdaptiveResponse(
    userInput: string,
    userProfile: UserProfile,
    session: ConversationSession,
    complexity: number
  ): Promise<{
    response: string;
    extractedPreferences: Record<string, any>;
    shouldGenerateRecommendations: boolean;
    context: Record<string, any>;
    suggestedActions: any[];
  }> {
    try {
      const systemPrompt = this.buildAdaptiveSystemPrompt(userProfile, session, complexity);
      const userPrompt = this.buildUserPrompt(userInput, session);

      const response = await this.openai.chat.completions.create({
        model: complexity >= 7 ? this.MODEL_GPT4 : this.MODEL_GPT35,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: complexity >= 7 ? 2000 : 1200,
        functions: [
          {
            name: 'extract_user_preferences',
            description: 'Extract user preferences from conversation',
            parameters: {
              type: 'object',
              properties: {
                budget_range: { type: 'string' },
                use_cases: { type: 'array', items: { type: 'string' } },
                brand_preferences: { type: 'array', items: { type: 'string' } },
                technical_requirements: { type: 'object' },
                should_generate_recommendations: { type: 'boolean' }
              }
            }
          }
        ],
        function_call: 'auto'
      });

      const aiResponse = response.choices[0].message.content || '';
      let extractedPreferences = {};
      let shouldGenerateRecommendations = false;

      // Handle function calls for preference extraction
      if (response.choices[0].message.function_call) {
        const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments || '{}');
        extractedPreferences = functionArgs;
        shouldGenerateRecommendations = functionArgs.should_generate_recommendations || false;
      }

      // Generate suggested actions based on complexity and context
      const suggestedActions = await this.generateSuggestedActions(
        userInput,
        session,
        complexity,
        extractedPreferences
      );

      return {
        response: aiResponse,
        extractedPreferences,
        shouldGenerateRecommendations,
        context: { complexity, phase: session.current_phase },
        suggestedActions
      };

    } catch (error) {
      logger.error('Adaptive response generation failed:', error);
      throw error;
    }
  }

  // Generate adaptive laptop recommendations
  private async generateAdaptiveRecommendations(
    userProfile: UserProfile,
    session: ConversationSession,
    extractedPreferences: Record<string, any>
  ): Promise<AdaptiveRecommendation[]> {
    try {
      // Get relevant laptops based on preferences
      const laptops = await this.findRelevantLaptops(extractedPreferences, session);
      
      const recommendations: AdaptiveRecommendation[] = [];

      for (const laptop of laptops.slice(0, 5)) { // Top 5 recommendations
        const reasoning = await this.generateLaptopReasoning(
          laptop,
          userProfile,
          extractedPreferences,
          session.complexity_level
        );

        const recommendation: AdaptiveRecommendation = {
          laptop_id: laptop.id,
          overall_score: this.calculateAdaptiveScore(laptop, extractedPreferences),
          ai_reasoning: reasoning.explanation,
          reasoning_complexity_level: session.complexity_level,
          personalized_highlights: reasoning.highlights,
          budget_fit_explanation: reasoning.budgetFit,
          use_case_alignment: reasoning.useCaseAlignment
        };

        recommendations.push(recommendation);

        // Save recommendation to database
        await this.saveDynamicRecommendation(session.user_id, session.id, recommendation);
      }

      return recommendations;

    } catch (error) {
      logger.error('Adaptive recommendations generation failed:', error);
      return [];
    }
  }

  // Build adaptive system prompt based on user profile and complexity
  private buildAdaptiveSystemPrompt(
    userProfile: UserProfile,
    session: ConversationSession,
    complexity: number
  ): string {
    const basePrompt = `You are GadgetGuru AI, an expert laptop recommendation assistant. 

User Profile:
- Expertise Level: ${userProfile.expertise_level}
- Preferred Interaction Style: ${userProfile.preferred_interaction_style}
- Technical Interest Level: ${userProfile.spec_detail_preference}/10
- Current Session Goal: ${session.session_goal || 'find_laptop'}

Conversation Complexity Level: ${complexity}/10

Instructions based on complexity level:`;

    if (complexity <= 3) {
      return basePrompt + `
- Keep explanations simple and jargon-free
- Focus on use cases and benefits rather than technical specs
- Use analogies and everyday language
- Emphasize value and practical considerations
- Ask simple, non-technical questions to understand needs`;
    } else if (complexity <= 6) {
      return basePrompt + `
- Provide moderate technical detail when relevant
- Explain technical terms when first introduced
- Balance features with practical benefits
- Include some performance comparisons
- Ask clarifying questions about specific use cases`;
    } else {
      return basePrompt + `
- Provide detailed technical specifications and analysis
- Use proper technical terminology
- Include benchmark comparisons and performance metrics
- Discuss component-level details when relevant
- Address advanced considerations like upgradability, thermals, etc.`;
    }
  }

  // Dynamic UI configuration building
  private buildUIConfigPrompt(
    userProfile: UserProfile,
    session: ConversationSession,
    context: Record<string, any>
  ): string {
    return `Generate a dynamic UI configuration JSON for this user:

User Profile:
- Expertise: ${userProfile.expertise_level}
- Complexity Preference: ${userProfile.interface_complexity_preference}/10
- Interaction Style: ${userProfile.preferred_interaction_style}
- Technical Interests: ${JSON.stringify(userProfile.technical_interests)}

Current Context:
- Session Phase: ${session.current_phase}
- Conversation Complexity: ${context.complexity}/10

Generate JSON with these properties:
{
  "layout": {
    "view_mode": "grid|list|cards",
    "density": "compact|normal|spacious",
    "sidebar_visible": boolean
  },
  "filters": {
    "visible_filters": ["price", "brand", "specs", ...],
    "advanced_filters_visible": boolean,
    "filter_complexity": "simple|intermediate|advanced"
  },
  "content": {
    "spec_detail_level": "basic|detailed|expert",
    "show_benchmarks": boolean,
    "show_technical_details": boolean,
    "comparison_mode": "simple|detailed|technical"
  },
  "recommendations": {
    "explanation_depth": "brief|moderate|detailed",
    "show_alternatives": boolean,
    "highlight_technical": boolean
  },
  "interaction": {
    "chat_complexity": "conversational|technical|expert",
    "suggested_questions_complexity": 1-10,
    "enable_deep_dive_mode": boolean
  }
}`;
  }

  // Helper methods for database operations
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await db.executeSecureQuery(
      'user_profiles',
      'select',
      (query) => query.eq('user_id', userId).single(),
      { userId }
    );

    if (error && error.code !== 'PGRST116') { // Not found error
      logger.error('Failed to get user profile:', error);
    }

    return data || {
      user_id: userId,
      expertise_level: 'auto_detect',
      interface_complexity_preference: 5,
      preferred_interaction_style: 'conversational',
      learned_preferences: {},
      technical_interests: {},
      spec_detail_preference: 5
    };
  }

  private async createConversationSession(userId: string, initialInput: string): Promise<ConversationSession> {
    const sessionId = crypto.randomUUID();
    
    const sessionData = {
      id: sessionId,
      user_id: userId,
      session_goal: await this.detectSessionGoal(initialInput),
      current_phase: 'discovery',
      complexity_level: 5,
      conversation_context: {
        initial_input: initialInput,
        turns: []
      },
      user_preferences_extracted: {},
      session_embedding: await this.generateEmbedding(initialInput)
    };

    const { error } = await db.executeSecureQuery(
      'conversation_sessions',
      'insert',
      (query) => query.insert([sessionData]),
      { userId },
      true
    );

    if (error) {
      logger.error('Failed to create conversation session:', error);
      throw error;
    }

    return sessionData;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      return new Array(1024).fill(0); // Fallback zero embedding
    }
  }

  private async detectSessionGoal(input: string): Promise<string> {
    // Simple keyword-based detection (can be enhanced with AI)
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('compare') || lowerInput.includes('vs') || lowerInput.includes('versus')) {
      return 'compare_options';
    } else if (lowerInput.includes('best') || lowerInput.includes('recommend')) {
      return 'find_laptop';
    } else if (lowerInput.includes('spec') || lowerInput.includes('benchmark') || lowerInput.includes('performance')) {
      return 'deep_dive_specs';
    }
    
    return 'find_laptop';
  }

  // ...existing code...
}

export const dynamicAI = new DynamicAIService();