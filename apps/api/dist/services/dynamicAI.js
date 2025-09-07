"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("../utils/logger"));
const supabaseClient_1 = require("../db/supabaseClient");
const mlRecommender_1 = __importDefault(require("./mlRecommender"));
class DynamicAIService {
    constructor() {
        this.conversations = new Map();
        this.cache = new Map();
        this.cacheTtlMs = 2 * 60 * 1000; // 2 minutes
        const key = process.env.OPENAI_API_KEY;
        if (key) {
            this.openai = new openai_1.default({ apiKey: key });
            logger_1.default.info('DynamicAI service initialized');
        }
        else {
            logger_1.default.warn('DynamicAI initializing without OPENAI_API_KEY; will attempt lazy init at runtime');
        }
        this.modelPrimary = process.env.MODEL_GPT || 'gpt-4o';
        this.modelFallback = process.env.MODEL_GPT_FALLBACK || 'gpt-4o-mini';
    }
    ensureOpenAI() {
        if (!this.openai) {
            const key = process.env.OPENAI_API_KEY;
            if (!key) {
                throw new Error('OpenAI API key is required');
            }
            this.openai = new openai_1.default({ apiKey: key });
        }
    }
    getFromCache(key) {
        const hit = this.cache.get(key);
        if (!hit)
            return null;
        if (Date.now() - hit.ts > this.cacheTtlMs) {
            this.cache.delete(key);
            return null;
        }
        return hit.data;
    }
    putInCache(key, data) {
        if (this.cache.size > 100) { // simple LRU trim
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, { data, ts: Date.now() });
    }
    isSmallTalk(input) {
        const s = input.trim().toLowerCase();
        const phrases = [
            'hi', 'hello', 'hey', 'how are you', 'what\'s up', 'thanks', 'thank you', 'ok', 'okay', 'cool', 'bye', 'goodbye'
        ];
        return phrases.some(p => s === p || s.includes(p));
    }
    async processConversation(userId, userInput, sessionId, context) {
        try {
            const currentSessionId = sessionId || (0, node_crypto_1.randomUUID)();
            let conversationState = this.conversations.get(currentSessionId) || {
                phase: 'initial',
                turnCount: 0,
                collectedData: {},
            };
            console.log('🤖 Processing dynamic conversation...');
            // Cache gate (cheap semantic key: input + coarse context)
            const cacheKey = JSON.stringify({ userInput, phase: conversationState.phase, collected: conversationState.collectedData });
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { ...cached, sessionId: currentSessionId };
            }
            // Handle smalltalk without forcing recommendations
            if (this.isSmallTalk(userInput)) {
                const friendly = `Happy to help whenever you are ready. Tell me your budget or pick a purpose to begin.`;
                return {
                    response: friendly,
                    sessionId: currentSessionId,
                    dynamicUI: [
                        { type: 'button', id: 'gaming', label: '🎮 Gaming Laptop', action: 'select_gaming', priority: 1 },
                        { type: 'button', id: 'student', label: '🎓 Student Laptop', action: 'select_student', priority: 2 },
                        { type: 'button', id: 'work', label: '💼 Work Laptop', action: 'select_work', priority: 3 }
                    ]
                };
            }
            // **EXTRACT DATA AGGRESSIVELY** from every user input
            const extractedData = this.extractDataFromInput(userInput, conversationState.collectedData);
            if (Object.keys(extractedData).length > 0) {
                conversationState.collectedData = { ...conversationState.collectedData, ...extractedData };
                console.log('📝 Extracted data from input:', extractedData);
            }
            // Get current gadgets from database to inform AI
            const { data: gadgets } = await supabaseClient_1.supabase
                .from('gadgets')
                .select('*')
                .limit(10);
            // Create AI prompt for dynamic interface generation
            const systemPrompt = this.buildDynamicSystemPrompt(conversationState, gadgets || []);
            this.ensureOpenAI();
            let modelUsed = this.modelPrimary;
            let response;
            try {
                response = await this.openai.chat.completions.create({
                    model: this.modelPrimary,
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
            }
            catch (primaryErr) {
                // Automatic fallback to modelFallback only for model issues
                const msg = (primaryErr?.message || '').toLowerCase();
                const code = primaryErr?.status || primaryErr?.code || '';
                if (msg.includes('model') || String(code).includes('404')) {
                    modelUsed = this.modelFallback;
                    response = await this.openai.chat.completions.create({
                        model: this.modelFallback,
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
                                    properties: {},
                                }
                            }
                        ],
                        function_call: { name: 'generate_dynamic_interface' }
                    });
                }
                else {
                    throw primaryErr;
                }
            }
            console.log('✅ OpenAI function call successful');
            const functionCall = response.choices[0]?.message?.function_call;
            if (!functionCall || !functionCall.arguments) {
                throw new Error('No function call response from AI');
            }
            const aiResponse = JSON.parse(functionCall.arguments);
            // Guided discovery & graceful summary before recommending
            const userAskedNow = /recommend|show (me )?(options|laptops|results)/i.test(userInput);
            const hasSignals = !!(conversationState.collectedData.budget || conversationState.collectedData.purpose || conversationState.collectedData.brands);
            if ((conversationState.turnCount >= 2 || (aiResponse.phase !== 'recommendation' && hasSignals)) && !this.isSmallTalk(userInput)) {
                const sumBudget = conversationState.collectedData.budget ? `$${conversationState.collectedData.budget.min} - $${conversationState.collectedData.budget.max}` : 'any';
                const sumBrands = (conversationState.collectedData.brands || []).join(', ') || 'any';
                const sumPurpose = (conversationState.collectedData.purpose || []).join(', ') || 'general';
                const summaryText = `Just to confirm: budget ${sumBudget}, brands ${sumBrands}, purpose ${sumPurpose}. Does that look right?`;
                aiResponse.phase = 'discovery';
                aiResponse.response_text = summaryText;
                aiResponse.ui_elements = [
                    { type: 'button', id: 'confirm_filters', label: '✅ Yes, looks right', action: 'confirm_filters', priority: 1 },
                    { type: 'button', id: 'adjust_budget', label: '💰 Adjust Budget', action: 'adjust_budget', priority: 2 },
                    { type: 'button', id: 'adjust_brands', label: '🏷️ Adjust Brands', action: 'adjust_brands', priority: 3 }
                ];
            }
            // Update conversation state
            conversationState.phase = aiResponse.phase;
            conversationState.turnCount += 1;
            if (aiResponse.collected_data) {
                conversationState.collectedData = { ...conversationState.collectedData, ...aiResponse.collected_data };
            }
            this.conversations.set(currentSessionId, conversationState);
            // Generate recommendations if we have enough data and confirmed or explicitly asked
            let recommendations = [];
            const userConfirmed = /^(yes|yep|yeah|correct|confirm|looks right)/i.test(userInput.trim());
            const haveSignals = !!(conversationState.collectedData.budget || conversationState.collectedData.purpose || conversationState.collectedData.brands);
            const confirmed = userAskedNow || userConfirmed || (haveSignals && conversationState.turnCount >= 2);
            if (confirmed) {
                const df = aiResponse.database_filter || {
                    price_min: conversationState.collectedData.budget?.min || 300,
                    price_max: conversationState.collectedData.budget?.max || 3000,
                    brands: conversationState.collectedData.brands || [],
                    specs_filter: { purpose: conversationState.collectedData.purpose?.[0] || 'general' }
                };
                const sanitized = await this.sanitizeFilters(df);
                const candCount = await this.countCandidates(sanitized);
                if (candCount > 50) {
                    return {
                        response: `I found many options. Would you like to narrow by budget or brand?`,
                        sessionId: currentSessionId,
                        dynamicUI: [
                            { type: 'button', id: 'narrow_budget', label: '💰 Narrow Budget', action: 'adjust_budget', priority: 1 },
                            { type: 'button', id: 'narrow_brand', label: '🏷️ Choose a Brand', action: 'adjust_brands', priority: 2 }
                        ]
                    };
                }
                recommendations = await this.queryAndRecommend(sanitized, conversationState.collectedData, userId);
            }
            // Compose investor-friendly, guided response with reasons if we have recs
            const composedText = recommendations && recommendations.length > 0
                ? this.composeRecommendationResponse(conversationState, recommendations)
                : aiResponse.response_text;
            // Always provide standard quick actions alongside model UI for smooth next steps
            const standardCtas = [
                { type: 'quickaction', id: 'show_more', label: 'Show More Options', priority: 1 },
                { type: 'button', id: 'refine', label: 'Refine Search', action: 'refine', priority: 2 },
                { type: 'button', id: 'compare_top3', label: 'Compare Top 3', action: 'compare_top3', priority: 3 },
                { type: 'button', id: 'adjust_budget', label: '💰 Adjust Budget', action: 'adjust_budget', priority: 4 },
                { type: 'button', id: 'adjust_brands', label: '🏷️ Adjust Brands', action: 'adjust_brands', priority: 5 }
            ];
            const payload = {
                response: composedText,
                sessionId: currentSessionId,
                dynamicUI: [...(aiResponse.ui_elements || []), ...standardCtas],
                recommendations,
                databaseQuery: aiResponse.database_filter,
                modelUsed
            };
            this.putInCache(cacheKey, payload);
            return payload;
        }
        catch (error) {
            console.error('❌ Dynamic AI processing failed:', error);
            logger_1.default.error('Dynamic AI conversation processing failed:', error);
            // Enhanced fallback response with proper dynamic UI
            const fallbackUI = this.generateFallbackUI(userInput);
            return {
                response: "I'm here to help you find the perfect laptop! Let's start with what you're looking for.",
                sessionId: sessionId || (0, node_crypto_1.randomUUID)(),
                dynamicUI: fallbackUI
            };
        }
    }
    async sanitizeFilters(filters) {
        const out = { ...filters };
        const min = typeof out.price_min === 'number' ? out.price_min : 300;
        const max = typeof out.price_max === 'number' ? out.price_max : 3000;
        out.price_min = Math.max(100, Math.min(min, max - 50));
        out.price_max = Math.max(out.price_min + 50, Math.min(max, 10000));
        if (Array.isArray(out.brands)) {
            out.brands = Array.from(new Set(out.brands.map((b) => (b || '').trim()))).filter(Boolean);
        }
        // Validate candidate count and relax if zero
        let count = await this.countCandidates(out);
        if (count === 0) {
            out.price_min = Math.floor(out.price_min * 0.75);
            out.price_max = Math.ceil(out.price_max * 1.25);
            count = await this.countCandidates(out);
        }
        if (count === 0 && Array.isArray(out.brands) && out.brands.length > 0) {
            delete out.brands;
        }
        return out;
    }
    async countCandidates(filters) {
        try {
            let q = supabaseClient_1.supabase.from('gadgets').select('id', { count: 'exact', head: true });
            if (typeof filters.price_min === 'number')
                q = q.gte('price', filters.price_min);
            if (typeof filters.price_max === 'number')
                q = q.lte('price', filters.price_max);
            if (Array.isArray(filters.brands) && filters.brands.length > 0)
                q = q.in('brand', filters.brands);
            const { count } = await q;
            return count || 0;
        }
        catch {
            return 0;
        }
    }
    extractDataFromInput(userInput, existingData) {
        const extracted = {};
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
                }
                else if (input.includes('over') || input.includes('above') || input.includes('min')) {
                    extracted.budget = { min: num, max: 3000 };
                }
                else {
                    extracted.budget = { min: num - 200, max: num + 200 };
                }
            }
        }
        return extracted;
    }
    buildDynamicSystemPrompt(state, availableGadgets) {
        return `You are GadgetGuru AI, a dynamic laptop recommendation system. Your PRIMARY GOAL is to reach concrete recommendations within 2-3 exchanges.

**CRITICAL CONVERGENCE RULES:**
- After 2 exchanges, you MUST move to 'recommendation' phase
- Always progress toward database filtering and final recommendations
- Never generate endless discovery UI - CONVERGE TO RESULTS

**COMMUNICATION STYLE (MANDATORY):**
- Be concise, confident, and helpful.
- For recommendations: provide a one-sentence summary and TWO short bullet reasons per item (value/fit/spec trade-off). No rambling.
- End with a clear next-step question (e.g., “Want me to compare the top 3 or tighten budget?”).

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
 - Ensure button labels are short and action-oriented

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
    async queryAndRecommend(filters, userData, userId) {
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
            const mlRecommendations = await mlRecommender_1.default.getRecommendations(userQuery, userId || 'anonymous', (0, node_crypto_1.randomUUID)());
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
        }
        catch (error) {
            console.error('❌ ML recommendation failed:', error);
            return [];
        }
    }
    extractPurposeFromFilters(filters, userData) {
        const purposes = [];
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
    buildQueryText(userData) {
        const parts = [];
        if (userData.purpose)
            parts.push(userData.purpose.join(' '));
        if (userData.priorities)
            parts.push(userData.priorities.join(' '));
        return parts.join(' ') || 'general laptop';
    }
    buildReasoningText(scored) {
        const reasons = Array.isArray(scored.reasonings) ? [...scored.reasonings] : [];
        // Add value insights
        if (scored.valueScore > 0.8) {
            reasons.unshift('🎯 Exceptional value for money');
        }
        else if (scored.valueScore < 0.4) {
            reasons.push('⚠️ Consider if price matches your needs');
        }
        // Add recency insights
        if (scored.recencyScore > 0.8) {
            reasons.unshift('🆕 Latest technology');
        }
        else if (scored.recencyScore < 0.4) {
            reasons.push('📅 Older model - verify it meets current standards');
        }
        // Keep it tight
        return reasons.filter(Boolean).slice(0, 3).join('. ');
    }
    composeRecommendationResponse(state, recs) {
        const budget = state.collectedData.budget ? `$${state.collectedData.budget.min}–$${state.collectedData.budget.max}` : 'your range';
        const purpose = (state.collectedData.purpose || ['your needs']).join(', ');
        const brands = (state.collectedData.brands || []).join(', ');
        const header = `Great — based on ${purpose}${brands ? ` and brands (${brands})` : ''} in budget ${budget}, here are strong picks:`;
        const top = recs.slice(0, 2).map((r, i) => {
            const price = r?.laptop?.price ? `$${r.laptop.price}` : 'Price TBA';
            const name = `${r?.laptop?.name || 'Option'} (${r?.laptop?.brand || '—'})`;
            // Derive two crisp bullets from highlights/reasoning
            const bullets = [];
            if (Array.isArray(r.highlights) && r.highlights.length > 0)
                bullets.push(r.highlights[0]);
            if (Array.isArray(r.highlights) && r.highlights.length > 1)
                bullets.push(r.highlights[1]);
            if (bullets.length < 2 && r.reasoning) {
                const parts = String(r.reasoning).split(/\.|\u2022|\n/).map(s => s.trim()).filter(Boolean);
                for (const p of parts) {
                    if (bullets.length >= 2)
                        break;
                    if (!bullets.find(b => b.toLowerCase() === p.toLowerCase()))
                        bullets.push(p);
                }
            }
            const b1 = bullets[0] ? `- ${bullets[0]}` : '';
            const b2 = bullets[1] ? `\n  - ${bullets[1]}` : '';
            return `${i + 1}. ${name} — ${price}\n  ${b1}${b2}`.trim();
        }).join('\n');
        const footer = `\nWant me to compare the top 3, tighten the budget, or try a different brand?`;
        return [header, top, footer].filter(Boolean).join('\n\n');
    }
    async getAdaptiveUIConfig(userId, context = {}) {
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
    async generateAdaptiveRecommendationsForUser(userId, preferences = {}, context = {}) {
        try {
            const userQuery = {
                purpose: Array.isArray(preferences.use_cases) ? preferences.use_cases : (typeof preferences.use_cases === 'string' ? [preferences.use_cases] : []),
                budget: {
                    min: preferences.budget_range?.[0] ?? 300,
                    max: preferences.budget_range?.[1] ?? 3000
                },
                brands: Array.isArray(preferences.preferred_brands) ? preferences.preferred_brands : [],
                specs: preferences.specs || {},
                priorities: preferences.priorities || [],
                text: context.query_text || ''
            };
            const recs = await mlRecommender_1.default.getRecommendations(userQuery, userId || 'anonymous', (0, node_crypto_1.randomUUID)());
            return recs.map(r => ({
                laptop: r.laptop,
                rank: r.score > 0.85 ? 1 : r.score > 0.7 ? 2 : 3,
                score: r.score,
                reasoning: r.reasonings?.join('. ') || '',
                highlights: r.highlights,
                warnings: r.warnings,
                valueScore: r.valueScore,
                similarityScore: r.similarityScore,
                recencyScore: r.recencyScore
            }));
        }
        catch (e) {
            logger_1.default.error('generateAdaptiveRecommendationsForUser failed:', e);
            return [];
        }
    }
    generateFallbackUI(userInput) {
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
exports.default = new DynamicAIService();
