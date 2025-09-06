import express, { Router, Request, Response } from 'express';
import dynamicAI from '../services/dynamicAI';

const router: Router = express.Router();

// Chat endpoint - now fully dynamic
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, sessionId, context } = req.body;
    const userId = req.headers['user-id'] as string || 'anonymous';

    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    const result = await dynamicAI.processConversation(userId, message, sessionId, context);

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

  } catch (error: unknown) {
    console.error('Dynamic chat processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process conversation',
      code: 'PROCESSING_ERROR'
    });
  }
});

// UI configuration endpoint
router.get('/ui-config', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || 'anonymous';
    const context = req.query.context ? JSON.parse(req.query.context as string) : {};

    const uiConfig = await dynamicAI.getAdaptiveUIConfig(userId, context);

    res.json({
      success: true,
      data: uiConfig
    });

  } catch (error: unknown) {
    console.error('UI config retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get UI configuration',
      code: 'CONFIG_ERROR'
    });
  }
});

// Recommendations endpoint
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { preferences, context } = req.body;
    const userId = req.headers['user-id'] as string || 'anonymous';

    const recommendations = await dynamicAI.generateAdaptiveRecommendationsForUser(
      userId,
      preferences || {},
      context || {}
    );

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error: unknown) {
    console.error('Recommendations generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      code: 'RECOMMENDATIONS_ERROR'
    });
  }
});

export default router;
