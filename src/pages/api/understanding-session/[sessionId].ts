import { NextApiRequest, NextApiResponse } from 'next';
import { getUnderstandingSession } from '../../../../lib/database';

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

    const session = await getUnderstandingSession(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false,
        message: 'Understanding session not found' 
      });
    }

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Error fetching understanding session:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error' 
    });
  }
}
