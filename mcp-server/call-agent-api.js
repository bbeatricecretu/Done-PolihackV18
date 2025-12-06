/**
 * Call Azure AI Foundry Agent API directly
 * This script demonstrates how to call the agent with MCP tools
 */

require('dotenv').config();
const fetch = require('node-fetch');

const AGENT_ENDPOINT = process.env.AZURE_AI_AGENT_ENDPOINT;
const AGENT_API_KEY = process.env.AZURE_AI_AGENT_API_KEY;
const DEPLOYMENT_NAME = process.env.AZURE_AI_AGENT_DEPLOYMENT_NAME;

async function callAgent(userMessage, systemPrompt = null) {
  if (!AGENT_ENDPOINT || !AGENT_API_KEY || !DEPLOYMENT_NAME) {
    console.error('❌ Missing Azure AI configuration in .env');
    console.error('Required: AZURE_AI_AGENT_ENDPOINT, AZURE_AI_AGENT_API_KEY, AZURE_AI_AGENT_DEPLOYMENT_NAME');
    process.exit(1);
  }

  const url = `${AGENT_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-08-01-preview`;

  const messages = [];
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  messages.push({
    role: 'user',
    content: userMessage
  });

  console.log('\n🤖 Calling Azure AI Agent...');
  console.log(`📍 Endpoint: ${AGENT_ENDPOINT}`);
  console.log(`📦 Deployment: ${DEPLOYMENT_NAME}`);
  console.log(`💬 Message: ${userMessage.substring(0, 100)}...`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AGENT_API_KEY
      },
      body: JSON.stringify({
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_notifications',
              description: 'Get unprocessed notifications from CosmosDB',
              parameters: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Maximum number of notifications to retrieve'
                  }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_task_from_notification',
              description: 'Create a task from notification data',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Task title' },
                  description: { type: 'string', description: 'Task description' },
                  category: { 
                    type: 'string', 
                    enum: ['general', 'meetings', 'finance', 'shopping', 'communication', 'health'],
                    description: 'Task category'
                  },
                  priority: { 
                    type: 'string', 
                    enum: ['low', 'medium', 'high'],
                    description: 'Task priority'
                  },
                  source_app: { type: 'string', description: 'Source app' },
                  notification_id: { type: 'string', description: 'Notification ID' }
                },
                required: ['title']
              }
            }
          }
        ],
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Response received!\n');
    console.log('📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;

  } catch (error) {
    console.error('❌ Error calling agent:', error.message);
    throw error;
  }
}

// Example usage
async function main() {
  const systemPrompt = `You are an intelligent task management assistant. 
You have access to MCP tools for managing tasks and notifications.
When asked to process notifications, use get_notifications() to retrieve them,
then create tasks using create_task_from_notification().`;

  const userMessage = `Check for new notifications and create tasks for any important ones. 
Process up to 5 notifications.`;

  try {
    await callAgent(userMessage, systemPrompt);
  } catch (error) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { callAgent };
