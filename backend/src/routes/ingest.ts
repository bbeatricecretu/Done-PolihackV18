/**
 * Ingestion Router
 * 
 * Handles incoming data from mobile app:
 * - Notifications
 * - Chat messages
 * - Voice input (future)
 */

import { Router, Request, Response } from 'express';
import * as localStorage from '../services/localStorage';

const router = Router();

// Notification payload interface
interface NotificationPayload {
  source_app: string;
  title: string;
  body: string;
  timestamp: string;
  urgency?: number;
}

/**
 * POST /api/ingest/notification
 * 
 * Receives notifications from mobile app.
 * 
 * Payload format:
 * {
 *   "source_app": "WhatsApp",
 *   "title": "John Doe",
 *   "body": "Meeting tomorrow at 3pm",
 *   "timestamp": "2025-12-06T10:30:00.000Z"
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "action": "task_created" | "task_updated" | "ignore",
 *   "task": {
 *     "id": "uuid",
 *     "title": "Meeting with John",
 *     "description": "...",
 *     "category": "meetings",
 *     "priority": "high"
 *   },
 *   "message": "Task created successfully"
 * }
 */
router.post('/notification', async (req: Request, res: Response) => {
  try {
    const payload: NotificationPayload = req.body;

    // Validate payload
    if (!payload.source_app || !payload.title || !payload.body || !payload.timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: source_app, title, body, timestamp'
      });
    }

    console.log('[Ingest] Received notification:');
    console.log(`  App:   ${payload.source_app}`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Body:  ${payload.body}`);
    console.log(`  Time:  ${payload.timestamp}`);

    // TODO: Send to AI Agent via MCP
    // For now, we'll do simple keyword detection

    const shouldCreateTask = await analyzeNotification(payload);

    if (shouldCreateTask) {
      // Create task using local storage
      const task = await localStorage.addTask({
        title: extractTaskTitle(payload),
        description: payload.body,
        category: categorizeNotification(payload),
        priority: determinePriority(payload),
        status: 'pending',
        source: 'notification',
        source_app: payload.source_app,
      });

      console.log('[Ingest] ✓ Task created:', task.title);

      return res.json({
        success: true,
        action: 'task_created',
        task: task,
        message: 'Task created successfully'
      });

    } else {
      console.log('[Ingest] ✗ Notification ignored (not task-worthy)');

      return res.json({
        success: true,
        action: 'ignore',
        message: 'Notification does not require task creation'
      });
    }

  } catch (error) {
    console.error('[Ingest] Error processing notification:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/ingest/chat
 * 
 * Receives chat messages from user.
 * 
 * Payload format:
 * {
 *   "message": "Add a task to buy groceries tomorrow",
 *   "timestamp": "2025-12-06T10:30:00.000Z"
 * }
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, timestamp } = req.body;

    if (!message || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: message, timestamp'
      });
    }

    console.log('[Ingest] Received chat message:', message);

    // TODO: Send to AI Agent via MCP
    // For now, return a mock response

    return res.json({
      success: true,
      response: "I've received your message. AI agent integration coming soon!",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Ingest] Error processing chat:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Analyze if notification should create a task
 * Simple keyword-based logic (will be replaced by AI)
 */
async function analyzeNotification(payload: NotificationPayload): Promise<boolean> {
  const content = `${payload.title} ${payload.body}`.toLowerCase();

  // Task-creating keywords
  const taskKeywords = [
    'meeting', 'reminder', 'deadline', 'due', 'tomorrow', 'today',
    'appointment', 'schedule', 'task', 'todo', 'bill', 'payment',
    'call', 'email', 'send', 'buy', 'pick up', 'deliver'
  ];

  // Noise keywords (ignore these)
  const noiseKeywords = [
    'liked your', 'commented on', 'started following', 'sent you',
    'added you', 'tagged you', 'reacted', 'shared'
  ];

  // Check for noise first
  if (noiseKeywords.some(keyword => content.includes(keyword))) {
    return false;
  }

  // Check for task-creating keywords
  return taskKeywords.some(keyword => content.includes(keyword));
}

/**
 * Extract a clean task title from notification
 */
function extractTaskTitle(payload: NotificationPayload): string {
  // Simple extraction - will be improved with AI
  const body = payload.body;
  
  // If body is short, use it as title
  if (body.length < 50) {
    return body;
  }

  // Otherwise, take first sentence
  const firstSentence = body.split(/[.!?]/)[0];
  return firstSentence.substring(0, 100);
}

/**
 * Categorize notification based on content and source
 */
function categorizeNotification(payload: NotificationPayload): string {
  const content = `${payload.title} ${payload.body}`.toLowerCase();
  const source = payload.source_app.toLowerCase();

  // Category mapping based on keywords
  if (content.includes('meeting') || content.includes('appointment')) return 'meetings';
  if (content.includes('bill') || content.includes('payment') || content.includes('invoice')) return 'finance';
  if (content.includes('buy') || content.includes('shop') || content.includes('order')) return 'shopping';
  if (content.includes('call') || content.includes('email') || content.includes('message')) return 'communication';
  if (content.includes('doctor') || content.includes('health') || content.includes('appointment')) return 'health';
  if (source.includes('calendar')) return 'meetings';
  if (source.includes('bank') || source.includes('paypal')) return 'finance';
  
  return 'general';
}

/**
 * Determine priority based on content
 */
function determinePriority(payload: NotificationPayload): 'low' | 'medium' | 'high' {
  const content = `${payload.title} ${payload.body}`.toLowerCase();

  // High priority keywords
  const highKeywords = ['urgent', 'asap', 'immediately', 'today', 'deadline', 'critical', 'emergency'];
  if (highKeywords.some(keyword => content.includes(keyword))) {
    return 'high';
  }

  // Medium priority keywords
  const mediumKeywords = ['tomorrow', 'soon', 'reminder', 'important', 'meeting'];
  if (mediumKeywords.some(keyword => content.includes(keyword))) {
    return 'medium';
  }

  return 'medium'; // Default to medium
}

/**
 * Generate a simple ID (will be replaced with database auto-increment or UUID)
 */
function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default router;
