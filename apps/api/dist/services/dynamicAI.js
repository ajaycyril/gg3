"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("../utils/logger"));
class DynamicAIService {
    constructor() {
        this.MODEL_GPT4 = 'gpt-4o';
        this.MODEL_GPT35 = 'gpt-3.5-turbo';
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is required');
        }
        // Debug: Log the exact key being used (safely truncated)
        console.log('🔑 DynamicAI constructor - OpenAI API Key:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
        console.log('🔑 DynamicAI constructor - Key length:', process.env.OPENAI_API_KEY.length);
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
        logger_1.default.info('DynamicAI service initialized');
    }
    async processConversation(userId, userInput, sessionId, context) {
        try {
            // Debug: Log the OpenAI API call details
            console.log('🤖 Making OpenAI API call for chat...');
            console.log('🔑 Using OpenAI client with key:', this.openai.apiKey?.substring(0, 20) + '...');
            // Generate AI response using OpenAI directly
            const systemPrompt = this.buildSystemPrompt();
            const response = await this.openai.chat.completions.create({
                model: this.MODEL_GPT35,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userInput }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });
            console.log('✅ OpenAI API call successful for chat');
            const aiResponse = response.choices[0]?.message?.content ||
                'I understand you\'re looking for laptop recommendations. Could you tell me more about what you need?';
            return {
                response: aiResponse,
                sessionId: sessionId || (0, node_crypto_1.randomUUID)(),
                suggestedActions: this.generateSuggestedActions(userInput),
                uiConfiguration: this.getDefaultUIConfig(),
                recommendations: []
            };
        }
        catch (error) {
            console.error('❌ OpenAI API call failed for chat:', error);
            logger_1.default.error('AI conversation processing failed:', error);
            throw error;
        }
    }
    async getAdaptiveUIConfig(userId, context = {}) {
        return this.getDefaultUIConfig();
    }
    async generateAdaptiveRecommendationsForUser(userId, preferences = {}, context = {}) {
        try {
            // Generate recommendations based on preferences using OpenAI
            const prompt = this.buildRecommendationPrompt(preferences);
            const response = await this.openai.chat.completions.create({
                model: this.MODEL_GPT35,
                messages: [
                    { role: 'system', content: 'You are a laptop recommendation expert. Provide specific laptop recommendations based on user preferences.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 800
            });
            const recommendationText = response.choices[0]?.message?.content || '';
            // For now, return a structured response based on the AI recommendation
            return [{
                    laptop_id: (0, node_crypto_1.randomUUID)(),
                    overall_score: 0.85,
                    ai_reasoning: recommendationText,
                    reasoning_complexity_level: 5,
                    personalized_highlights: ['Performance', 'Value', 'Build Quality'],
                    budget_fit_explanation: 'Within your specified budget range',
                    use_case_alignment: { primary_use_case: 'general', alignment_score: 0.8 }
                }];
        }
        catch (error) {
            logger_1.default.error('Recommendation generation failed:', error);
            return [];
        }
    }
    buildSystemPrompt() {
        return `You are GadgetGuru AI, an expert laptop recommendation assistant.

Your role:
- Help users find the perfect laptop based on their needs
- Ask clarifying questions to understand requirements
- Provide clear, helpful recommendations
- Explain technical concepts in accessible language

Guidelines:
- Be conversational and helpful
- Focus on practical benefits over technical jargon
- Ask follow-up questions when you need more information
- Provide specific, actionable advice`;
    }
    buildRecommendationPrompt(preferences) {
        const budget = preferences.budget_range || 'Not specified';
        const useCase = preferences.use_cases || ['general use'];
        const brands = preferences.brand_preferences || [];
        return `Please recommend laptops based on these preferences:
    
Budget: ${Array.isArray(budget) ? `$${budget[0]} - $${budget[1]}` : budget}
Use Cases: ${Array.isArray(useCase) ? useCase.join(', ') : useCase}
Preferred Brands: ${Array.isArray(brands) ? brands.join(', ') : brands || 'Any'}

Provide 2-3 specific laptop recommendations with reasoning for each choice.`;
    }
    generateSuggestedActions(userInput) {
        const actions = [
            { type: 'question', text: 'What\'s your budget range?', priority: 1 },
            { type: 'question', text: 'What will you use it for?', priority: 2 },
            { type: 'action', text: 'Show me gaming laptops', priority: 3 },
            { type: 'action', text: 'Show me business laptops', priority: 4 }
        ];
        return actions.slice(0, 3);
    }
    getDefaultUIConfig() {
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
}
exports.default = new DynamicAIService();
