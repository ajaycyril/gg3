"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("../db/supabaseClient");
const logger_1 = __importDefault(require("../utils/logger"));
class MLRecommenderService {
    constructor() {
        this.feedbackHistory = new Map();
        this.userPreferenceWeights = new Map();
        // Core feature weights (learned and adapted over time)
        this.featureWeights = {
            performance: 0.28,
            value: 0.27,
            brand: 0.12,
            specs: 0.18,
            recency: 0.08,
            budget: 0.07
        };
    }
    /**
     * Main recommendation engine - uses ML-based similarity matching
     */
    async getRecommendations(userQuery, userId, sessionId) {
        try {
            console.log('🤖 ML Recommender processing query:', userQuery);
            // Query candidates with dynamic constraints (no regex/name heuristics)
            const candidates = await this.queryCandidates(userQuery);
            const actualLaptops = candidates; // Category constraints applied in query
            console.log(`📊 Processing ${actualLaptops.length} candidates for ML scoring`);
            // 2. Score each laptop using ML algorithm
            const scoredLaptops = actualLaptops.map(laptop => this.calculateLaptopScore(laptop, userQuery, userId));
            // 3. Sort by overall score (value + similarity + recency) and diversify brands
            const prelim = scoredLaptops.sort((a, b) => b.score - a.score);
            const brandCap = {};
            const rankedLaptops = [];
            for (const s of prelim) {
                const brand = (s.laptop.brand || '').trim();
                brandCap[brand] = brandCap[brand] || 0;
                if (brandCap[brand] >= 2)
                    continue; // limit over-concentration
                rankedLaptops.push(s);
                brandCap[brand] += 1;
                if (rankedLaptops.length >= 5)
                    break;
            }
            // 4. Apply value-for-money filter (eliminate overpriced last-gen)
            const valueOptimized = this.filterByValueForMoney(rankedLaptops);
            // 5. Learn from this interaction
            await this.recordInteraction(userId, sessionId, userQuery, valueOptimized);
            console.log('✅ ML recommendations generated:', valueOptimized.length);
            return valueOptimized;
        }
        catch (error) {
            console.error('❌ ML Recommender error:', error);
            logger_1.default.error('ML recommendation failed:', error);
            return [];
        }
    }
    /**
     * Enhanced laptop-only query with multiple fallback strategies
     */
    async queryCandidates(userQuery) {
        try {
            // Map purposes to supported categories (future‑proof expansion)
            const purposeToCategories = {
                gaming: ['laptop'],
                work: ['laptop'],
                student: ['laptop'],
                creative: ['laptop']
            };
            const targetCategories = Array.from(new Set((userQuery.purpose || []).flatMap(p => purposeToCategories[p.toLowerCase()] || [])));
            // Optional: vector similarity prefilter (if pgvector RPC exists)
            try {
                const queryText = [
                    ...(userQuery.purpose || []),
                    ...(userQuery.priorities || []),
                    userQuery.text || ''
                ].join(' ').trim() || 'laptop';
                const { data: vec, error: vecErr } = await supabaseClient_1.supabaseAdmin.rpc('match_gadgets', {
                    query_text: queryText,
                    match_count: 100,
                    price_min: userQuery.budget.min,
                    price_max: userQuery.budget.max,
                    brand_filter: (userQuery.brands || []).join(',') || null
                });
                if (!vecErr && Array.isArray(vec) && vec.length > 0) {
                    return vec;
                }
            }
            catch (e) {
                logger_1.default.debug('Vector prefilter unavailable, using metadata fallback');
            }
            // Primary: filter by category when provided
            let query = supabaseClient_1.supabase
                .from('gadgets')
                .select('*')
                .gte('price', Math.max(100, userQuery.budget.min))
                .lte('price', Math.max(userQuery.budget.min + 50, userQuery.budget.max));
            if (targetCategories.length > 0) {
                // Category is indexed; prefer it over name heuristics
                // If only one category, use eq; else use in
                if (targetCategories.length === 1) {
                    query = query.eq('category', targetCategories[0]);
                }
                else {
                    query = query.in('category', targetCategories);
                }
            }
            if (userQuery.brands && userQuery.brands.length > 0) {
                query = query.in('brand', Array.from(new Set(userQuery.brands)));
            }
            const { data: byCategory, error } = await query;
            if (error) {
                console.error('Database error in queryLaptopsOnly:', error);
                return [];
            }
            // If no category set in DB yet, gracefully fall back by returning price‑bounded results
            return byCategory || [];
        }
        catch (error) {
            console.error('❌ Error in queryLaptopsOnly:', error);
            return [];
        }
    }
    /**
     * Core ML scoring algorithm - combines multiple factors
     */
    calculateLaptopScore(laptop, query, userId) {
        const reasonings = [];
        const highlights = [];
        const warnings = [];
        // 1. SIMILARITY SCORE - How well laptop matches user input
        const similarityScore = this.calculateSimilarityScore(laptop, query, reasonings);
        // 2. VALUE SCORE - Price-to-performance ratio
        const valueScore = this.calculateValueScore(laptop, reasonings, warnings);
        // 3. RECENCY SCORE - Favor newer models, penalize old tech
        const recencyScore = this.calculateRecencyScore(laptop, reasonings, warnings);
        // 4. USER PREFERENCE SCORE - Learn from past behavior
        const userPrefScore = this.getUserPreferenceScore(laptop, userId);
        // 5. BRAND REPUTATION SCORE
        const brandScore = this.calculateBrandScore(laptop, query);
        // 6. BUDGET FIT SCORE - closeness to user's stated budget
        const budgetScore = this.calculateBudgetFitScore(laptop, query);
        // Combine scores with adaptive weights
        const userWeights = this.userPreferenceWeights.get(userId) || this.featureWeights;
        const finalScore = (similarityScore * userWeights.specs +
            valueScore * userWeights.value +
            recencyScore * userWeights.recency +
            userPrefScore * userWeights.performance +
            brandScore * userWeights.brand +
            budgetScore * userWeights.budget);
        // Generate highlights based on top scoring factors
        if (similarityScore > 0.8)
            highlights.push('Perfect match for your needs');
        if (valueScore > 0.8)
            highlights.push('Excellent value for money');
        if (recencyScore > 0.8)
            highlights.push('Latest generation technology');
        return {
            laptop,
            score: finalScore,
            valueScore,
            similarityScore,
            recencyScore,
            reasonings,
            highlights,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
    /**
     * Similarity scoring using semantic matching
     */
    calculateSimilarityScore(laptop, query, reasonings) {
        let score = 0;
        let factors = 0;
        // Purpose matching with semantic understanding
        if (query.purpose.length > 0) {
            const purposeScore = this.matchPurpose(laptop, query.purpose);
            score += purposeScore;
            factors++;
            if (purposeScore > 0.7) {
                reasonings.push(`Excellent match for ${query.purpose.join(', ')}`);
            }
        }
        // Specs matching with intelligent interpretation
        if (laptop.specs) {
            const specsScore = this.matchSpecs(laptop.specs, query, reasonings);
            score += specsScore;
            factors++;
        }
        // Brand preference
        if (query.brands && query.brands.length > 0) {
            const brandMatch = query.brands.some(b => laptop.brand.toLowerCase().includes(b.toLowerCase()));
            if (brandMatch) {
                score += 0.9;
                reasonings.push(`Matches your preferred brand: ${laptop.brand}`);
            }
            else {
                score += 0.3; // Neutral for non-preferred brands
            }
            factors++;
        }
        // Parse explicit RAM or storage hints from query.text
        if (query.text) {
            const lower = query.text.toLowerCase();
            const ramMatch = lower.match(/(\d{2})\s*gb\s*ram/);
            if (ramMatch && laptop.specs?.ram) {
                const need = parseInt(ramMatch[1]);
                const have = parseInt(String(laptop.specs.ram).replace(/[^0-9]/g, ''));
                if (!isNaN(need) && !isNaN(have)) {
                    score += have >= need ? 0.8 : 0.2;
                    factors++;
                    if (have >= need)
                        reasonings.push(`Meets RAM requirement (${have}GB)`);
                }
            }
        }
        return factors > 0 ? score / factors : 0.5;
    }
    /**
     * Value-for-money scoring with market analysis
     */
    calculateValueScore(laptop, reasonings, warnings) {
        const price = laptop.price;
        const specs = laptop.specs || {};
        // Calculate performance score based on specs
        let performanceScore = 0;
        // CPU scoring
        if (specs.processor) {
            performanceScore += this.scoreCPU(specs.processor);
        }
        // RAM scoring
        if (specs.ram) {
            performanceScore += this.scoreRAM(specs.ram);
        }
        // Storage scoring
        if (specs.storage) {
            performanceScore += this.scoreStorage(specs.storage);
        }
        // GPU scoring
        if (specs.graphics) {
            performanceScore += this.scoreGPU(specs.graphics);
        }
        // Normalize performance score
        performanceScore = Math.min(performanceScore / 4, 1);
        // Calculate value ratio (performance per dollar)
        const expectedPrice = performanceScore * 2200; // slightly steeper curve
        const valueRatio = expectedPrice / price;
        let valueScore = Math.min(valueRatio, 2) / 2; // Cap at 2x value
        // Value analysis
        if (valueRatio > 1.3) {
            reasonings.push(`Excellent value - ${Math.round((valueRatio - 1) * 100)}% better price-to-performance than average`);
        }
        else if (valueRatio < 0.7) {
            warnings.push(`Overpriced - ${Math.round((1 - valueRatio) * 100)}% above market rate for these specs`);
            valueScore *= 0.6; // Penalty for overpricing
        }
        return Math.max(valueScore, 0.1); // Minimum score
    }
    calculateBudgetFitScore(laptop, query) {
        if (!laptop.price || !query.budget)
            return 0.5;
        const mid = (query.budget.min + query.budget.max) / 2;
        const diff = Math.abs(laptop.price - mid) / Math.max(200, mid);
        // Higher when close to center of user's range (with tolerance)
        return Math.max(0.1, 1 - diff);
    }
    /**
     * Recency scoring - penalize old technology
     */
    calculateRecencyScore(laptop, reasonings, warnings) {
        const currentYear = new Date().getFullYear();
        const releaseYear = this.extractReleaseYear(laptop);
        if (!releaseYear)
            return 0.5; // Neutral if unknown
        const ageYears = currentYear - releaseYear;
        let recencyScore = 1;
        if (ageYears <= 1) {
            recencyScore = 1.0;
            reasonings.push('Latest generation technology');
        }
        else if (ageYears <= 2) {
            recencyScore = 0.8;
            reasonings.push('Recent model with modern features');
        }
        else if (ageYears <= 3) {
            recencyScore = 0.6;
            reasonings.push('Established model, still current');
        }
        else {
            recencyScore = Math.max(0.2, 1 - (ageYears - 3) * 0.2);
            warnings.push(`${ageYears}-year-old technology - consider newer alternatives`);
        }
        return recencyScore;
    }
    /**
     * Purpose matching with semantic understanding
     */
    matchPurpose(laptop, purposes) {
        let totalScore = 0;
        for (const purpose of purposes) {
            let purposeScore = 0;
            switch (purpose.toLowerCase()) {
                case 'gaming':
                    purposeScore = this.scoreForGaming(laptop);
                    break;
                case 'work':
                case 'business':
                case 'productivity':
                    purposeScore = this.scoreForWork(laptop);
                    break;
                case 'creative':
                case 'design':
                    purposeScore = this.scoreForCreative(laptop);
                    break;
                case 'student':
                case 'school':
                    purposeScore = this.scoreForStudent(laptop);
                    break;
                default:
                    purposeScore = 0.5; // Neutral for unknown purpose
            }
            totalScore += purposeScore;
        }
        return purposes.length > 0 ? totalScore / purposes.length : 0.5;
    }
    /**
     * Gaming laptop scoring
     */
    scoreForGaming(laptop) {
        const specs = laptop.specs || {};
        let score = 0;
        // GPU is critical for gaming
        if (specs.graphics) {
            const gpuScore = this.scoreGPU(specs.graphics);
            score += gpuScore * 0.5; // 50% weight on GPU
        }
        // RAM importance
        if (specs.ram) {
            const ramGB = this.extractRAMSize(specs.ram);
            if (ramGB >= 16)
                score += 0.3;
            else if (ramGB >= 8)
                score += 0.2;
            else
                score += 0.1;
        }
        // CPU for gaming
        if (specs.processor) {
            score += this.scoreCPU(specs.processor) * 0.2;
        }
        return Math.min(score, 1);
    }
    /**
     * Work laptop scoring
     */
    scoreForWork(laptop) {
        const specs = laptop.specs || {};
        let score = 0;
        // CPU important for productivity
        if (specs.processor) {
            score += this.scoreCPU(specs.processor) * 0.3;
        }
        // RAM for multitasking
        if (specs.ram) {
            const ramGB = this.extractRAMSize(specs.ram);
            if (ramGB >= 16)
                score += 0.3;
            else if (ramGB >= 8)
                score += 0.2;
            else
                score += 0.1;
        }
        // Storage speed
        if (specs.storage && specs.storage.toLowerCase().includes('ssd')) {
            score += 0.2;
        }
        // Battery life and portability (infer from weight/size)
        score += 0.2; // Base portability score
        return Math.min(score, 1);
    }
    /**
     * Creative work laptop scoring
     */
    scoreForCreative(laptop) {
        const specs = laptop.specs || {};
        let score = 0;
        // Both CPU and GPU important
        if (specs.processor) {
            score += this.scoreCPU(specs.processor) * 0.3;
        }
        if (specs.graphics) {
            score += this.scoreGPU(specs.graphics) * 0.3;
        }
        // High RAM requirement
        if (specs.ram) {
            const ramGB = this.extractRAMSize(specs.ram);
            if (ramGB >= 32)
                score += 0.3;
            else if (ramGB >= 16)
                score += 0.2;
            else
                score += 0.1;
        }
        // Fast storage
        if (specs.storage && specs.storage.toLowerCase().includes('ssd')) {
            score += 0.1;
        }
        return Math.min(score, 1);
    }
    /**
     * Student laptop scoring - focus on value and basics
     */
    scoreForStudent(laptop) {
        const specs = laptop.specs || {};
        let score = 0;
        // Basic performance needs
        if (specs.processor) {
            score += Math.min(this.scoreCPU(specs.processor), 0.7) * 0.3;
        }
        // Adequate RAM
        if (specs.ram) {
            const ramGB = this.extractRAMSize(specs.ram);
            if (ramGB >= 8)
                score += 0.3;
            else if (ramGB >= 4)
                score += 0.2;
            else
                score += 0.1;
        }
        // Value for money is key
        const price = laptop.price;
        if (price < 800)
            score += 0.4; // Bonus for budget-friendly
        else if (price < 1200)
            score += 0.3;
        else
            score += 0.1;
        return Math.min(score, 1);
    }
    /**
     * Component scoring methods
     */
    scoreCPU(processor) {
        const cpu = processor.toLowerCase();
        // Intel scoring
        if (cpu.includes('i9'))
            return 1.0;
        if (cpu.includes('i7'))
            return 0.9;
        if (cpu.includes('i5'))
            return 0.7;
        if (cpu.includes('i3'))
            return 0.5;
        // AMD scoring
        if (cpu.includes('ryzen 9'))
            return 1.0;
        if (cpu.includes('ryzen 7'))
            return 0.9;
        if (cpu.includes('ryzen 5'))
            return 0.7;
        if (cpu.includes('ryzen 3'))
            return 0.5;
        // M-series Mac
        if (cpu.includes('m3'))
            return 1.0;
        if (cpu.includes('m2'))
            return 0.9;
        if (cpu.includes('m1'))
            return 0.8;
        return 0.3; // Default for unknown/older CPUs
    }
    scoreGPU(graphics) {
        const gpu = graphics.toLowerCase();
        // High-end gaming/professional
        if (gpu.includes('rtx 4090') || gpu.includes('rtx 4080'))
            return 1.0;
        if (gpu.includes('rtx 4070') || gpu.includes('rtx 3080'))
            return 0.9;
        if (gpu.includes('rtx 4060') || gpu.includes('rtx 3070'))
            return 0.8;
        if (gpu.includes('rtx 3060') || gpu.includes('gtx 1660'))
            return 0.7;
        // AMD
        if (gpu.includes('rx 7900') || gpu.includes('rx 6900'))
            return 0.9;
        if (gpu.includes('rx 6700') || gpu.includes('rx 6600'))
            return 0.7;
        // Integrated
        if (gpu.includes('integrated') || gpu.includes('intel iris'))
            return 0.3;
        return 0.4; // Default
    }
    scoreRAM(ram) {
        const ramSize = this.extractRAMSize(ram);
        if (ramSize >= 32)
            return 1.0;
        if (ramSize >= 16)
            return 0.8;
        if (ramSize >= 8)
            return 0.6;
        if (ramSize >= 4)
            return 0.4;
        return 0.2;
    }
    scoreStorage(storage) {
        const stor = storage.toLowerCase();
        if (stor.includes('1tb ssd') || stor.includes('2tb ssd'))
            return 1.0;
        if (stor.includes('512gb ssd'))
            return 0.8;
        if (stor.includes('256gb ssd'))
            return 0.6;
        if (stor.includes('ssd'))
            return 0.7;
        if (stor.includes('hdd'))
            return 0.3;
        return 0.5;
    }
    /**
     * Helper methods
     */
    extractRAMSize(ram) {
        const match = ram.match(/(\d+)\s*gb/i);
        return match ? parseInt(match[1]) : 4;
    }
    extractReleaseYear(laptop) {
        // Try to extract year from model name or specs
        const text = `${laptop.name} ${laptop.model || ''} ${JSON.stringify(laptop.specs || {})}`;
        const yearMatch = text.match(/20(\d{2})/);
        if (yearMatch) {
            const year = 2000 + parseInt(yearMatch[1]);
            if (year >= 2020 && year <= 2025)
                return year;
        }
        return null;
    }
    /**
     * User preference learning
     */
    getUserPreferenceScore(laptop, userId) {
        const userHistory = this.feedbackHistory.get(userId) || [];
        if (userHistory.length === 0)
            return 0.5;
        // Analyze user's past positive interactions
        const positiveInteractions = userHistory.filter(f => f.userAction === 'clicked' || f.userAction === 'purchased' || f.feedback === 'positive');
        if (positiveInteractions.length === 0)
            return 0.5;
        // Score based on similarity to previously liked laptops
        let similaritySum = 0;
        for (const interaction of positiveInteractions) {
            similaritySum += this.calculateLaptopSimilarity(laptop, interaction.recommendedLaptop);
        }
        return similaritySum / positiveInteractions.length;
    }
    calculateLaptopSimilarity(laptop1, laptop2) {
        let similarity = 0;
        let factors = 0;
        // Brand similarity
        if (laptop1.brand === laptop2.brand) {
            similarity += 0.3;
        }
        factors++;
        // Price range similarity
        const priceDiff = Math.abs(laptop1.price - laptop2.price) / Math.max(laptop1.price, laptop2.price);
        similarity += Math.max(0, 1 - priceDiff * 2) * 0.2;
        factors++;
        // Specs similarity (if available)
        if (laptop1.specs && laptop2.specs) {
            // This could be enhanced with more sophisticated spec comparison
            similarity += 0.5; // Placeholder
            factors++;
        }
        return factors > 0 ? similarity / factors : 0.5;
    }
    /**
     * Value-for-money filtering - eliminate overpriced last-gen laptops
     */
    filterByValueForMoney(laptops) {
        return laptops.filter(scored => {
            // Eliminate laptops with poor value scores and old tech
            if (scored.valueScore < 0.3 && scored.recencyScore < 0.4) {
                console.log(`🚫 Filtered out ${scored.laptop.name} - poor value + old tech`);
                return false;
            }
            // Eliminate severely overpriced items
            if (scored.valueScore < 0.2) {
                console.log(`🚫 Filtered out ${scored.laptop.name} - severely overpriced`);
                return false;
            }
            return true;
        });
    }
    /**
     * Learning and adaptation methods
     */
    async recordInteraction(userId, sessionId, query, recommendations) {
        try {
            // Persist top recommendation to recommendations table for analytics
            const top = recommendations[0];
            // Only persist if we have a valid UUID user id (matches schema)
            const uuidRegex = /^[0-9a-fA-F-]{36}$/;
            if (top && uuidRegex.test(userId)) {
                const { error } = await supabaseClient_1.supabaseAdmin
                    .from('recommendations')
                    .insert({
                    user_id: userId,
                    gadget_id: top.laptop?.id,
                    prompt: JSON.stringify({ sessionId, query }),
                    result: JSON.stringify({ recommendations: recommendations.slice(0, 5) })
                });
                if (error) {
                    console.warn('Failed to persist recommendation record:', error);
                }
            }
            // Always capture a non-PII event for learning/analytics
            const { error: evErr } = await supabaseClient_1.supabaseAdmin
                .from('recommendation_events')
                .insert({
                session_id: sessionId,
                user_id: uuidRegex.test(userId) ? userId : null,
                query: JSON.stringify(query),
                recommendations: JSON.stringify(recommendations.slice(0, 5))
            });
            if (evErr) {
                console.warn('Failed to record recommendation_event:', evErr);
            }
        }
        catch (e) {
            console.warn('recordInteraction persistence error:', e);
        }
        console.log(`📝 Recorded interaction for user ${userId}`);
    }
    async processFeedback(feedback) {
        const userHistory = this.feedbackHistory.get(feedback.userId) || [];
        userHistory.push(feedback);
        this.feedbackHistory.set(feedback.userId, userHistory);
        // Adapt user preference weights based on feedback
        await this.updateUserPreferenceWeights(feedback);
        console.log(`📊 Processed feedback for user ${feedback.userId}: ${feedback.userAction}`);
    }
    async updateUserPreferenceWeights(feedback) {
        const userId = feedback.userId;
        const currentWeights = this.userPreferenceWeights.get(userId) || { ...this.featureWeights };
        // Adjust weights based on feedback
        if (feedback.feedback === 'positive' || feedback.userAction === 'purchased') {
            // Increase weights for features that led to positive outcome
            // This is a simplified example - real ML would be more sophisticated
            if (feedback.query.purpose.includes('gaming')) {
                currentWeights.performance += 0.05;
                currentWeights.specs += 0.05;
            }
        }
        // Normalize weights
        const total = Object.values(currentWeights).reduce((a, b) => a + b, 0);
        for (const key in currentWeights) {
            currentWeights[key] /= total;
        }
        this.userPreferenceWeights.set(userId, currentWeights);
    }
    calculateBrandScore(laptop, query) {
        // Brand reputation scoring
        const brandReputation = {
            'apple': 0.9,
            'dell': 0.8,
            'hp': 0.7,
            'lenovo': 0.8,
            'asus': 0.8,
            'acer': 0.6,
            'msi': 0.7,
            'alienware': 0.8
        };
        const brand = (laptop.brand || '').toLowerCase();
        const baseScore = brandReputation[brand] ?? 0.5;
        // Boost if user specifically requested this brand
        if (query.brands && query.brands.some(b => b.toLowerCase() === brand)) {
            return Math.min(baseScore + 0.2, 1.0);
        }
        return baseScore;
    }
    matchSpecs(specs, query, reasonings) {
        let score = 0.5; // Base score
        // This could be enhanced with NLP to understand spec requirements from text
        // For now, basic matching
        if (query.text.toLowerCase().includes('gaming')) {
            if (specs.graphics && !specs.graphics.toLowerCase().includes('integrated')) {
                score += 0.3;
                reasonings.push('Dedicated graphics suitable for gaming');
            }
        }
        if (query.text.toLowerCase().includes('fast') || query.text.toLowerCase().includes('performance')) {
            if (specs.storage && specs.storage.toLowerCase().includes('ssd')) {
                score += 0.2;
                reasonings.push('SSD storage for fast performance');
            }
        }
        return Math.min(score, 1);
    }
}
exports.default = new MLRecommenderService();
