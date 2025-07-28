import { NextApiRequest, NextApiResponse } from 'next';
import { getStrengthFindingSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const strengthFindingSession = await getStrengthFindingSession(sessionId);

    if (!strengthFindingSession) {
      return res.status(404).json({ message: 'Strength finding session not found' });
    }

    res.status(200).json({
      strengthFindingSession
    });

  } catch (error) {
    console.error('Error fetching strength finding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}