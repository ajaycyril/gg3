interface DynamicUIElement {
    type: 'button' | 'slider' | 'multiselect' | 'text' | 'quickaction';
    id: string;
    label: string;
    options?: string[] | {
        min: number;
        max: number;
        step: number;
    };
    action?: string;
    priority: number;
}
declare class DynamicAIService {
    private openai?;
    private readonly MODEL_GPT4;
    private conversations;
    constructor();
    private ensureOpenAI;
    processConversation(userId: string, userInput: string, sessionId?: string, context?: Record<string, any>): Promise<{
        response: string;
        sessionId: string;
        dynamicUI: DynamicUIElement[];
        recommendations?: any[];
        databaseQuery?: any;
    }>;
    private sanitizeFilters;
    private countCandidates;
    private extractDataFromInput;
    private buildDynamicSystemPrompt;
    private queryAndRecommend;
    private extractPurposeFromFilters;
    private buildQueryText;
    private buildReasoningText;
    getAdaptiveUIConfig(userId: string, context?: Record<string, any>): Promise<Record<string, any>>;
    generateAdaptiveRecommendationsForUser(userId: string, preferences?: Record<string, any>, context?: Record<string, any>): Promise<any[]>;
    private generateFallbackUI;
}
declare const _default: DynamicAIService;
export default _default;
