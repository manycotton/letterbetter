import { NextApiRequest, NextApiResponse } from 'next';
import { getReflectionStepData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ 
        message: 'Missing required field: sessionId' 
      });
    }

    console.log('=== GET REFLECTION API CALLED ===');
    console.log('SessionId received:', sessionId);
    
    const reflectionData = await getReflectionStepData(sessionId);
    
    console.log('=== REFLECTION DATA RETRIEVED ===');
    console.log('Data keys:', reflectionData ? Object.keys(reflectionData) : 'null');
    if (reflectionData && reflectionData.reflectionItems) {
      console.log('Reflection items count:', reflectionData.reflectionItems.length);
      reflectionData.reflectionItems.forEach((item: any, index: number) => {
        console.log(`Item ${index} blameCheckResult:`, item.blameCheckResult);
      });
    }

    if (!reflectionData) {
      return res.status(404).json({ 
        message: 'No reflection data found for this session',
        allGeneratedHints: [],
        reflectionItems: [],
        selectedHintTags: []
      });
    }

    res.status(200).json(reflectionData);

  } catch (error) {
    console.error('Error getting reflection step data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}