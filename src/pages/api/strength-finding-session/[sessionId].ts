import { NextApiRequest, NextApiResponse } from 'next';
import { getStrengthFindingSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'Valid sessionId is required' 
      });
    }

    const session = await getStrengthFindingSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        message: 'Strength finding session not found' 
      });
    }

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Error fetching strength finding session:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
