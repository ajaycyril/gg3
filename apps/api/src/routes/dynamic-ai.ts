import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { dynamicAI } from '../services/dynamicAI';
import logger from '../utils/logger';

const router = Router();

// Dynamic conversation endpoint with adaptive AI
router.post('/chat', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { message, sessionId, context = {} } = req.body;
  const userId = req.user?.id;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ 
      error: 'Message is required and must be a string',
      code: 'INVALID_MESSAGE'
    });
  }

  try {
    logger.info('Processing dynamic conversation', {
      userId,
      sessionId,
      messageLength: message.length,
      hasContext: Object.keys(context).length > 0
    });

    const result = await dynamicAI.processConversation(userId, message, sessionId);

    // Track user interaction for adaptive learning
    await dynamicAI.trackUserInteraction(userId, {
      action: 'chat_message',
      complexity: result.uiConfiguration.interaction?.chat_complexity || 'conversational',
      timestamp: new Date().toISOString(),
      context
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        sessionId: result.sessionId,
        uiConfiguration: result.uiConfiguration,
        suggestedActions: result.suggestedActions,
        recommendations: result.recommendations || [],
        metadata: {
          complexity_level: result.uiConfiguration.interaction?.suggested_questions_complexity || 5,
          session_phase: context.phase || 'discovery',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Dynamic conversation processing failed:', {
      error: error.message,
      userId,
      sessionId,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to process conversation',
      code: 'CONVERSATION_ERROR',
      fallback_response: "I'm having trouble right now. Could you please rephrase your question?"
    });
  }
}));

// Get adaptive UI configuration
router.get('/ui-config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { context = '{}' } = req.query;

  try {
    const parsedContext = JSON.parse(context as string);
    const uiConfig = await dynamicAI.getAdaptiveUIConfig(userId, parsedContext);

    res.json({
      success: true,
      data: {
        configuration: uiConfig,
        generated_at: new Date().toISOString(),
        user_expertise: uiConfig.expertise_level,
        complexity_level: uiConfig.interaction?.suggested_questions_complexity || 5
      }
    });

  } catch (error) {
    logger.error('UI configuration retrieval failed:', error);
    
    // Return fallback configuration
    const fallbackConfig = await dynamicAI.getFallbackUIConfig({ expertise_level: 'intermediate' });
    
    res.json({
      success: true,
      data: {
        configuration: fallbackConfig,
        fallback: true,
        generated_at: new Date().toISOString()
      }
    });
  }
}));

// Update user preferences dynamically
router.post('/preferences', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { preferences, interaction_data = {} } = req.body;

  if (!preferences || typeof preferences !== 'object') {
    return res.status(400).json({
      error: 'Preferences object is required',
      code: 'INVALID_PREFERENCES'
    });
  }

  try {
    const updatedProfile = await dynamicAI.updateUserPreferences(userId, preferences, interaction_data);
    
    // Generate new UI configuration based on updated preferences
    const newUIConfig = await dynamicAI.generateDynamicUI(updatedProfile, {}, {});

    res.json({
      success: true,
      data: {
        profile: updatedProfile,
        updated_ui_config: newUIConfig,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Preferences update failed:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      code: 'PREFERENCES_UPDATE_ERROR'
    });
  }
}));

// Get conversation history
router.get('/conversations/:sessionId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  try {
    const conversation = await dynamicAI.getConversationHistory(userId, sessionId);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        session: conversation,
        turns: conversation.conversation_context?.turns || [],
        recommendations: conversation.current_recommendations || [],
        extracted_preferences: conversation.user_preferences_extracted || {}
      }
    });

  } catch (error) {
    logger.error('Conversation retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation',
      code: 'CONVERSATION_RETRIEVAL_ERROR'
    });
  }
}));

// Dynamic laptop recommendations with AI reasoning
router.post('/recommendations', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { 
    preferences = {}, 
    complexity_level = 5, 
    max_results = 10,
    context = {}
  } = req.body;

  try {
    const recommendations = await dynamicAI.generateAdaptiveRecommendations(
      userId,
      preferences,
      {
        complexity_level,
        max_results,
        ...context
      }
    );

    res.json({
      success: true,
      data: {
        recommendations,
        total_count: recommendations.length,
        complexity_level,
        generated_at: new Date().toISOString(),
        preferences_used: preferences
      }
    });

  } catch (error) {
    logger.error('Dynamic recommendations generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      code: 'RECOMMENDATIONS_ERROR'
    });
  }
}));

// Feedback on AI responses for continuous learning
router.post('/feedback', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { 
    session_id,
    turn_number,
    feedback_type, // helpful, not_helpful, too_complex, too_simple
    rating, // 1-5
    comment,
    recommendation_id
  } = req.body;

  if (!session_id || feedback_type === undefined) {
    return res.status(400).json({
      error: 'Session ID and feedback type are required',
      code: 'INVALID_FEEDBACK'
    });
  }

  try {
    await dynamicAI.processFeedback(userId, {
      session_id,
      turn_number,
      feedback_type,
      rating,
      comment,
      recommendation_id,
      timestamp: new Date().toISOString()
    });

    // Update user profile based on feedback
    await dynamicAI.adaptUserProfileFromFeedback(userId, feedback_type, rating);

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      data: {
        feedback_processed: true,
        profile_updated: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Feedback processing failed:', error);
    res.status(500).json({
      error: 'Failed to process feedback',
      code: 'FEEDBACK_ERROR'
    });
  }
}));

// Get user's conversation sessions
router.get('/sessions', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const sessions = await dynamicAI.getUserSessions(
      userId, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: {
        sessions,
        total_count: sessions.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    logger.error('Sessions retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve sessions',
      code: 'SESSIONS_RETRIEVAL_ERROR'
    });
  }
}));

// Dynamic component configuration endpoint
router.get('/components/:component', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { component } = req.params;
  const { context = '{}' } = req.query;

  const validComponents = [
    'filter_panel', 'laptop_grid', 'comparison_table', 
    'chat_interface', 'recommendation_cards', 'spec_details'
  ];

  if (!validComponents.includes(component)) {
    return res.status(400).json({
      error: 'Invalid component name',
      code: 'INVALID_COMPONENT',
      valid_components: validComponents
    });
  }

  try {
    const parsedContext = JSON.parse(context as string);
    const componentConfig = await dynamicAI.getComponentConfiguration(
      userId, 
      component, 
      parsedContext
    );

    res.json({
      success: true,
      data: {
        component,
        configuration: componentConfig,
        context: parsedContext,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Component configuration failed:', error);
    res.status(500).json({
      error: 'Failed to get component configuration',
      code: 'COMPONENT_CONFIG_ERROR'
    });
  }
}));

export default router;