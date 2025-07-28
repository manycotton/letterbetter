import { NextApiRequest, NextApiResponse } from 'next';
import { getUnderstandingSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const understandingSession = await getUnderstandingSession(sessionId);

    if (!understandingSession) {
      return res.status(404).json({ message: 'Understanding session not found' });
    }

    res.status(200).json({
      understandingSession
    });

  } catch (error) {
    console.error('Error fetching understanding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}