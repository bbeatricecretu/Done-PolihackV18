import { Task } from '../types';
import { DevLogger } from './DevLogger';

interface NotificationPayload {
  source_app: string;
  title: string;
  body: string;
  timestamp: string;
  urgency?: number;
}

export class TaskProcessor {
  /**
   * Analyze if notification should create a task
   * Simple keyword-based logic (ported from backend)
   */
  static shouldCreateTask(title: string, body: string): boolean {
    const content = `${title} ${body}`.toLowerCase();

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
      DevLogger.log('[TaskProcessor] Filtered as noise', { title, body });
      return false;
    }

    // Check for task-creating keywords
    const hasKeyword = taskKeywords.some(keyword => content.includes(keyword));
    if (hasKeyword) {
      DevLogger.log('[TaskProcessor] Identified as task', { title, body });
    } else {
      DevLogger.log('[TaskProcessor] No task keywords found', { title, body });
    }
    return hasKeyword;
  }

  /**
   * Extract a clean task title from notification
   */
  static extractTaskTitle(body: string): string {
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
  static categorizeNotification(title: string, body: string, sourceApp: string): string {
    const content = `${title} ${body}`.toLowerCase();
    const source = sourceApp.toLowerCase();

    // Category mapping based on keywords
    if (content.includes('meeting') || content.includes('appointment')) return 'Meetings';
    if (content.includes('bill') || content.includes('payment') || content.includes('invoice')) return 'Finance';
    if (content.includes('buy') || content.includes('shop') || content.includes('order')) return 'Shopping';
    if (content.includes('call') || content.includes('email') || content.includes('message')) return 'Communication';
    if (content.includes('doctor') || content.includes('health') || content.includes('appointment')) return 'Health';
    if (source.includes('calendar')) return 'Meetings';
    if (source.includes('bank') || source.includes('paypal')) return 'Finance';
    
    return 'General';
  }

  /**
   * Determine priority based on content
   */
  static determinePriority(title: string, body: string): string {
    const content = `${title} ${body}`.toLowerCase();

    // High priority keywords
    const highKeywords = ['urgent', 'asap', 'immediately', 'today', 'deadline', 'critical', 'emergency'];
    if (highKeywords.some(keyword => content.includes(keyword))) {
      return 'High';
    }

    // Medium priority keywords
    const mediumKeywords = ['tomorrow', 'soon', 'reminder', 'important', 'meeting'];
    if (mediumKeywords.some(keyword => content.includes(keyword))) {
      return 'Medium';
    }

    return 'Medium'; // Default to medium
  }

  /**
   * Create a task object from notification data
   */
  static createTaskFromNotification(title: string, body: string, sourceApp: string): Omit<Task, 'id'> {
    return {
      title: this.extractTaskTitle(body),
      description: body,
      completed: false,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      category: this.categorizeNotification(title, body, sourceApp),
      priority: this.determinePriority(title, body),
      source: sourceApp,
    };
  }
}
