import { NextApiRequest, NextApiResponse } from 'next';
import { updateReflectionItem, getReflectionItem } from '../../../lib/database';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const testSessionId = '1753281769014:ocjgaaxg1';
    const testReflectionId = '1753282523676';
    
    // Get current item
    const before = await getReflectionItem(testReflectionId, testSessionId);
    
    // Test direct update with simple data
    const testUpdates = {
      blameCheckResult: { hasBlamePattern: true, warning: 'Direct test warning' },
      emotionCheckResult: { hasEmotion: true, suggestion: 'Direct test suggestion' }
    };
    
    console.log('=== DIRECT UPDATE TEST ===');
    console.log('Updates to apply:', testUpdates);
    
    // Apply update
    const updatedItem = await updateReflectionItem(testReflectionId, testSessionId, testUpdates);
    
    // Get item again to verify
    const after = await getReflectionItem(testReflectionId, testSessionId);
    
    // Get raw Redis data for comparison
    const rawRedisData = await redis.hgetall(`session_reflection:${testSessionId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Direct update test completed',
      test: {
        testUpdates,
        before: {
          id: before?.id,
          blameCheckResult: before?.blameCheckResult,
          emotionCheckResult: before?.emotionCheckResult,
          updatedAt: before?.updatedAt
        },
        updatedItemReturned: {
          id: updatedItem.id,
          blameCheckResult: updatedItem.blameCheckResult,
          emotionCheckResult: updatedItem.emotionCheckResult,
          updatedAt: updatedItem.updatedAt
        },
        after: {
          id: after?.id,
          blameCheckResult: after?.blameCheckResult,
          emotionCheckResult: after?.emotionCheckResult,
          updatedAt: after?.updatedAt
        },
        rawRedisData: {
          blameCheckResult: rawRedisData?.blameCheckResult,
          emotionCheckResult: rawRedisData?.emotionCheckResult,
          blameCheckResultType: typeof rawRedisData?.blameCheckResult,
          emotionCheckResultType: typeof rawRedisData?.emotionCheckResult
        }
      }
    });
    
  } catch (error) {
    console.error('Error in direct update test:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
  }
}