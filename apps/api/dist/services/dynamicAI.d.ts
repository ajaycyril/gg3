declare class DynamicAIService {
    private openai;
    private readonly MODEL_GPT4;
    private readonly MODEL_GPT35;
    constructor();
    processConversation(userId: string, userInput: string, sessionId?: string, context?: Record<string, any>): Promise<{
        response: string;
        sessionId: string;
        suggestedActions: any[];
        uiConfiguration: Record<string, any>;
        recommendations?: any[];
    }>;
    getAdaptiveUIConfig(userId: string, context?: Record<string, any>): Promise<Record<string, any>>;
    generateAdaptiveRecommendationsForUser(userId: string, preferences?: Record<string, any>, context?: Record<string, any>): Promise<any[]>;
    private buildSystemPrompt;
    private buildRecommendationPrompt;
    private generateSuggestedActions;
    private getDefaultUIConfig;
}
declare const _default: DynamicAIService;
export default _default;
