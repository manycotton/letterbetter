import { NextApiRequest, NextApiResponse } from 'next';
import { getReflectionItemHistory } from '../../../lib/database';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for any history keys
    const historyKeys = await redis.keys('history:*');
    console.log('Found history keys:', historyKeys);
    
    let sampleHistory = null;
    if (historyKeys.length > 0) {
      // Get a sample history entry
      const sampleKey = historyKeys[0];
      sampleHistory = await redis.hgetall(sampleKey);
      console.log('Sample history data:', sampleHistory);
    }

    // Try to get history for a specific reflection ID
    const reflectionId = '1753335838357'; // From the session we found
    const history = await getReflectionItemHistory(reflectionId);
    console.log('History for reflection ID:', reflectionId, history);

    return res.status(200).json({
      success: true,
      totalHistoryKeys: historyKeys.length,
      historyKeys,
      sampleHistory,
      reflectionHistory: history,
      reflectionId
    });

  } catch (error) {
    console.error('Error in debug-history API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to debug history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}