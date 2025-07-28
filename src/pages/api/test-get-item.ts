import { NextApiRequest, NextApiResponse } from 'next';
import { getReflectionItem } from '../../../lib/database';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const testSessionId = '1753281769014:ocjgaaxg1';
    const testReflectionId = '1753282523676';
    
    console.log('=== MANUAL TEST: Getting reflection item ===');
    
    // Get raw Redis data first
    const rawData = await redis.hgetall(`session_reflection:${testSessionId}`);
    console.log('Raw Redis data types:', {
      blameCheckResult: typeof rawData?.blameCheckResult,
      emotionCheckResult: typeof rawData?.emotionCheckResult
    });
    
    // Get the reflection item using our function
    const item = await getReflectionItem(testReflectionId, testSessionId);
    
    console.log('Retrieved item result:', {
      id: item?.id,
      blameCheckResult: item?.blameCheckResult,
      emotionCheckResult: item?.emotionCheckResult,
      blameCheckResultType: typeof item?.blameCheckResult,
      emotionCheckResultType: typeof item?.emotionCheckResult
    });
    
    return res.status(200).json({
      success: true,
      rawRedisTypes: {
        blameCheckResult: typeof rawData?.blameCheckResult,
        emotionCheckResult: typeof rawData?.emotionCheckResult
      },
      rawRedisValues: {
        blameCheckResult: rawData?.blameCheckResult,
        emotionCheckResult: rawData?.emotionCheckResult
      },
      retrievedItem: {
        id: item?.id,
        blameCheckResult: item?.blameCheckResult,
        emotionCheckResult: item?.emotionCheckResult,
        blameCheckResultType: typeof item?.blameCheckResult,
        emotionCheckResultType: typeof item?.emotionCheckResult
      }
    });
    
  } catch (error) {
    console.error('Error in get item test:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
  }
}