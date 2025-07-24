import { NextApiRequest, NextApiResponse } from 'next';
import { getReflectionSessionData } from '../../../../lib/database';

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
    
    const sessionData = await getReflectionSessionData(sessionId);
    
    console.log('=== REFLECTION DATA RETRIEVED ===');
    console.log('Session data keys:', sessionData ? Object.keys(sessionData) : 'null');
    if (sessionData && sessionData.items) {
      console.log('Reflection items count:', sessionData.items.length);
      sessionData.items.forEach((item: any, index: number) => {
        console.log(`Item ${index} blameCheckResult:`, item.blameCheckResult);
      });
    }

    if (!sessionData) {
      return res.status(404).json({ 
        message: 'No reflection data found for this session',
        allGeneratedHints: [],
        reflectionItems: [],
        selectedFactors: [],
        selectedHints: [],
        selectedHintTags: [] // Legacy support
      });
    }

    // Return both new and legacy formats for compatibility
    const responseData = {
      reflectionItems: sessionData.items,
      allGeneratedHints: sessionData.metadata.allGeneratedHints || [],
      selectedFactors: sessionData.metadata.selectedFactors || [],
      selectedHints: sessionData.metadata.selectedHints || [],
      selectedHintTags: sessionData.metadata.selectedHintTags || [], // Legacy support
      historyIds: sessionData.metadata.historyIds || []
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error getting reflection step data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}