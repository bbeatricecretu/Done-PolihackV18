/**
 * Test Script for AI Agent Integration
 * 
 * Run with: node test-ai-agent.js
 */

require('dotenv').config();
const AIAgentService = require('./ai-agent-service');

async function runTests() {
  console.log('🧪 Testing AI Agent Integration\n');
  console.log('='.repeat(50));
  
  const aiAgent = new AIAgentService();

  // Test 1: Check configuration
  console.log('\n📋 Test 1: Configuration Check');
  console.log('─'.repeat(50));
  console.log('Agent Endpoint:', aiAgent.agentEndpoint || '❌ NOT SET');
  console.log('Agent API Key:', aiAgent.agentApiKey ? '✓ Set' : '❌ NOT SET');
  console.log('Deployment Name:', aiAgent.agentDeploymentName);
  console.log('CosmosDB Client:', aiAgent.cosmosClient ? '✓ Connected' : '❌ NOT CONFIGURED');

  if (!aiAgent.agentEndpoint || !aiAgent.agentApiKey) {
    console.log('\n⚠️  Warning: Azure AI Agent not fully configured');
    console.log('Please set AZURE_AI_AGENT_ENDPOINT and AZURE_AI_AGENT_API_KEY in .env');
  }

  if (!aiAgent.cosmosClient) {
    console.log('\n❌ CosmosDB not configured. Cannot proceed with tests.');
    return;
  }

  // Test 2: Fetch notifications
  console.log('\n📬 Test 2: Fetch Unprocessed Notifications');
  console.log('─'.repeat(50));
  try {
    const notifications = await aiAgent.getUnprocessedNotifications(5);
    console.log(`Found ${notifications.length} unprocessed notifications:`);
    
    notifications.forEach((n, i) => {
      console.log(`\n  ${i + 1}. [${n.appName}] ${n.title}`);
      console.log(`     Content: ${n.content?.substring(0, 60)}${n.content?.length > 60 ? '...' : ''}`);
      console.log(`     Time: ${n.timestamp}`);
      console.log(`     ID: ${n.id}`);
    });

    if (notifications.length === 0) {
      console.log('\n  ℹ️  No unprocessed notifications found.');
      console.log('  Send a test notification from your mobile app first.');
      return;
    }

  } catch (error) {
    console.error('\n❌ Error fetching notifications:', error.message);
    return;
  }

  // Test 3: Process with AI Agent
  console.log('\n\n🤖 Test 3: Process Notifications with AI Agent');
  console.log('─'.repeat(50));
  
  if (!aiAgent.agentEndpoint || !aiAgent.agentApiKey) {
    console.log('⚠️  Skipping - Agent not configured');
    return;
  }

  console.log('Processing notifications with AI Agent...\n');
  
  try {
    const result = await aiAgent.processNotificationBatch(5);
    
    console.log('\n📊 Results:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Success: ${result.success}`);
    
    if (result.response) {
      console.log(`\n  Agent Response:\n  ${result.response}`);
    }
    
    if (result.tool_calls && result.tool_calls.length > 0) {
      console.log(`\n  Tool Calls Made: ${result.tool_calls.length}`);
      result.tool_calls.forEach((call, i) => {
        console.log(`    ${i + 1}. ${call.function.name}`);
      });
    }

    if (result.error) {
      console.log(`\n  ❌ Error: ${result.error}`);
    }

  } catch (error) {
    console.error('\n❌ Error processing with agent:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests Complete\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
