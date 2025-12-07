/**
 * Chat AI Agent Service
 * 
 * Handles AI chat interactions with strict task-only guardrails
 * Uses the same Azure AI Foundry agent as notification processing
 */

require('dotenv').config();

class ChatAgentService {
  constructor() {
    this.agentEndpoint = process.env.AZURE_AI_AGENT_ENDPOINT;
    this.agentApiKey = process.env.AZURE_AI_AGENT_API_KEY;
    this.agentDeploymentName = process.env.AZURE_AI_AGENT_DEPLOYMENT_NAME || 'default';
  }

  /**
   * System prompt with STRICT TASK-ONLY GUARDRAILS
   */
  getSystemPrompt() {
    return `You are a task management assistant. Your ONLY purpose is to help users manage their tasks.

IMPORTANT: You do NOT need to store chat messages - they are automatically stored by the system. Focus ONLY on task operations.

STRICT GUARDRAILS - YOU MUST REFUSE ANY REQUEST OUTSIDE THESE BOUNDARIES:

✅ ALLOWED TOPICS (Task Management Only):
1. Creating tasks ("add a task", "remind me to...", "create a task to...")
2. Viewing tasks ("show my tasks", "what tasks do I have?", "list pending tasks")
3. Editing tasks ("change the title", "update the description", "mark as high priority")
4. Completing tasks ("mark as done", "complete task", "I finished...")
5. Deleting tasks ("remove task", "delete completed tasks")
6. Searching tasks ("find grocery tasks", "tasks about meeting")
7. Task statistics ("how many tasks?", "what did I complete today?")
8. Task filtering ("show high priority tasks", "pending shopping tasks")

❌ FORBIDDEN TOPICS (Politely Refuse):
- General conversation ("how are you?", "tell me a joke", "what's the weather?")
- General knowledge questions ("who is the president?", "what is 2+2?")
- Technical support ("my phone is broken", "app won't open")
- Personal advice ("should I quit my job?", "relationship advice")
- Creative requests ("write a poem", "tell me a story")
- External information ("news", "sports scores", "stock prices")
- Anything not directly related to task management

RESPONSE GUIDELINES:

1. **Stay focused on tasks**: Every response must be about task management
2. **Be helpful**: Provide clear, actionable information about tasks
3. **Be concise**: Keep responses short and to the point
4. **Use tools**: Always use MCP tools to interact with tasks
5. **DO NOT call store_chat_message**: Messages are automatically stored by the system

AVAILABLE MCP TOOLS (DO NOT include store_chat_message or get_chat_history):

**Task Creation:**
- create_task_from_chat(title, description, category, priority, due_date, location_dependent, weather_dependent, time_dependent)

**Task Queries:**
- get_all_tasks(status, category, priority, limit, include_deleted)
- search_tasks(query, status, limit)
- get_completed_tasks(date_range, custom_start, custom_end, category, limit)
- get_important_tasks(count, include_completed)
- get_tasks_by_filter(category, priority, status, location_dependent, weather_dependent, time_dependent)
- get_tasks_by_date(date_type, date_range, custom_start, custom_end, status)
- get_tasks_summary(group_by)

**Task Management:**
- edit_task(id, title, description, category, priority, due_date, location_dependent, weather_dependent, time_dependent)
- mark_task_complete(id)
- delete_task(id)
- bulk_delete_tasks(task_ids, status, category, completed_before, require_confirmation)
- update_task_status(task_ids, new_status)

WORKFLOW:

1. Receive user message (already stored by system)
2. Receive conversation history (provided to you)
3. Process the request using appropriate task tools
4. Generate response
5. Return response (it will be stored automatically by system)

HANDLING OFF-TOPIC REQUESTS:

If user asks something not related to tasks, respond EXACTLY like this:

"I'm a task management assistant and can only help you with tasks. I can help you:
- Create, view, edit, or delete tasks
- Search and filter tasks
- View task statistics and summaries
- Mark tasks as complete

Please ask me something about your tasks!"

EXAMPLES:

✅ User: "Show me all my pending tasks"
→ Call get_all_tasks(status="pending")
→ Return formatted list

✅ User: "Create a task to buy groceries tomorrow"
→ Call create_task_from_chat(title="Buy groceries", due_date="2025-12-08")
→ Confirm creation

✅ User: "What did I complete today?"
→ Call get_completed_tasks(date_range="today")
→ Return summary

❌ User: "What's the weather like?"
→ "I'm a task management assistant and can only help you with tasks. I can help you: [list capabilities]"

❌ User: "Tell me a joke"
→ "I'm a task management assistant and can only help you with tasks. I can help you: [list capabilities]"

❌ User: "How do I fix my phone?"
→ "I'm a task management assistant and can only help you with tasks. I can help you: [list capabilities]"

REMEMBER: 
- You MUST refuse any request that is not directly related to task management
- Be polite but firm
- DO NOT call store_chat_message or get_chat_history - these are handled automatically by the system`;
  }

