import { NextApiRequest, NextApiResponse } from 'next';
import { getReflectionItem } from '../../../lib/database';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionId = '1753335840435:m6vgt0sef';
    const reflectionId = '1753335838357';
    
    // Get current reflection item
    const currentItem = await getReflectionItem(reflectionId, sessionId);
    console.log('Current reflection item:', currentItem);

    // Get raw Redis data for session_reflection
    const sessionKey = `session_reflection:${sessionId}:${reflectionId}`;
    const rawSessionData = await redis.hgetall(sessionKey);
    console.log('Raw session reflection data:', rawSessionData);

    return res.status(200).json({
      success: true,
      currentItem,
      rawSessionData,
      sessionKey
    });

  } catch (error) {
    console.error('Error in debug-current-reflection API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to debug current reflection',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
}