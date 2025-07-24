// Simple test script to list reflection sessions
// Note: For a TypeScript project, it's better to use the API endpoint instead
// This script is provided as an alternative approach

console.log('For a TypeScript Next.js project, it\'s recommended to test via the API endpoint:');
console.log('1. Start the development server: npm run dev');
console.log('2. Visit: http://localhost:3000/api/debug-reflection-sessions');
console.log('3. Or use curl: curl http://localhost:3000/api/debug-reflection-sessions');
console.log('');
console.log('This will call the listReflectionSessions function and display all Redis keys matching "session_reflection:*"');

// Alternative: Direct database call (requires proper TypeScript compilation)
/*
const { listReflectionSessions } = require('./lib/database.ts');

async function testListReflectionSessions() {
  try {
    console.log('Testing listReflectionSessions function...');
    const sessions = await listReflectionSessions();
    
    console.log('\n=== RESULTS ===');
    console.log(`Total reflection sessions found: ${sessions.length}`);
    
    if (sessions.length > 0) {
      console.log('\nSession IDs:');
      sessions.forEach((sessionKey, index) => {
        // Extract just the session ID from the full key
        const sessionId = sessionKey.replace('session_reflection:', '');
        console.log(`${index + 1}. ${sessionId} (full key: ${sessionKey})`);
      });
    } else {
      console.log('No reflection sessions found in the database.');
    }
    
  } catch (error) {
    console.error('Error testing reflection sessions:', error);
  }
}

// Run the test
testListReflectionSessions();
*/