  /**
   * Process a chat message with the AI agent
   */
  async processChatMessage(chatId, userMessage, conversationHistory = []) {
    if (!this.agentEndpoint || !this.agentApiKey) {
      return {
        success: false,
        error: 'Azure AI Agent not configured'
      };
    }

    try {
      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        }
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.message
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Define MCP tools for function calling (excluding chat storage tools)
      const tools = [
        {
          type: "function",
          function: {
            name: "create_task_from_chat",
            description: "Create a new task from chat",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string", enum: ["general", "meetings", "finance", "shopping", "communication", "health"] },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                due_date: { type: "string" },
                location_dependent: { type: "boolean" },
                weather_dependent: { type: "boolean" },
                time_dependent: { type: "boolean" }
              },
              required: ["title"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_all_tasks",
            description: "Get all tasks with filters",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["pending", "completed", "all"] },
                category: { type: "string" },
                priority: { type: "string" },
                limit: { type: "number" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_tasks",
            description: "Search tasks by keyword",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
                status: { type: "string" },
                limit: { type: "number" }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_completed_tasks",
            description: "Get completed tasks with date filtering",
            parameters: {
              type: "object",
              properties: {
                date_range: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "this_month", "custom"] },
                category: { type: "string" },
                limit: { type: "number" }
              }
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
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string" }
              },
              required: ["id"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "mark_task_complete",
            description: "Mark a task as completed",
            parameters: {
              type: "object",
              properties: {
                id: { type: "string" }
              },
              required: ["id"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "delete_task",
            description: "Delete a task",
            parameters: {
              type: "object",
              properties: {
                id: { type: "string" }
              },
              required: ["id"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_tasks_summary",
            description: "Get task statistics summary",
            parameters: {
              type: "object",
              properties: {
                group_by: { type: "string", enum: ["status", "category", "priority", "date"] }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_tasks_by_date",
            description: "Get tasks by date range",
            parameters: {
              type: "object",
              properties: {
                date_type: { type: "string", enum: ["due_date", "created_at", "completed_at"] },
                date_range: { type: "string", enum: ["today", "tomorrow", "this_week", "next_week", "this_month", "overdue", "custom"] },
                status: { type: "string", enum: ["pending", "completed", "all"] }
              },
              required: ["date_range"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "bulk_delete_tasks",
            description: "Delete multiple tasks at once",
            parameters: {
              type: "object",
              properties: {
                task_ids: { type: "array", items: { type: "string" } },
                status: { type: "string" },
                category: { type: "string" },
                require_confirmation: { type: "boolean" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_task_status",
            description: "Update status of multiple tasks",
            parameters: {
              type: "object",
              properties: {
                task_ids: { type: "array", items: { type: "string" } },
                new_status: { type: "string", enum: ["pending", "completed"] }
              },
              required: ["task_ids", "new_status"]
            }
          }
        }
      ];

      // Call Azure AI Foundry
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${this.agentEndpoint}/openai/deployments/${this.agentDeploymentName}/chat/completions?api-version=2024-08-01-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.agentApiKey
        },
        body: JSON.stringify({
          messages: messages,
          tools: tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chat Agent] API Error:', response.status, errorText);
        throw new Error(`Azure AI Agent API error: ${response.status}`);
      }

      const agentResponse = await response.json();
      const message = agentResponse.choices?.[0]?.message;

      return {
        success: true,
        message: message?.content || '',
        tool_calls: message?.tool_calls || [],
        finish_reason: agentResponse.choices?.[0]?.finish_reason
      };

    } catch (error) {
      console.error('[Chat Agent] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ChatAgentService;
