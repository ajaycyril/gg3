"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dynamicAI_1 = __importDefault(require("../services/dynamicAI"));
const router = express_1.default.Router();
// Chat endpoint - now fully dynamic
router.post('/chat', async (req, res) => {
    try {
        const { message, sessionId, context } = req.body;
        const userId = req.headers['user-id'] || 'anonymous';
        if (!message) {
            return res.status(400).json({
                error: 'Message is required',
                code: 'MISSING_MESSAGE'
            });
        }
        const result = await dynamicAI_1.default.processConversation(userId, message, sessionId, context);
        res.json({
            success: true,
            data: {
                response: result.response,
                sessionId: result.sessionId,
                dynamicUI: result.dynamicUI,
                recommendations: result.recommendations || [],
                databaseQuery: result.databaseQuery,
                // Legacy compatibility
                suggestedActions: result.dynamicUI,
                uiConfiguration: { dynamic: true }
            }
        });
    }
    catch (error) {
        console.error('Dynamic chat processing failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process conversation',
            code: 'PROCESSING_ERROR'
        });
    }
});
// UI configuration endpoint
router.get('/ui-config', async (req, res) => {
    try {
        const userId = req.headers['user-id'] || 'anonymous';
        const context = req.query.context ? JSON.parse(req.query.context) : {};
        const uiConfig = await dynamicAI_1.default.getAdaptiveUIConfig(userId, context);
        res.json({
            success: true,
            data: uiConfig
        });
    }
    catch (error) {
        console.error('UI config retrieval failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get UI configuration',
            code: 'CONFIG_ERROR'
        });
    }
});
// Recommendations endpoint
router.post('/recommendations', async (req, res) => {
    try {
        const { preferences, context } = req.body;
        const userId = req.headers['user-id'] || 'anonymous';
        const recommendations = await dynamicAI_1.default.generateAdaptiveRecommendationsForUser(userId, preferences || {}, context || {});
        res.json({
            success: true,
            data: recommendations
        });
    }
    catch (error) {
        console.error('Recommendations generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate recommendations',
            code: 'RECOMMENDATIONS_ERROR'
        });
    }
});
exports.default = router;
