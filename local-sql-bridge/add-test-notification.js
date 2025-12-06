/**
 * Add Test Notification to CosmosDB
 * 
 * Run with: node add-test-notification.js
 */

require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const crypto = require('crypto');

const testNotifications = [
  {
    appName: 'com.google.calendar',
    title: 'Meeting Reminder',
    content: 'Team standup meeting at 10:00 AM tomorrow',
    category: 'meetings'
  },
  {
    appName: 'com.whatsapp',
    title: 'John Doe',
    content: 'Hey, can you call me back about the project deadline?',
    category: 'communication'
  },
  {
    appName: 'com.banking.app',
    title: 'Payment Due',
    content: 'Your credit card payment of $150 is due on December 10th',
    category: 'finance'
  },
  {
    appName: 'com.instagram',
    title: 'Instagram',
    content: 'sarah_jones liked your photo',
    category: 'social' // Should be ignored
  },
  {
    appName: 'com.reminder.app',
    title: 'Shopping List',
    content: 'Don\'t forget to buy groceries: milk, eggs, bread',
    category: 'shopping'
  }
];

// Notifications that demonstrate context-aware editing
const contextTestNotifications = [
  {
    appName: 'com.messages',
    title: 'Mom',
    content: 'Buy milk on your way home',
    category: 'shopping',
    waitSeconds: 0
  },
  {
    appName: 'com.messages',
    title: 'Mom',
    content: 'Actually, don\'t buy milk, buy eggs instead',
    category: 'shopping-edit',
    waitSeconds: 5 // Wait 5 seconds to simulate time passing
  },
  {
    appName: 'com.calendar.app',
    title: 'Calendar Reminder',
    content: 'Dentist appointment Friday at 2pm',
    category: 'meetings',
    waitSeconds: 0
  },
  {
    appName: 'com.calendar.app',
    title: 'Calendar Update',
    content: 'Dentist appointment cancelled',
    category: 'meetings-cancel',
    waitSeconds: 5
  },
  {
    appName: 'com.delivery',
    title: 'Package Delivery',
    content: 'Your package will arrive today, please be home',
    category: 'general',
    waitSeconds: 0
  },
  {
    appName: 'com.delivery',
    title: 'Package Delivered',
    content: 'Package has been delivered to your door',
    category: 'general-complete',
    waitSeconds: 5
  }
];

// Notifications that demonstrate duplicate detection
const duplicateTestNotifications = [
  {
    appName: 'com.calendar.work',
    title: 'Work Calendar',
    content: 'Meeting with CEO at 10am tomorrow',
    category: 'meetings',
    waitSeconds: 0
  },
  {
    appName: 'com.calendar.work',
    title: 'Calendar Update',
    content: 'CEO meeting rescheduled to 10:30am tomorrow',
    category: 'meetings-duplicate-edit',
    waitSeconds: 5
  },
  {
    appName: 'com.email.work',
    title: 'Work Email',
    content: 'Team standup meeting Friday at 2pm in conference room A',
    category: 'meetings',
    waitSeconds: 0
  },
  {
    appName: 'com.slack',
    title: 'Slack - #general',
    content: 'Reminder: team standup tomorrow 2pm, room A changed to room B',
    category: 'meetings-duplicate-edit',
    waitSeconds: 5
  },
  {
    appName: 'com.shopping.app',
    title: 'Shopping List',
    content: 'Buy groceries this week',
    category: 'shopping',
    waitSeconds: 0
  },
  {
    appName: 'com.shopping.app',
    title: 'Shopping List',
    content: 'Grocery list: milk, eggs, bread, coffee',
    category: 'shopping-duplicate-edit',
    waitSeconds: 5
  },
  {
    appName: 'com.reminder',
    title: 'Reminder',
    content: 'Call dentist to schedule appointment',
    category: 'communication',
    waitSeconds: 0
  },
  {
    appName: 'com.reminder',
    title: 'Reminder',
    content: 'Dentist appointment confirmed for next Tuesday 3pm',
    category: 'communication-duplicate-edit',
    waitSeconds: 5
  }
];

