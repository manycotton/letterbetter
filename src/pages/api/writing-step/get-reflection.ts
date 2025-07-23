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

    const reflectionData = await getReflectionStepData(sessionId);

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