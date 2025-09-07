interface UserQuery {
    purpose: string[];
    budget: {
        min: number;
        max: number;
    };
    brands?: string[];
    specs?: Record<string, any>;
    priorities?: string[];
    text: string;
}
interface LaptopScore {
    laptop: any;
    score: number;
    valueScore: number;
    similarityScore: number;
    recencyScore: number;
    reasonings: string[];
    highlights: string[];
    warnings?: string[];
}
interface FeedbackData {
    sessionId: string;
    userId: string;
    query: UserQuery;
    recommendedLaptop: any;
    userAction: 'clicked' | 'purchased' | 'dismissed' | 'compared';
    feedback?: 'positive' | 'negative';
    timestamp: Date;
}
declare class MLRecommenderService {
    private feedbackHistory;
    private userPreferenceWeights;
    private featureWeights;
    /**
     * Main recommendation engine - uses ML-based similarity matching
     */
    getRecommendations(userQuery: UserQuery, userId: string, sessionId: string): Promise<LaptopScore[]>;
    /**
     * Enhanced laptop-only query with multiple fallback strategies
     */
    private queryLaptopsOnly;
    /**
     * Core ML scoring algorithm - combines multiple factors
     */
    private calculateLaptopScore;
    /**
     * Similarity scoring using semantic matching
     */
    private calculateSimilarityScore;
    /**
     * Value-for-money scoring with market analysis
     */
    private calculateValueScore;
    /**
     * Recency scoring - penalize old technology
     */
    private calculateRecencyScore;
    /**
     * Purpose matching with semantic understanding
     */
    private matchPurpose;
    /**
     * Gaming laptop scoring
     */
    private scoreForGaming;
    /**
     * Work laptop scoring
     */
    private scoreForWork;
    /**
     * Creative work laptop scoring
     */
    private scoreForCreative;
    /**
     * Student laptop scoring - focus on value and basics
     */
    private scoreForStudent;
    /**
     * Component scoring methods
     */
    private scoreCPU;
    private scoreGPU;
    private scoreRAM;
    private scoreStorage;
    /**
     * Helper methods
     */
    private extractRAMSize;
    private extractReleaseYear;
    /**
     * User preference learning
     */
    private getUserPreferenceScore;
    private calculateLaptopSimilarity;
    /**
     * Value-for-money filtering - eliminate overpriced last-gen laptops
     */
    private filterByValueForMoney;
    /**
     * Learning and adaptation methods
     */
    recordInteraction(userId: string, sessionId: string, query: UserQuery, recommendations: LaptopScore[]): Promise<void>;
    processFeedback(feedback: FeedbackData): Promise<void>;
    private updateUserPreferenceWeights;
    private calculateBrandScore;
    private matchSpecs;
}
declare const _default: MLRecommenderService;
export default _default;
