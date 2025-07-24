import { NextApiRequest, NextApiResponse } from 'next';
import { listReflectionSessions, getReflectionItem } from '../../../lib/database';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API: Testing listReflectionSessions function...');
    const sessions = await listReflectionSessions();
    
    // Test getReflectionItem and raw Redis data
    if (sessions.length > 0) {
      const firstSessionId = sessions[0].replace('session_reflection:', '');
      console.log(`=== TESTING getReflectionItem for session: ${firstSessionId} ===`);
      try {
        // Try to get reflection item with ID 1753282523676 from session 1753281769014:ocjgaaxg1
        if (firstSessionId === '1753281769014:ocjgaaxg1') {
          // Get raw Redis data
          const rawData = await redis.hgetall('session_reflection:1753281769014:ocjgaaxg1');
          console.log('Raw Redis data:', rawData);
          
          const item = await getReflectionItem('1753282523676', firstSessionId);
          console.log('Retrieved item:', item);
          console.log('Item blameCheckResult:', item?.blameCheckResult);
        }
      } catch (error) {
        console.log('Error getting reflection item:', error);
      }
    }
    
    // Extract session IDs from the full keys for better readability
    const sessionData = sessions.map(sessionKey => ({
      fullKey: sessionKey,
      sessionId: sessionKey.replace('session_reflection:', '')
    }));
    
    // Get raw Redis data for the first session to include in response
    let rawRedisData = null;
    if (sessions.length > 0) {
      const sessionId = sessions[0].replace('session_reflection:', '');
      // Get from individual reflection items structure
      const itemKeys = await redis.keys(`session_reflection:${sessionId}:*`);
      if (itemKeys.length > 0) {
        // Get the first item as sample
        rawRedisData = await redis.hgetall(itemKeys[0]);
      }
    }
    
    const response = {
      success: true,
      totalSessions: sessions.length,
      sessions: sessionData,
      message: sessions.length > 0 ? 
        `Found ${sessions.length} reflection session(s)` : 
        'No reflection sessions found in the database',
      debugNote: 'Check server console for detailed debug logs from getReflectionItem function',
      rawRedisDataSample: rawRedisData
    };
    
    console.log('API Response:', response);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error in debug-reflection-sessions API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to list reflection sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}