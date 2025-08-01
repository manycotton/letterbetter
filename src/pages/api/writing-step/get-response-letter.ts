import { NextApiRequest, NextApiResponse } from 'next';
import { getResponseLetterByLetter, getResponseLetterBySessionId } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { letterId, sessionId } = req.query;

    if (!letterId && !sessionId) {
      return res.status(400).json({ 
        message: 'Missing required parameter: letterId or sessionId' 
      });
    }

    let responseLetterData = null;
    
    if (letterId && typeof letterId === 'string') {
      responseLetterData = await getResponseLetterByLetter(letterId);
    } else if (sessionId && typeof sessionId === 'string') {
      // Get response letter directly by sessionId
      responseLetterData = await getResponseLetterBySessionId(sessionId);
    }

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