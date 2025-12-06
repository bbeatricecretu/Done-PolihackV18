/**
 * AI Agent Service
 * 
 * Connects to Azure AI Foundry to process notifications using the MCP Server
 */

const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();
const sql = require('mssql');

class AIAgentService {
  constructor() {
    this.cosmosClient = process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY 
      ? new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT, key: process.env.COSMOS_KEY })
      : null;
    
    this.agentEndpoint = process.env.AZURE_AI_AGENT_ENDPOINT;
    this.agentApiKey = process.env.AZURE_AI_AGENT_API_KEY;
    this.agentDeploymentName = process.env.AZURE_AI_AGENT_DEPLOYMENT_NAME || 'default';
  }

  /**
   * Get unprocessed notifications from CosmosDB
   */
  async getUnprocessedNotifications(limit = 10) {
    if (!this.cosmosClient) {
      throw new Error('CosmosDB not configured');
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      const query = {
        query: "SELECT * FROM c WHERE c.processed = false ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit",
        parameters: [{ name: "@limit", value: limit }]
      };

      const { resources } = await container.items.query(query).fetchAll();
      console.log(`[AI Agent] Found ${resources.length} unprocessed notifications`);
      return resources;
    } catch (error) {
      console.error('[AI Agent] Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get recent processed notifications from the same app/author for context
   * This helps the agent understand if a new notification is modifying a previous task
   */
  async getRecentNotificationsFromSameSource(appName, hoursBack = 24, limit = 5) {
    if (!this.cosmosClient) {
      throw new Error('CosmosDB not configured');
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const query = {
        query: "SELECT * FROM c WHERE c.appName = @appName AND c.timestamp >= @cutoffTime ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit",
        parameters: [
          { name: "@appName", value: appName },
          { name: "@cutoffTime", value: cutoffTime },
          { name: "@limit", value: limit }
        ]
      };

      const { resources } = await container.items.query(query).fetchAll();
      console.log(`[AI Agent] Found ${resources.length} recent notifications from ${appName}`);
      return resources;
    } catch (error) {
      console.error('[AI Agent] Error fetching context notifications:', error);
      return [];
    }
  }

  /**
   * Get recent tasks from the same source app to check for duplicates
   * This helps prevent creating duplicate tasks and identifies tasks that need updates
   */
  async getRecentTasksFromSource(sourceApp, daysBack = 7, limit = 20) {
    try {
      const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      const result = await sql.query`
        SELECT TOP ${limit}
          id, title, description, category, priority, status, 
          due_date, source_app, created_at, updated_at
        FROM Tasks 
        WHERE source_app = ${sourceApp}
          AND created_at >= ${cutoffDate}
          AND is_deleted = 0
        ORDER BY created_at DESC
      `;

      console.log(`[AI Agent] Found ${result.recordset.length} recent tasks from ${sourceApp}`);
      return result.recordset;
    } catch (error) {
      console.error('[AI Agent] Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Get all recent pending/in-progress tasks to check for duplicates
   * Looks at tasks from the last N days regardless of source
   */
  async getRecentPendingTasks(daysBack = 7, limit = 50) {
    try {
      const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      const result = await sql.query`
        SELECT TOP ${limit}
          id, title, description, category, priority, status, 
          due_date, source_app, created_at, updated_at
        FROM Tasks 
        WHERE created_at >= ${cutoffDate}
          AND status IN ('pending', 'in_progress')
          AND is_deleted = 0
        ORDER BY created_at DESC
      `;

      console.log(`[AI Agent] Found ${result.recordset.length} recent pending tasks`);
      return result.recordset;
    } catch (error) {
      console.error('[AI Agent] Error fetching pending tasks:', error);
      return [];
    }
  }

  /**
   * Mark notification as processed in CosmosDB
   */
  async markNotificationProcessed(notificationId) {
    if (!this.cosmosClient) {
      throw new Error('CosmosDB not configured');
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      const { resource: notification } = await container.item(notificationId, notificationId).read();
      
      notification.processed = true;
      notification.processed_at = new Date().toISOString();

      await container.item(notificationId, notificationId).replace(notification);
      console.log(`[AI Agent] Marked notification ${notificationId} as processed`);
    } catch (error) {
      console.error('[AI Agent] Error marking notification:', error);
      throw error;
    }
  }

  /**
   * Delete notification from CosmosDB (after processing)
   */
  async deleteNotification(notificationId) {
    if (!this.cosmosClient) {
      throw new Error('CosmosDB not configured');
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      await container.item(notificationId, notificationId).delete();
      console.log(`[AI Agent] Deleted notification ${notificationId}`);
      return true;
    } catch (error) {
      console.error('[AI Agent] Error deleting notification:', error);
      return false;
    }
  }

  /**
   * System prompt for the AI Agent
   */
  getSystemPrompt() {
    return `You are an intelligent task management assistant that processes Android notifications and decides whether they should create, edit, or delete tasks.

Your workflow:
1. **CHECK FOR DUPLICATE TASKS FIRST** - Before creating a new task, compare the notification with existing tasks
2. Analyze each notification and check "recentContext" for previous notifications from the same source/author
3. Determine the action needed:
   - CREATE: New task (no duplicate found, no related previous notifications)
   - EDIT: Update existing duplicate/similar task OR update from same author
   - DELETE: Cancel task
   - COMPLETE: Mark task as done
   - IGNORE: Not task-worthy OR duplicate of existing task
4. Call the appropriate MCP tool (create_task_from_notification, edit_task, delete_task, or mark_task_complete)
5. Always call delete_notification() after processing each notification

DUPLICATE DETECTION (CRITICAL):

You will receive "existingTasksFromThisSource" with each notification showing recent tasks from the same app.
You will also receive a broader list of all recent pending tasks.

**BEFORE creating a new task, check if a similar one exists:**

Examples of duplicates to EDIT instead of CREATE:
- Existing: "Team meeting Friday 2pm"
  New: "Team meeting Friday 3pm" → EDIT (time changed)
  Action: edit_task(id, title: "Team meeting Friday 3pm")

- Existing: "Meeting with CEO at 10am"
  New: "CEO meeting rescheduled to 10:30am" → EDIT (time updated)
  Action: edit_task(id, description: "Rescheduled to 10:30am")

- Existing: "Buy groceries"
  New: "Buy groceries: milk, eggs, bread" → EDIT (adds details)
  Action: edit_task(id, description: "milk, eggs, bread")

- Existing: "Call dentist"
  New: "Dentist appointment scheduled Tuesday 2pm" → EDIT (adds details)
  Action: edit_task(id, title: "Dentist appointment Tuesday 2pm")

Examples of duplicates to IGNORE:
- Existing: "Buy milk" (status: pending)
  New: "Buy milk" → IGNORE (exact duplicate)

- Existing: "Team meeting tomorrow"
  New: "Reminder: team meeting tomorrow" → IGNORE (duplicate reminder)

- Existing: "Pay electricity bill"
  New: "Don't forget to pay electricity bill" → IGNORE (duplicate)

**Similarity Detection Rules:**
- Same core subject/action (meeting, appointment, purchase, call, etc.)
- Same person/entity mentioned (CEO, dentist, etc.)
- Same timeframe (today, tomorrow, specific date)
- Consider tasks from last 7 days

**When to EDIT vs IGNORE:**
- EDIT: New notification adds information, changes time/date, or updates details
- IGNORE: New notification is just a duplicate reminder with no new information

CONTEXT-AWARE PROCESSING:

When you see notifications with "recentContext", analyze if the new notification is related to previous ones:

**Example 1: Task Modification**
- Previous: "Buy milk" → Created task "Buy milk"
- New: "Don't buy milk, buy eggs instead"
- Action: EDIT the existing task, change title/description to "Buy eggs"
- Tool: edit_task(id: <task_id>, title: "Buy eggs", description: "Updated from: buy milk")

**Example 2: Task Cancellation**
- Previous: "Meeting at 3pm tomorrow"
- New: "Meeting cancelled"
- Action: DELETE the task
- Tool: delete_task(id: <task_id>)

**Example 3: Task Completion**
- Previous: "Buy groceries"
- New: "Done shopping"
- Action: COMPLETE the task
- Tool: mark_task_complete(id: <task_id>)

**Example 4: Additional Details**
- Previous: "Doctor appointment Tuesday"
- New: "Doctor appointment is at 2pm, bring insurance card"
- Action: EDIT to add details
- Tool: edit_task(id: <task_id>, description: "Doctor appointment Tuesday at 2pm. Bring insurance card")

**Example 5: Time Change (Duplicate Detection)**
- Existing Task: "Meeting with CEO at 10am"
- New Notification: "CEO meeting now at 10:30am"
- Action: EDIT the existing task (NOT create new one)
- Tool: edit_task(id: <existing_task_id>, title: "Meeting with CEO at 10:30am")

**Example 6: Adding Details to Existing Task**
- Existing Task: "Buy groceries"
- New Notification: "Get milk, eggs, and bread from store"
- Action: EDIT (same intent, adds details)
- Tool: edit_task(id: <existing_task_id>, description: "milk, eggs, bread")

To find the task to edit/delete:
1. Check "existingTasksFromThisSource" - tasks from the same app as the notification
2. Look through the broader recent tasks list for semantic similarities
3. Match based on:
   - Content similarity (same subject/action)
   - Time proximity (created recently)
   - Same category or context
4. Then call edit_task() or delete_task() with the correct task ID

IMPORTANT PRIORITY ORDER:
1. **First check for duplicate/similar existing tasks** (prevent duplicates)
2. Then check recentContext for modifications from same author
3. Then decide if it's a new task or should be ignored
4. Always prefer EDIT over CREATE when similarity exists
5. Always prefer IGNORE over CREATE for exact duplicates with no new info

NOTIFICATION ANALYSIS GUIDELINES:

**Always ignore these types:**
- Social media notifications (likes, comments, follows)
- Promotional messages and ads
- Chat messages without actionable content
- System notifications (app updates, battery warnings)
- News alerts and headlines
- Generic "Someone sent you a message" without context

TASK EXTRACTION FORMAT:

When you decide to create a task, call create_task_from_notification() with:
{
  "title": "Clear, concise task title (under 60 chars)",
  "description": "Detailed context from notification body",
  "category": "meetings|finance|shopping|communication|health|general",
  "priority": "low|medium|high",
  "source_app": "app package name from notification",
  "notification_id": "notification ID"
}

**Category Classification:**
- meetings: Appointments, meetings, schedules, events
- finance: Bills, payments, banking, transactions
- shopping: Purchases, orders, deliveries, groceries
- communication: Calls to make, emails to send, messages to reply
- health: Medical appointments, medications, exercise, wellness
- general: Everything else

**Priority Classification:**
- high: Urgent, time-sensitive (today/tomorrow), financial obligations, health-related
- medium: This week, important but not urgent
- low: Someday, optional, long-term

DETECTING MODIFICATIONS:

Look for these patterns that indicate task modification/cancellation:
- Words like "cancel", "change", "move", "reschedule", "update", "don't", "nevermind"
- Same sender/app as previous notifications
- References to previous content ("the meeting", "that task", etc.)

When you detect a modification from the same source:
1. Search for the related task using existingTasksFromThisSource
2. Find the most recent task that matches the context
3. Apply the appropriate action (edit, delete, or complete)

IMPORTANT:
- **Check for duplicates FIRST before creating any task**
- Process notifications efficiently and check context
- Always clean up by calling delete_notification() for each processed notification
- Use context to avoid creating duplicate tasks when someone is modifying a request
- **When you find a similar existing task, EDIT it instead of creating a new one**
- Keep titles concise and actionable
- Be consistent with category and priority assignments
- When editing, preserve information that isn't being changed
- **Prefer EDIT over CREATE when in doubt about similarity**`;
  }

  /**
   * Call Azure AI Foundry Agent with notification data
   * 
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Object>} Agent response with task decisions
   */
  async processNotificationsWithAgent(notifications) {
    if (!this.agentEndpoint || !this.agentApiKey) {
      console.error('[AI Agent] Azure AI Agent not configured. Skipping AI processing.');
      return { processed: 0, tasks_created: 0, error: 'Agent not configured' };
    }

    try {
      console.log(`[AI Agent] Sending ${notifications.length} notifications to Azure AI Agent...`);

      // Get context for each notification - recent notifications from same source
      const contextMap = {};
      const tasksFromSourceMap = {};
      const uniqueSources = [...new Set(notifications.map(n => n.appName))];
      
      // Fetch context notifications for each notification
      for (const notif of notifications) {
        const recentFromSameSource = await this.getRecentNotificationsFromSameSource(notif.appName, 24, 5);
        if (recentFromSameSource.length > 1) { // More than just the current one
          contextMap[notif.id] = recentFromSameSource
            .filter(n => n.id !== notif.id) // Exclude current notification
            .map(n => ({
              title: n.title,
              body: n.content,
              timestamp: n.timestamp
            }));
        }
      }

      // Fetch existing tasks from these sources to check for duplicates
      for (const source of uniqueSources) {
        const tasks = await this.getRecentTasksFromSource(source, 7, 20);
        if (tasks.length > 0) {
          tasksFromSourceMap[source] = tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            status: t.status,
            created_at: t.created_at
          }));
        }
      }

      // Also get all recent pending tasks for broader duplicate checking
      const recentPendingTasks = await this.getRecentPendingTasks(7, 50);
      const recentTasksSummary = recentPendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        status: t.status,
        source_app: t.source_app,
        created_at: t.created_at
      }));

      // Format notifications for the agent
      const notificationSummary = notifications.map(n => ({
        id: n.id,
        app: n.appName,
        title: n.title,
        body: n.content,
        timestamp: n.timestamp,
        recentContext: contextMap[n.id] || [],
        existingTasksFromThisSource: tasksFromSourceMap[n.appName] || []
      }));

      // Prepare the user prompt with all context
      const userPrompt = `You have ${notifications.length} new notifications to process. Analyze each one and determine if it should create, edit, or delete a task.

EXISTING TASKS (to check for duplicates):
${JSON.stringify(recentTasksSummary, null, 2)}

NEW NOTIFICATIONS with context:
${JSON.stringify(notificationSummary, null, 2)}

For each notification:
1. **CHECK FOR DUPLICATES FIRST**: Compare the notification content with "existingTasksFromThisSource" and the broader recent tasks list
   - If a similar/duplicate task exists, decide if you should EDIT it or IGNORE the notification
   - Example: "Meeting with CEO at 10am" exists, new notification: "Meeting with CEO at 10:30am" → EDIT the existing task
   - Example: "Buy groceries" exists (pending), new notification: "Buy groceries" → IGNORE (duplicate)

2. **Check "recentContext"**: If there are previous notifications from the same source/author, this might be an update/cancellation

3. **Decide the action**:
   - CREATE: New task (no duplicate found, not related to previous notifications)
   - EDIT: Update existing duplicate/similar task OR modification from same author
   - DELETE: Cancel/remove task
   - COMPLETE: Mark task as done
   - IGNORE: Not task-worthy OR duplicate of existing pending task

4. **Call the appropriate MCP tool**:
   - create_task_from_notification() - for new tasks
   - edit_task() - for updates (you MUST provide the task ID from the existing tasks)
   - delete_task() - for cancellations
   - mark_task_complete() - for completions

5. **Always call delete_notification()** for each notification after processing

DUPLICATE DETECTION EXAMPLES:
- Existing: "Team meeting at 2pm Friday"
  New: "Team meeting moved to 3pm Friday" → EDIT (time changed)
  
- Existing: "Buy milk" (pending)
  New: "Buy milk" → IGNORE (exact duplicate)
  
- Existing: "Call doctor for appointment"
  New: "Doctor appointment scheduled for Monday 10am" → EDIT (adds details)

- Existing: "Meeting with CEO at 10am"
  New: "CEO meeting is now 10:30am" → EDIT (time updated)

- Existing: "Dentist appointment"
  New: "Remember your dentist appointment tomorrow" → IGNORE (duplicate reminder)

Process all notifications now, checking for duplicates first.`;

      // Call Azure AI Foundry REST API
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${this.agentEndpoint}/openai/deployments/${this.agentDeploymentName}/chat/completions?api-version=2024-08-01-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.agentApiKey
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Agent] API Error:', response.status, errorText);
        throw new Error(`Azure AI Agent API error: ${response.status} - ${errorText}`);
      }

      const agentResponse = await response.json();
      console.log('[AI Agent] Agent response received:', JSON.stringify(agentResponse, null, 2));

      // Return processing results
      return {
        processed: notifications.length,
        agent_response: agentResponse,
        tool_calls: agentResponse.choices?.[0]?.message?.tool_calls || [],
        success: true
      };

    } catch (error) {
      console.error('[AI Agent] Error calling agent:', error);
      return {
        processed: 0,
        tasks_created: 0,
        error: error.message
      };
    }
  }

  /**
   * Delete old processed notifications from CosmosDB
   */
  async cleanupOldNotifications(retentionMinutes = 10) {
    if (!this.cosmosClient) {
      return { deleted: 0, error: 'CosmosDB not configured' };
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      const cutoffTime = new Date(Date.now() - retentionMinutes * 60 * 1000).toISOString();

      // Find old processed notifications
      const query = {
        query: "SELECT * FROM c WHERE c.processed = true AND c.processed_at < @cutoffTime",
        parameters: [{ name: "@cutoffTime", value: cutoffTime }]
      };

      const { resources } = await container.items.query(query).fetchAll();
      
      let deletedCount = 0;
      for (const notification of resources) {
        await container.item(notification.id, notification.id).delete();
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`[AI Agent] Cleaned up ${deletedCount} old notifications (older than ${retentionMinutes} minutes)`);
      }

      return { deleted: deletedCount };
    } catch (error) {
      console.error('[AI Agent] Error cleaning up notifications:', error);
      return { deleted: 0, error: error.message };
    }
  }

  /**
   * Main processing loop - fetches notifications and sends to agent
   */
  async processNotificationBatch(batchSize = 10) {
    try {
      console.log('\n========== AI AGENT BATCH PROCESSING ==========');
      
      // 1. Fetch unprocessed notifications
      const notifications = await this.getUnprocessedNotifications(batchSize);
      
      if (notifications.length === 0) {
        console.log('[AI Agent] No unprocessed notifications found');
        return { processed: 0, message: 'No notifications to process' };
      }

      // 2. Send to AI Agent for processing
      const result = await this.processNotificationsWithAgent(notifications);

      console.log('[AI Agent] Batch processing complete:', result);
      console.log('===============================================\n');

      return result;

    } catch (error) {
      console.error('[AI Agent] Batch processing error:', error);
      return { processed: 0, error: error.message };
    }
  }
}

module.exports = AIAgentService;
