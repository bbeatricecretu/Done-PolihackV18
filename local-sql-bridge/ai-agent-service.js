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
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
  }

  /**
   * Get unprocessed notifications from CosmosDB
   * Only returns notifications that haven't been seen by the agent yet
   */
  async getUnprocessedNotifications(limit = 10) {
    if (!this.cosmosClient) {
      throw new Error('CosmosDB not configured');
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      const query = {
        query: "SELECT * FROM c WHERE c.processed = false AND (NOT IS_DEFINED(c.seen_by_agent) OR c.seen_by_agent = false) ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit",
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
      
      const request = new sql.Request();
      request.input('limit', sql.Int, limit);
      request.input('sourceApp', sql.NVarChar, sourceApp);
      request.input('cutoffDate', sql.DateTime2, cutoffDate);
      
      const result = await request.query(`
        SELECT TOP (@limit)
          id, title, description, category, priority, status, 
          due_date, source_app, created_at, updated_at
        FROM Tasks 
        WHERE source_app = @sourceApp
          AND created_at >= @cutoffDate
          AND is_deleted = 0
        ORDER BY created_at DESC
      `);

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
      
      const request = new sql.Request();
      request.input('limit', sql.Int, limit);
      request.input('cutoffDate', sql.DateTime2, cutoffDate);
      
      const result = await request.query(`
        SELECT TOP (@limit)
          id, title, description, category, priority, status, 
          due_date, source_app, created_at, updated_at
        FROM Tasks 
        WHERE created_at >= @cutoffDate
          AND status IN ('pending', 'in_progress')
          AND is_deleted = 0
        ORDER BY created_at DESC
      `);

      console.log(`[AI Agent] Found ${result.recordset.length} recent pending tasks`);
      return result.recordset;
    } catch (error) {
      console.error('[AI Agent] Error fetching pending tasks:', error);
      return [];
    }
  }

  /**
   * Mark notification as seen by agent (for context-only use in future)
   */
  async markNotificationSeen(notificationId) {
    if (!this.cosmosClient) {
      throw new Error('CosmosDB not configured');
    }

    try {
      const database = this.cosmosClient.database(process.env.COSMOS_DATABASE);
      const container = database.container(process.env.COSMOS_CONTAINER);

      // Query to find the notification
      const query = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: notificationId }]
      };
      
      const { resources } = await container.items.query(query).fetchAll();
      
      if (!resources || resources.length === 0) {
        console.warn(`[AI Agent] Notification ${notificationId} not found, skipping mark as seen`);
        return;
      }
      
      const notification = resources[0];
      notification.seen_by_agent = true;
      notification.first_seen_at = notification.first_seen_at || new Date().toISOString();

      // Partition key is /polihack
      await container.item(notification.id, notification.polihack).replace(notification);
      console.log(`[AI Agent] Marked notification ${notificationId} as seen`);
    } catch (error) {
      console.error('[AI Agent] Error marking notification as seen:', error);
      // Don't throw - just log the error and continue
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

      // Query to find the notification
      const query = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: notificationId }]
      };
      
      const { resources } = await container.items.query(query).fetchAll();
      
      if (!resources || resources.length === 0) {
        console.log(`[AI Agent] Notification ${notificationId} not found when reading.`);
        return;
      }
      
      const notification = resources[0];
      notification.processed = true;
      notification.processed_at = new Date().toISOString();

      // Partition key is /polihack - use the polihack property value
      await container.item(notification.id, notification.polihack).replace(notification);
      console.log(`[AI Agent] ✅ Marked notification ${notificationId} as processed`);
    } catch (error) {
      // Handle 404 - notification doesn't exist
      if (error.code === 404) {
        console.log(`[AI Agent] Notification ${notificationId} not found (404) during replace.`);
        return;
      }
      console.error('[AI Agent] Error marking notification:', error.message || error);
      // Don't throw - just log and continue
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

      // Query to find the notification
      const query = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: notificationId }]
      };
      
      const { resources } = await container.items.query(query).fetchAll();
      
      if (!resources || resources.length === 0) {
        console.log(`[AI Agent] Notification ${notificationId} not found, skipping delete`);
        return false;
      }
      
      const notification = resources[0];
      
      // Partition key is /polihack
      await container.item(notification.id, notification.polihack).delete();
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

**CRITICAL GUARDRAILS: 99% of notifications should be IGNORED. Only create tasks for EXPLICIT, DIRECT action requests that the USER must do.**

**MANDATORY IGNORE LIST (Never create tasks for these):**

