const { listReflectionSessions, getReflectionStepData } = require('./lib/database');

async function debugRedis() {
  try {
    console.log('=== DEBUGGING REDIS SESSIONS ===');
    
    // List all reflection sessions
    const sessions = await listReflectionSessions();
    
    if (sessions.length === 0) {
      console.log('No reflection sessions found.');
      return;
    }
    
    console.log(`Found ${sessions.length} sessions:`);
    sessions.forEach(session => {
      const sessionId = session.replace('session_reflection:', '');
      console.log(`  - ${sessionId}`);
    });
    
    // Test getting data from the first session
    if (sessions.length > 0) {
      const firstSessionId = sessions[0].replace('session_reflection:', '');
      console.log(`\n=== TESTING SESSION: ${firstSessionId} ===`);
      
      const data = await getReflectionStepData(firstSessionId);
      console.log('Data keys:', data ? Object.keys(data) : 'null');
      
      if (data && data.reflectionItems) {
        console.log(`Found ${data.reflectionItems.length} reflection items`);
        data.reflectionItems.forEach((item, index) => {
          console.log(`Item ${index}:`);
          console.log(`  ID: ${item.id}`);
          console.log(`  Content: ${item.content?.substring(0, 50)}...`);
          console.log(`  blameCheckResult: ${JSON.stringify(item.blameCheckResult)}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugRedis();