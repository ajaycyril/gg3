import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import logger from '../utils/logger';
import { supabase } from '../db/supabaseClient';

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

    console.log('🔑 DynamicAI constructor - OpenAI API Key:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
    console.log('🔑 DynamicAI constructor - Key length:', process.env.OPENAI_API_KEY.length);

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
        collectedData: {},
      };

      console.log('🤖 Processing dynamic conversation...');

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
                      options: { type: 'array' },
                      action: { type: 'string' },
                      priority: { type: 'number' }
                    }
                  }
                },
                collected_data: {
                  type: 'object',
                  properties: {
                    budget: { type: 'object' },
                    purpose: { type: 'array' },
                    brands: { type: 'array' },
                    specs: { type: 'object' },
                    priorities: { type: 'array' }
                  }
                },
                database_filter: {
                  type: 'object',
                  properties: {
                    price_min: { type: 'number' },
                    price_max: { type: 'number' },
                    brands: { type: 'array' },
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
      
      // Update conversation state
      conversationState.phase = aiResponse.phase;
      if (aiResponse.collected_data) {
        conversationState.collectedData = { ...conversationState.collectedData, ...aiResponse.collected_data };
      }
      this.conversations.set(currentSessionId, conversationState);

      // Generate recommendations if we have enough data
      let recommendations: any[] = [];
      if (aiResponse.phase === 'recommendation' && aiResponse.database_filter) {
        recommendations = await this.queryAndRecommend(aiResponse.database_filter, conversationState.collectedData);
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
      
      // Fallback response
      return {
        response: "I'm here to help you find the perfect laptop! What are you looking for?",
        sessionId: sessionId || randomUUID(),
        dynamicUI: [
          { type: 'button', id: 'gaming', label: 'Gaming Laptop', action: 'select_gaming', priority: 1 },
          { type: 'button', id: 'work', label: 'Work Laptop', action: 'select_work', priority: 2 },
          { type: 'button', id: 'student', label: 'Student Laptop', action: 'select_student', priority: 3 }
        ]
      };
    }
  }

  private buildDynamicSystemPrompt(state: ConversationState, availableGadgets: any[]): string {
    return `You are GadgetGuru AI, a dynamic laptop recommendation system. Your job is to:

1. **Generate dynamic UI elements** based on user input and conversation phase
2. **Collect user preferences systematically** 
3. **Create database filters** to find matching laptops
4. **Provide final recommendations** from actual database results

**Current Conversation State:**
- Phase: ${state.phase}
- Collected Data: ${JSON.stringify(state.collectedData)}

**Available Gadgets in Database:**
${availableGadgets.slice(0, 5).map(g => `- ${g.name} (${g.brand}) - $${g.price}`).join('\n')}

**Dynamic UI Generation Rules:**
- **Initial Phase**: Show purpose buttons (Gaming, Work, Creative, Student)
- **Discovery Phase**: Generate budget sliders, brand multiselect, feature toggles
- **Filtering Phase**: Show refined options based on collected data
- **Recommendation Phase**: Present final recommendations with reasoning

**UI Element Types:**
- \`button\`: Quick selection (Gaming, Work, etc.)
- \`slider\`: Budget range, performance levels
- \`multiselect\`: Brands, features, use cases
- \`quickaction\`: "Show me options", "Filter by this", "More details"

**Database Filtering:**
Based on collected data, create filters for:
- Price range (price_min, price_max)
- Brand preferences (brands array)
- Specs matching (specs_filter object)

**Key Principles:**
- Always generate 3-5 UI elements per response
- Move conversation forward toward concrete recommendations
- Use actual database data for final suggestions
- Keep responses concise and actionable

Generate your response using the function call format.`;
  }

  private async queryAndRecommend(filters: any, userData: any): Promise<any[]> {
    try {
      console.log('🔍 Querying database with filters:', filters);

      let query = supabase
        .from('gadgets')
        .select('*');

      // Apply dynamic filters
      if (filters.price_min) {
        query = query.gte('price', filters.price_min);
      }
      if (filters.price_max) {
        query = query.lte('price', filters.price_max);
      }
      if (filters.brands && filters.brands.length > 0) {
        query = query.in('brand', filters.brands);
      }

      const { data: matchedGadgets, error } = await query.limit(5);

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      console.log('📊 Found matched gadgets:', matchedGadgets?.length || 0);

      // Use AI to rank and explain recommendations
      if (matchedGadgets && matchedGadgets.length > 0) {
        const rankingPrompt = `Based on user preferences: ${JSON.stringify(userData)}

Available laptops:
${matchedGadgets.map(g => `- ${g.name} (${g.brand}) - $${g.price} - Specs: ${JSON.stringify(g.specs)}`).join('\n')}

Rank these laptops (1-3 top picks) and provide reasoning for each. Format as JSON array with:
{
  "laptop": [laptop object],
  "rank": 1-3,
  "score": 0.0-1.0,
  "reasoning": "Why this is a good match",
  "highlights": ["key feature 1", "key feature 2"]
}`;

        const rankingResponse = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a laptop ranking expert. Return only valid JSON.' },
            { role: 'user', content: rankingPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });

        const rankingText = rankingResponse.choices[0]?.message?.content || '[]';
        try {
          const rankings = JSON.parse(rankingText);
          console.log('✅ AI rankings generated:', rankings.length);
          return rankings;
        } catch {
          // Fallback to simple list if AI response isn't valid JSON
          return matchedGadgets.slice(0, 3).map((gadget, index) => ({
            laptop: gadget,
            rank: index + 1,
            score: 0.8 - (index * 0.1),
            reasoning: `Good match for your requirements`,
            highlights: ['Performance', 'Value', 'Reliability']
          }));
        }
      }

      return [];
    } catch (error) {
      console.error('❌ Query and recommend failed:', error);
      return [];
    }
  }
}

export default new DynamicAIService();