1. **System & Device Notifications:**
   - Battery status ("Charging complete", "Low battery", "Battery fully charged")
   - System updates ("Update available", "Software update ready")
   - Connectivity ("WiFi connected", "Bluetooth paired")
   - Storage ("Storage full", "Low storage")
   - Security ("New login detected", "Password changed")

2. **Message Counters & Badges:**
   - "X unread messages" / "Y new messages"
   - "49 messages from 2 chats"
   - "New message from [person]"
   - "Someone sent you a message"
   - Any notification that is just counting unread items

3. **Questions from Others:**
   - "When is the deadline?" (they're asking, not telling you to do something)
   - "What time is the meeting?" (question directed at you)
   - "Can you send me the file?" (request for you to answer, not a task assignment)
   - "Do you have the document?" (inquiry, not directive)
   - "Pana la ce ora se pot incarca maine prezentările?" (someone asking you for info)

4. **Social Media Engagement:**
   - Likes, comments, follows, shares
   - "X liked your post"
   - "Y commented on your photo"
   - "Z started following you"

5. **Past Tense / Already Completed:**
   - "I went to the store" (already done)
   - "Just finished the meeting" (completed)
   - "I bought milk today" (past action)
   - "Meeting ended" (already over)

6. **Third-Party Actions/Needs:**
   - "I need to go to the store" (someone else's need)
   - "She has to call the dentist" (not your task)
   - "He needs to buy groceries" (someone else's task)
   - Stories about what others are doing

7. **Informational/Status Updates:**
   - News headlines
   - Weather updates (unless explicitly requesting an action)
   - Stock prices
   - Sports scores
   - Promotional ads
   - "FYI" messages

8. **Casual Conversation:**
   - General chat without action request
   - Greetings ("Hi", "Hello", "Good morning")
   - Acknowledgments ("OK", "Thanks", "Got it")
   - Emotional expressions without actionable content

**Examples of what to IGNORE:**
- IGNORE: "Charging complete" (battery notification)
- IGNORE: "85% battery charged" (system status)
- IGNORE: "49 messages from 2 chats" (message counter)
- IGNORE: "X unread messages" (notification badge)
- IGNORE: "New message from John" (message alert without content)
- IGNORE: "Pana la ce ora se pot incarca maine prezentările?" (question from someone else)
- IGNORE: "When is the deadline?" (question, not a task)
- IGNORE: "Can you check the document?" (question/request for response, not a clear task)
- IGNORE: "I went to the store today" (past tense, completed)
- IGNORE: "Just finished my meeting" (already done)
- IGNORE: "She needs to buy groceries" (third-party need)
- IGNORE: "Update available for WhatsApp" (system notification)
- IGNORE: "Low storage space" (device warning)

**Examples of what to CREATE (ONLY these types):**
- CREATE: "Remind me to buy milk" (explicit self-reminder)
- CREATE: "YOU need to go to the store" (task directly assigned to YOU)
- CREATE: "Meeting with CEO tomorrow at 10am" (YOUR scheduled event)
- CREATE: "Don't forget to call mom" (directive/reminder for YOU)
- CREATE: "Clean the toilet tomorrow night" (YOUR explicit task with deadline)
- CREATE: "Submit the presentation by Friday" (YOUR direct action with deadline)
- CREATE: "Buy groceries this evening" (YOUR future action)
- CREATE: "Call dentist to schedule appointment" (YOUR action to do)

**Key Requirement: The notification must be directing the USER to do something specific in the future.**

**Key indicators of NON-actionable content:**
- Past tense verbs (went, bought, finished, told, saw)
- Storytelling language ("today I...", "yesterday...", "just finished...")
- **Third-party statements** ("I need to...", "she has to...", "he needs to..." in messages FROM others)
- **Questions from others** (they're asking you for information, not assigning you a task)
- Someone else's needs or obligations being discussed
- No direct request or command to the user
- Descriptive rather than prescriptive
- Message counters or unread badges

**IMPORTANT: If you're not 100% sure it's a direct, actionable task for the user, IGNORE it.**

TASK EXTRACTION FORMAT:

When you decide to create a task, call create_task_from_notification() with:
{
  "title": "Clear, concise task title (under 60 chars)",
  "description": "Detailed context from notification body",
  "category": "meetings|finance|shopping|communication|health|general",
  "priority": "low|medium|high",
  "due_date": "ISO 8601 date string (YYYY-MM-DD or full datetime)",
  "source_app": "app package name from notification",
  "notification_id": "notification ID"
}

**IMPORTANT: Always extract and include due_date when:**
- Notification mentions a specific time ("at 8 PM", "tomorrow at 3pm", "by 5:30")
- Notification mentions a date ("today", "tomorrow", "December 7th", "next Monday")
- Notification has a deadline ("by end of day", "before noon")
- Format as ISO 8601: "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD"
- Examples:
  * "Wash dishes today at 8 PM" → due_date: "2025-12-07T20:00:00"
  * "Meeting tomorrow at 3pm" → due_date: "2025-12-08T15:00:00"
  * "Dentist appointment Monday" → due_date: "2025-12-09" (next Monday's date)

**Category Classification:****
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
   - CREATE: New task (no duplicate found, not related to previous notifications, AND is a direct action request)
   - SKIP: Not task-worthy (battery/system notifications, message counters, questions, casual chat, etc.) OR duplicate of existing pending task
   - EDIT: Update existing duplicate/similar task OR modification from same author
   - DELETE: Cancel/remove task
   - COMPLETE: Mark task as done

4. **Call the appropriate tool** (CRITICAL - DO NOT create tasks for notifications you want to ignore):
   - skip_notification() - **USE THIS for notifications that should NOT create tasks** (battery alerts, message counters, questions from others, duplicates, casual chat, etc.)
   - create_task_from_notification() - ONLY for explicit, direct action requests
   - edit_task() - for updates (you MUST provide the task ID from the existing tasks)
   - delete_task() - for cancellations
   - mark_task_complete() - for completions

5. **IMPORTANT**: If a notification does NOT meet the strict criteria for task creation, call skip_notification() with a reason. DO NOT create a task with title "Analyze and ignore notification" - that defeats the purpose!

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

      // Define MCP tools for function calling
      const tools = [
        {
          type: "function",
          function: {
            name: "create_task_from_notification",
            description: "Create a new task from a notification",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title (under 60 chars)" },
                description: { type: "string", description: "Detailed description" },
                category: { type: "string", enum: ["meetings", "finance", "shopping", "communication", "health", "general"] },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                due_date: { type: "string", description: "ISO 8601 date string (YYYY-MM-DD or full datetime) if task has a deadline" },
                source_app: { type: "string", description: "Source app package name" },
                notification_id: { type: "string", description: "Notification ID" }
              },
              required: ["title", "category", "priority", "source_app", "notification_id"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "skip_notification",
            description: "Skip/ignore a notification that does NOT require task creation. Use this for: battery notifications, message counters, system alerts, questions from others, past-tense actions, casual chat, or any notification that is not a direct action request.",
            parameters: {
              type: "object",
              properties: {
                notification_id: { type: "string", description: "Notification ID to skip" },
                reason: { type: "string", description: "Brief reason for skipping (e.g., 'battery notification', 'message counter', 'not actionable', 'casual conversation')" }
              },
              required: ["notification_id", "reason"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "edit_task",
            description: "Edit an existing task",
            parameters: {
              type: "object",
              properties: {
                task_id: { type: "string", description: "Task ID to edit" },
                title: { type: "string", description: "New task title" },
                description: { type: "string", description: "New description" },
                priority: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["task_id"]
            }
          }
        }
      ];

      // Call Azure AI Foundry REST API with tools
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
          tools: tools,
          tool_choice: "auto",
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
      const message = agentResponse.choices?.[0]?.message;
      
      console.log('[AI Agent] ========== AGENT RESPONSE ==========');
      console.log('[AI Agent] Has content:', !!message?.content);
      console.log('[AI Agent] Has tool_calls:', !!message?.tool_calls);
      console.log('[AI Agent] Number of tool calls:', message?.tool_calls?.length || 0);
      
      if (message?.tool_calls) {
        console.log('[AI Agent] Tool calls:', JSON.stringify(message.tool_calls, null, 2));
      } else {
        console.log('[AI Agent] No tool calls - agent returned text response');
        if (message?.content) {
          console.log('[AI Agent] Content preview:', message.content.substring(0, 200) + '...');
        }
      }
      console.log('[AI Agent] =========================================');

      // Execute tool calls
      if (message?.tool_calls && message.tool_calls.length > 0) {
        await this.executeToolCalls(message.tool_calls);
      } else {
        // No tool calls - agent ignored these notifications
        // Mark them as processed so they won't be reprocessed
        console.log('[AI Agent] No tool calls returned. Marking ignored notifications as processed.');
        for (const notification of notifications) {
          await this.markNotificationProcessed(notification.id);
        }
      }

      // Return processing results
      return {
        processed: notifications.length,
        tool_calls: message?.tool_calls?.length || 0,
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
   * Execute tool calls returned by the agent
   */
  async executeToolCalls(toolCalls) {
    console.log(`[AI Agent] Executing ${toolCalls.length} tool calls...`);
    
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`[AI Agent] Calling ${functionName} with:`, args);
      
      try {
        switch (functionName) {
          case 'skip_notification':
            await this.skipNotification(args);
            break;
          case 'create_task_from_notification':
            await this.createTask(args);
            break;
          case 'edit_task':
            await this.editTask(args);
            break;
          default:
            console.warn(`[AI Agent] Unknown function: ${functionName}`);
        }
      } catch (error) {
        console.error(`[AI Agent] Error executing ${functionName}:`, error);
      }
    }
  }

  /**
   * Skip a notification without creating a task
   */
  async skipNotification(params) {
    console.log(`[AI Agent] 🚫 Skipping notification ${params.notification_id}: ${params.reason}`);
    
    // Mark notification as processed
    await this.markNotificationProcessed(params.notification_id);
    
    console.log(`[AI Agent] ✅ Notification ${params.notification_id} skipped and marked as processed`);
  }

  /**
   * Create task in database
   */
  async createTask(params) {
    const request = new sql.Request();
    const taskId = require('crypto').randomUUID();
    
    request.input('id', sql.UniqueIdentifier, taskId);
    request.input('title', sql.NVarChar(500), params.title);
    request.input('description', sql.NVarChar(sql.MAX), params.description || '');
    request.input('category', sql.NVarChar(50), params.category || 'general');
    request.input('priority', sql.NVarChar(20), params.priority || 'medium');
    request.input('status', sql.NVarChar(20), 'pending');
    request.input('source_app', sql.NVarChar(100), params.source_app || '');
    request.input('source', sql.NVarChar(50), 'notification');
    request.input('created_at', sql.DateTime2(7), new Date());
    request.input('updated_at', sql.DateTime2(7), new Date());
    request.input('is_deleted', sql.Bit, 0);
    
    // Handle due_date if provided
    if (params.due_date) {
      try {
        const dueDate = new Date(params.due_date);
        if (!isNaN(dueDate.getTime())) {
          request.input('due_date', sql.DateTime2(7), dueDate);
        }
      } catch (e) {
        console.log(`[AI Agent] Invalid due_date: ${params.due_date}`);
      }
    }

    const query = params.due_date ? `
      INSERT INTO Tasks (
        id, title, description, category, priority, status,
        source_app, source, created_at, updated_at, is_deleted,
        LocationDependent, TimeDependent, WeatherDependent, due_date
      ) VALUES (
        @id, @title, @description, @category, @priority, @status,
        @source_app, @source, @created_at, @updated_at, @is_deleted,
        0, 0, 0, @due_date
      )
    ` : `
      INSERT INTO Tasks (
        id, title, description, category, priority, status,
        source_app, source, created_at, updated_at, is_deleted,
        LocationDependent, TimeDependent, WeatherDependent
      ) VALUES (
        @id, @title, @description, @category, @priority, @status,
        @source_app, @source, @created_at, @updated_at, @is_deleted,
        0, 0, 0
      )
    `;

    await request.query(query);

    console.log(`[AI Agent] ✅ Created task: ${params.title}`);
    
    // Mark notification as processed
    if (params.notification_id) {
      await this.markNotificationProcessed(params.notification_id);
    }
  }

  /**
   * Edit task in database
   */
  async editTask(params) {
    const request = new sql.Request();
    
    request.input('id', sql.UniqueIdentifier, params.task_id);
    request.input('updated_at', sql.DateTime2(7), new Date());
    
    const updates = [];
    if (params.title) {
      request.input('title', sql.NVarChar(500), params.title);
      updates.push('title = @title');
    }
    if (params.description) {
      request.input('description', sql.NVarChar(sql.MAX), params.description);
      updates.push('description = @description');
    }
    if (params.priority) {
      request.input('priority', sql.NVarChar(20), params.priority);
      updates.push('priority = @priority');
    }
    
    updates.push('updated_at = @updated_at');
    
    await request.query(`
      UPDATE Tasks 
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    console.log(`[AI Agent] ✅ Edited task: ${params.task_id}`);
    
    // Mark notification as processed
    if (params.notification_id) {
      await this.markNotificationProcessed(params.notification_id);
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
        // Partition key is /polihack
        await container.item(notification.id, notification.polihack).delete();
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
   * Generate search queries for tasks that need location data
   */
  async generateSearchQueriesForTasks(limit = 5) {
    try {
      console.log('\n========== AI AGENT SEARCH QUERY GENERATION ==========');
      
      // 1. Get tasks without location data from SQL directly
      const sql = require('mssql');
      const request = new sql.Request();
      request.input('limit', sql.Int, limit);
      
      const result = await request.query(`
        SELECT TOP (@limit) t.id, t.title, t.description, t.category, t.priority, t.status, t.created_at
        FROM Tasks t
        LEFT JOIN TaskLocations tl ON t.id = tl.task_id
        WHERE t.is_deleted = 0 
          AND t.status != 'completed'
          AND tl.task_id IS NULL
        ORDER BY t.created_at DESC
      `);
      
      const tasks = result.recordset || [];
      
      if (tasks.length === 0) {
        console.log('[AI Agent] No tasks need location data');
        return { processed: 0, message: 'No tasks to process' };
      }

      console.log(`[AI Agent] Found ${tasks.length} tasks needing search queries`);

      // 2. For each task, ask agent to generate optimal search query
      let generated = 0;
      for (const task of tasks) {
        console.log(`[AI Agent] Generating search query for: "${task.title}"`);
        
        const systemPrompt = `You are a search query optimization assistant. Your job is to generate the BEST Google Maps/Places API search query for a given task.

RULES:
- Analyze the task title, description, and category
- **IMPORTANT: If the task mentions a specific business/location name, INCLUDE IT in the search query**
- Generate a short, specific search term (1-4 words)
- Focus on place types, not actions
- Examples: 
  * "grocery store" (generic)
  * "Lidl supermarket" (if "Lidl" is mentioned in task)
  * "Cloudflight office" (if "Cloudflight office" is mentioned)
  * "Starbucks coffee" (if "Starbucks" is mentioned)
  * "pharmacy" (generic)
- Do NOT include verbs like "buy", "get", "find", "go to"
- Do NOT include quantities or specific items to purchase
- Be concise and clear
- Preserve proper nouns and brand names

SPECIFIC LOCATION NAME HANDLING:
- "go to Cloudflight office" → "Cloudflight office"
- "buy groceries at Lidl" → "Lidl supermarket"
- "get coffee from Starbucks" → "Starbucks"
- "visit Rosa restaurant" → "Rosa restaurant"
- "buy shaorma from Rosa" → "Rosa restaurant"
- "go to office" → "office" (generic, no specific name)

You MUST call the function generate_search_query_for_task with your optimized query.`;

        const userPrompt = `Task: "${task.title}"
Description: "${task.description || 'N/A'}"
Category: ${task.category || 'N/A'}

Generate the best Google Maps search query for this task.`;

        const tools = [
          {
            type: "function",
            function: {
              name: "generate_search_query_for_task",
              description: "Store the optimized search query for a task",
              parameters: {
                type: "object",
                properties: {
                  task_id: { type: "string", description: "Task UUID" },
                  search_query: { type: "string", description: "Optimized search query (e.g., 'grocery store', 'pharmacy')" }
                },
                required: ["task_id", "search_query"]
              }
            }
          }
        ];

        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(`${this.agentEndpoint}/openai/deployments/${this.agentDeploymentName}/chat/completions?api-version=2024-08-01-preview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': this.agentApiKey
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              tools: tools,
              tool_choice: { type: "function", function: { name: "generate_search_query_for_task" } },
              temperature: 0.3, // Lower temperature for more consistent results
              max_tokens: 500
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI Agent] API Error:', response.status, errorText);
            continue;
          }

          const agentResponse = await response.json();
          const message = agentResponse.choices?.[0]?.message;
          
          if (message?.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            const args = JSON.parse(toolCall.function.arguments);
            const searchQuery = args.search_query;
            
            // Store the search query in TaskLocations as a marker
            const sql = require('mssql');
            const request = new sql.Request();
            request.input('task_id', sql.UniqueIdentifier, task.id);
            request.input('search_query', sql.NVarChar(255), searchQuery);
            
            await request.query(`
              INSERT INTO TaskLocations (
                task_id, name, address, latitude, longitude, 
                place_id, rating, is_open, distance_meters
              ) VALUES (
                @task_id, 'SEARCH_QUERY_GENERATED', @search_query, 0, 0, 
                'PENDING_LOCATION_SYNC', 0, 0, 0
              )
            `);
            
            console.log(`[AI Agent] ✅ Generated query "${searchQuery}" for task ${task.id}`);
            generated++;
          } else {
            console.log(`[AI Agent] ⚠️ No tool call returned for task ${task.id}`);
          }
        } catch (error) {
          console.error(`[AI Agent] Error generating query for task ${task.id}:`, error.message);
        }
      }

      console.log(`[AI Agent] Search query generation complete: ${generated}/${tasks.length}`);
      console.log('======================================================\n');

      return { processed: tasks.length, generated };

    } catch (error) {
      console.error('[AI Agent] Search query generation error:', error);
      return { processed: 0, generated: 0, error: error.message };
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
