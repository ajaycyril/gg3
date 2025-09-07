import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import logger from '../utils/logger';
import { supabase } from '../db/supabaseClient';
import mlRecommender from './mlRecommender';

interface DynamicUIElement {
  type: 'button' | 'slider' | 'multiselect' | 'text' | 'quickaction';
  id: string;
  label: string;
  options?: string[] | { min: number; max: number; step: number };
  action?: string;
  priority: number;
}

interface ConversationState {
  phase: 'initial' | 'discovery' | 'filtering' | 'recommendation' | 'refinement';
  turnCount: number;
  collectedData: {
    budget?: { min: number; max: number };
    purpose?: string[];
    brands?: string[];
    specs?: Record<string, any>;
    priorities?: string[];
  };
  nextQuery?: {
    sql: string;
    params: any[];
  };
}

class DynamicAIService {
  private openai: OpenAI;
  private readonly MODEL_GPT4 = 'gpt-4o';
  private conversations: Map<string, ConversationState> = new Map();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('DynamicAI service initialized');
  }

  async processConversation(
    userId: string,
    userInput: string,
    sessionId?: string,
    context?: Record<string, any>
  ): Promise<{
    response: string;
    sessionId: string;
    dynamicUI: DynamicUIElement[];
    recommendations?: any[];
    databaseQuery?: any;
  }> {
    try {
      const currentSessionId = sessionId || randomUUID();
      let conversationState = this.conversations.get(currentSessionId) || {
        phase: 'initial',
        turnCount: 0,
        collectedData: {},
      };

      console.log('🤖 Processing dynamic conversation...');

      // **EXTRACT DATA AGGRESSIVELY** from every user input
      const extractedData = this.extractDataFromInput(userInput, conversationState.collectedData);
      if (Object.keys(extractedData).length > 0) {
        conversationState.collectedData = { ...conversationState.collectedData, ...extractedData };
        console.log('📝 Extracted data from input:', extractedData);
      }

      // Get current gadgets from database to inform AI
      const { data: gadgets } = await supabase
        .from('gadgets')
        .select('*')
        .limit(10);

      // Create AI prompt for dynamic interface generation
      const systemPrompt = this.buildDynamicSystemPrompt(conversationState, gadgets || []);
      
      const response = await this.openai.chat.completions.create({
        model: this.MODEL_GPT4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        functions: [
          {
            name: 'generate_dynamic_interface',
            description: 'Generate dynamic UI elements and database queries based on user input',
            parameters: {
              type: 'object',
              properties: {
                response_text: { type: 'string', description: 'AI response to user' },
                phase: { type: 'string', enum: ['initial', 'discovery', 'filtering', 'recommendation', 'refinement'] },
                ui_elements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['button', 'slider', 'multiselect', 'quickaction'] },
                      id: { type: 'string' },
                      label: { type: 'string' },
                      options: { 
                        oneOf: [
                          {
                            type: 'array',
                            items: { type: 'string' }
                          },
                          {
                            type: 'object',
                            properties: {
                              min: { type: 'number' },
                              max: { type: 'number' },
                              step: { type: 'number' }
                            }
                          }
                        ]
                      },
                      action: { type: 'string' },
                      priority: { type: 'number' }
                    },
                    required: ['type', 'id', 'label', 'priority']
                  }
                },
                collected_data: {
                  type: 'object',
                  properties: {
                    budget: { 
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' }
                      }
                    },
                    purpose: { 
                      type: 'array',
                      items: { type: 'string' }
                    },
                    brands: { 
                      type: 'array',
                      items: { type: 'string' }
                    },
                    specs: { type: 'object' },
                    priorities: { 
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                database_filter: {
                  type: 'object',
                  properties: {
                    price_min: { type: 'number' },
                    price_max: { type: 'number' },
                    brands: { 
                      type: 'array',
                      items: { type: 'string' }
                    },
                    specs_filter: { type: 'object' }
                  }
                }
              },
              required: ['response_text', 'phase', 'ui_elements']
            }
          }
        ],
        function_call: { name: 'generate_dynamic_interface' }
      });

      console.log('✅ OpenAI function call successful');

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || !functionCall.arguments) {
        throw new Error('No function call response from AI');
      }

      const aiResponse = JSON.parse(functionCall.arguments);
      
      // **FORCE CONVERGENCE** - Prevent infinite discovery loops
      if (conversationState.turnCount >= 2 || 
          (aiResponse.phase !== 'recommendation' && Object.keys(conversationState.collectedData).length > 0)) {
        
        console.log('🚨 FORCING CONVERGENCE TO RECOMMENDATIONS');
        
        // Override AI response to force recommendations
        aiResponse.phase = 'recommendation';
        aiResponse.database_filter = {
          price_min: conversationState.collectedData.budget?.min || 300,
          price_max: conversationState.collectedData.budget?.max || 3000,
          brands: conversationState.collectedData.brands || [],
          specs_filter: { 
            purpose: conversationState.collectedData.purpose?.[0] || 'general'
          }
        };
        
        aiResponse.response_text = "Perfect! I have enough information. Here are my top laptop recommendations for you:";
        aiResponse.ui_elements = [
          { type: 'quickaction', id: 'show_more', label: 'Show More Options', priority: 1 },
          { type: 'button', id: 'new_search', label: 'Start New Search', priority: 2 }
        ];
      }

      // Update conversation state
      conversationState.phase = aiResponse.phase;
      conversationState.turnCount += 1;
      if (aiResponse.collected_data) {
        conversationState.collectedData = { ...conversationState.collectedData, ...aiResponse.collected_data };
      }
      this.conversations.set(currentSessionId, conversationState);

      // Generate recommendations if we have enough data
      let recommendations: any[] = [];
      if (aiResponse.phase === 'recommendation' && aiResponse.database_filter) {
        recommendations = await this.queryAndRecommend(
          aiResponse.database_filter,
          conversationState.collectedData,
          userId
        );
      }

      return {
        response: aiResponse.response_text,
        sessionId: currentSessionId,
        dynamicUI: aiResponse.ui_elements || [],
        recommendations,
        databaseQuery: aiResponse.database_filter
      };

    } catch (error) {
      console.error('❌ Dynamic AI processing failed:', error);
      logger.error('Dynamic AI conversation processing failed:', error);
      
      // Enhanced fallback response with proper dynamic UI
      const fallbackUI = this.generateFallbackUI(userInput);
      
      return {
        response: "I'm here to help you find the perfect laptop! Let's start with what you're looking for.",
        sessionId: sessionId || randomUUID(),
        dynamicUI: fallbackUI
      };
    }
  }

  private extractDataFromInput(userInput: string, existingData: any): any {
    const extracted: any = {};
    const input = userInput.toLowerCase();

    // Extract purpose from input
    if (input.includes('gaming') && !existingData.purpose?.includes('gaming')) {
      extracted.purpose = ['gaming'];
      extracted.budget = { min: 800, max: 2500 };
    }
    
    if (input.includes('work') || input.includes('business') || input.includes('productivity')) {
      extracted.purpose = ['work'];
      extracted.budget = { min: 500, max: 1800 };
    }
    
    if (input.includes('student') || input.includes('school') || input.includes('college')) {
      extracted.purpose = ['student'];
      extracted.budget = { min: 300, max: 1200 };
    }
    
    if (input.includes('creative') || input.includes('design') || input.includes('video') || input.includes('photo')) {
      extracted.purpose = ['creative'];
      extracted.budget = { min: 1000, max: 3000 };
    }

    // Extract brands
    const brands = ['apple', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi', 'alienware', 'surface'];
    const foundBrands = brands.filter(brand => input.includes(brand));
    if (foundBrands.length > 0) {
      extracted.brands = foundBrands.map(b => b.charAt(0).toUpperCase() + b.slice(1));
    }

    // Extract budget from numbers in input
    const numbers = input.match(/\d+/g);
    if (numbers && numbers.length >= 1) {
      const num = parseInt(numbers[0]);
      if (num > 100 && num < 5000) { // Reasonable laptop price range
        if (input.includes('under') || input.includes('below') || input.includes('max')) {
          extracted.budget = { min: 300, max: num };
        } else if (input.includes('over') || input.includes('above') || input.includes('min')) {
          extracted.budget = { min: num, max: 3000 };
        } else {
          extracted.budget = { min: num - 200, max: num + 200 };
        }
      }
    }

    return extracted;
  }

  private buildDynamicSystemPrompt(state: ConversationState, availableGadgets: any[]): string {
    return `You are GadgetGuru AI, a dynamic laptop recommendation system. Your PRIMARY GOAL is to reach concrete recommendations within 2-3 exchanges.

**CRITICAL CONVERGENCE RULES:**
- After 2 exchanges, you MUST move to 'recommendation' phase
- Always progress toward database filtering and final recommendations
- Never generate endless discovery UI - CONVERGE TO RESULTS

**Current Conversation State:**
- Phase: ${state.phase}
- Collected Data: ${JSON.stringify(state.collectedData)}
- Turn Count: ${state.turnCount}

**Available Gadgets in Database:**
${availableGadgets.slice(0, 5).map(g => `- ${g.name} (${g.brand}) - $${g.price}`).join('\n')}

**PHASE PROGRESSION (MANDATORY):**
1. **Initial**: Show 3-4 purpose buttons (Gaming, Work, Creative, Student)
2. **Discovery**: Show budget slider OR brand multiselect (ONE interaction only)  
3. **Recommendation**: ALWAYS set phase to 'recommendation' and create database_filter

**CONVERGENCE LOGIC:**
- If user selected gaming -> Set phase to 'recommendation', create database_filter with gaming preferences
- If user selected work -> Set phase to 'recommendation', create database_filter with productivity preferences  
- If user selected budget -> Set phase to 'recommendation', create database_filter with price range
- If ANY meaningful data collected -> MOVE TO RECOMMENDATION PHASE

**Database Filter Creation (REQUIRED for recommendations):**
- Always include price_min and price_max (default: 300-3000 if not specified)
- Include relevant brands based on use case
- Set specs_filter based on purpose

**UI Generation Rules:**
- Maximum 2 discovery exchanges, then FORCE recommendations
- Generate minimal UI that leads to quick decisions
- Always include a "Show Recommendations" button after any selection

**Example Response Pattern:**
{
  "response_text": "Perfect! Based on your gaming needs, here are my top recommendations:",
  "phase": "recommendation",
  "ui_elements": [
    {"type": "quickaction", "id": "show_more", "label": "Show More Options", "priority": 1},
    {"type": "button", "id": "refine", "label": "Refine Search", "priority": 2}
  ],
  "database_filter": {
    "price_min": 800,
    "price_max": 2500,
    "brands": ["ASUS", "MSI", "Alienware"],
    "specs_filter": {"gpu": "gaming"}
  }
}

ALWAYS PROGRESS TO RECOMMENDATIONS - DO NOT LOOP IN DISCOVERY!`;
  }

  private async queryAndRecommend(filters: any, userData: any, userId: string): Promise<any[]> {
    try {
      console.log('🔍 Using ML Recommender with filters:', filters);

      // Convert filters to UserQuery format for ML recommender
      const userQuery = {
        purpose: this.extractPurposeFromFilters(filters, userData),
        budget: {
          min: filters.price_min || 300,
          max: filters.price_max || 3000
        },
        brands: filters.brands || [],
        specs: filters.specs_filter || {},
        priorities: userData.priorities || [],
        text: this.buildQueryText(userData)
      };

      // Use ML recommender instead of basic database query
      const mlRecommendations = await mlRecommender.getRecommendations(
        userQuery,
        userId || 'anonymous',
        randomUUID()
      );

      console.log('✅ ML recommendations received:', mlRecommendations.length);

      // Convert ML results to expected format
      return mlRecommendations.map(scored => ({
        laptop: scored.laptop,
        rank: scored.score > 0.8 ? 1 : scored.score > 0.6 ? 2 : 3,
        score: scored.score,
        reasoning: this.buildReasoningText(scored),
        highlights: scored.highlights,
        warnings: scored.warnings,
        valueScore: scored.valueScore,
        similarityScore: scored.similarityScore,
        recencyScore: scored.recencyScore
      }));

    } catch (error) {
      console.error('❌ ML recommendation failed:', error);
      return [];
    }
  }

  private extractPurposeFromFilters(filters: any, userData: any): string[] {
    const purposes: string[] = [];
    
    // Extract from specs filter
    if (filters.specs_filter?.purpose) {
      purposes.push(filters.specs_filter.purpose);
    }
    
    // Extract from collected data
    if (userData.purpose) {
      purposes.push(...userData.purpose);
    }
    
    // Extract from GPU requirements (indicates gaming)
    if (filters.specs_filter?.gpu === 'gaming') {
      purposes.push('gaming');
    }
    
    return purposes;
  }

  private buildQueryText(userData: any): string {
    const parts = [];
    
    if (userData.purpose) parts.push(userData.purpose.join(' '));
    if (userData.priorities) parts.push(userData.priorities.join(' '));
    
    return parts.join(' ') || 'general laptop';
  }

  private buildReasoningText(scored: any): string {
    const reasons = [...scored.reasonings];
    
    // Add value insights
    if (scored.valueScore > 0.8) {
      reasons.unshift('🎯 Exceptional value for money');
    } else if (scored.valueScore < 0.4) {
      reasons.push('⚠️ Consider if price matches your needs');
    }
    
    // Add recency insights
    if (scored.recencyScore > 0.8) {
      reasons.unshift('🆕 Latest technology');
    } else if (scored.recencyScore < 0.4) {
      reasons.push('📅 Older model - verify it meets current standards');
    }
    
    return reasons.join('. ');
  }

  async getAdaptiveUIConfig(userId: string, context: Record<string, any> = {}): Promise<Record<string, any>> {
    return {
      layout: {
        view_mode: 'cards',
        density: 'normal',
        sidebar_visible: true
      },
      filters: {
        visible_filters: ['price', 'brand', 'use_case'],
        advanced_filters_visible: false,
        filter_complexity: 'simple'
      },
      content: {
        spec_detail_level: 'basic',
        show_benchmarks: false,
        show_technical_details: false,
        comparison_mode: 'simple'
      },
      recommendations: {
        explanation_depth: 'moderate',
        show_alternatives: true,
        highlight_technical: false
      },
      interaction: {
        chat_complexity: 'conversational',
        suggested_questions_complexity: 5,
        enable_deep_dive_mode: false
      }
    };
  }

  async generateAdaptiveRecommendationsForUser(
    userId: string,
    preferences: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<any[]> {
    return [];
  }

  private generateFallbackUI(userInput: string): DynamicUIElement[] {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('gaming')) {
      return [
        { type: 'button', id: 'budget_high', label: '💰 High-End Gaming ($1500+)', action: 'select_high_budget', priority: 1 },
        { type: 'button', id: 'budget_mid', label: '⚖️ Mid-Range Gaming ($800-$1500)', action: 'select_mid_budget', priority: 2 },
        { type: 'button', id: 'budget_entry', label: '🎯 Entry Gaming ($500-$800)', action: 'select_entry_budget', priority: 3 },
      ];
    }
    
    if (lowerInput.includes('work') || lowerInput.includes('business')) {
      return [
        { type: 'button', id: 'portable', label: '🎒 Ultra Portable', action: 'select_portable', priority: 1 },
        { type: 'button', id: 'performance', label: '💪 High Performance', action: 'select_performance', priority: 2 },
        { type: 'button', id: 'budget_work', label: '💼 Budget Business', action: 'select_budget_work', priority: 3 },
      ];
    }
    
    // Default initial UI
    return [
      { type: 'button', id: 'gaming', label: '🎮 Gaming Laptop', action: 'select_gaming', priority: 1 },
      { type: 'button', id: 'work', label: '💼 Work Laptop', action: 'select_work', priority: 2 },
      { type: 'button', id: 'student', label: '🎓 Student Laptop', action: 'select_student', priority: 3 },
      { type: 'button', id: 'creative', label: '🎨 Creative Work', action: 'select_creative', priority: 4 },
    ];
  }
}

export default new DynamicAIService();