async function addTestNotifications() {
  console.log('📝 Adding Test Notifications to CosmosDB\n');
  console.log('='.repeat(60));

  // Check configuration
  if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
    console.error('❌ CosmosDB not configured in .env');
    console.error('Please set COSMOS_ENDPOINT and COSMOS_KEY');
    return;
  }

  const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);

    console.log(`\n✓ Connected to CosmosDB`);
    console.log(`  Database: ${process.env.COSMOS_DATABASE}`);
    console.log(`  Container: ${process.env.COSMOS_CONTAINER}\n`);

    // Ask user which notifications to add
    console.log('Available test notifications:\n');
    testNotifications.forEach((n, i) => {
      console.log(`  ${i + 1}. [${n.appName}]`);
      console.log(`     Title: ${n.title}`);
      console.log(`     Content: ${n.content}`);
      console.log(`     Expected: ${n.category === 'social' ? '❌ Ignore' : '✅ Create Task'}\n`);
    });

    console.log('\n📝 Select test mode:');
    console.log('  1 - Basic notifications (5 simple notifications)');
    console.log('  2 - Context-aware test (demonstrates task editing/cancellation)');
    console.log('  3 - Duplicate detection test (demonstrates preventing duplicate tasks)');
    console.log('  4 - All tests\n');

    // For automation, default to option 4
    const mode = process.argv[2] || '4';
    
    let notificationsToAdd = [];
    
    if (mode === '1' || mode === '4') {
      notificationsToAdd.push(...testNotifications);
    }
    
    if (mode === '2' || mode === '4') {
      notificationsToAdd.push(...contextTestNotifications);
    }

    if (mode === '3' || mode === '4') {
      notificationsToAdd.push(...duplicateTestNotifications);
    }

    console.log(`Adding ${notificationsToAdd.length} test notifications...\n`);

    let addedCount = 0;
    for (const testNotif of notificationsToAdd) {
      // Wait if specified (for context tests)
      if (testNotif.waitSeconds && testNotif.waitSeconds > 0) {
        console.log(`  ⏳ Waiting ${testNotif.waitSeconds} seconds (simulating time between notifications)...`);
        await new Promise(resolve => setTimeout(resolve, testNotif.waitSeconds * 1000));
      }

      const notification = {
        id: crypto.randomUUID(),
        appName: testNotif.appName,
        title: testNotif.title,
        content: testNotif.content,
        timestamp: new Date().toISOString(),
        processed: false,
        created_at: new Date().toISOString(),
        related_task_id: null
      };

      await container.items.create(notification);
      
      const action = testNotif.category.includes('edit') ? '✏️  EDIT' :
                     testNotif.category.includes('cancel') ? '🗑️  DELETE' :
                     testNotif.category.includes('complete') ? '✅ COMPLETE' :
                     testNotif.category === 'social' ? '❌ IGNORE' : '➕ CREATE';
      
    console.log('='.repeat(60));
    console.log(`\n✅ Successfully added ${addedCount} test notifications!`);
    
    if (mode === '2' || mode === '4') {
      console.log('\n🔍 Context-Aware Test Scenarios:');
      console.log('  1. "Buy milk" → "Don\'t buy milk, buy eggs" (Should EDIT task)');
      console.log('  2. "Dentist appointment" → "Appointment cancelled" (Should DELETE task)');
      console.log('  3. "Package arriving" → "Package delivered" (Should COMPLETE task)');
    }

    if (mode === '3' || mode === '4') {
      console.log('\n🔍 Duplicate Detection Test Scenarios:');
      console.log('  1. "CEO meeting 10am" → "CEO meeting 10:30am" (Should EDIT, not create duplicate)');
      console.log('  2. "Team standup Friday 2pm" → "Standup tomorrow 2pm room B" (Should EDIT location)');
      console.log('  3. "Buy groceries" → "Groceries: milk, eggs, bread" (Should EDIT with details)');
      console.log('  4. "Call dentist" → "Dentist confirmed Tuesday 3pm" (Should EDIT with appointment)');
    }
    
    console.log('\nNext steps:');
    console.log('1. Run: node test-ai-agent.js');
    console.log('   OR');
    console.log('2. Call: POST http://localhost:3000/api/process-notifications\n');
    
    console.log('\nNext steps:');
    console.log('1. Run: node test-ai-agent.js');
    console.log('   OR');
    console.log('2. Call: POST http://localhost:3000/api/process-notifications\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addTestNotifications();
