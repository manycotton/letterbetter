import { NextApiRequest, NextApiResponse } from 'next';
import { getResponseLetterData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ 
        message: 'Missing required parameter: sessionId' 
      });
    }

    const responseLetterData = await getResponseLetterData(sessionId);

    if (!responseLetterData) {
      return res.status(404).json({ 
        message: 'Response letter data not found' 
      });
    }

    res.status(200).json({ 
      message: 'Response letter data retrieved successfully',
      responseLetterData
    });

  } catch (error) {
    console.error('Error getting response letter data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}