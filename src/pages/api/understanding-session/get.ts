import { NextApiRequest, NextApiResponse } from 'next';
import { getUnderstandingSessionByLetter } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { letterId } = req.query;

    if (!letterId || typeof letterId !== 'string') {
      return res.status(400).json({ message: 'LetterId is required' });
    }

    const session = await getUnderstandingSessionByLetter(letterId);

    if (!session) {
      return res.status(404).json({ message: 'Understanding session not found' });
    }

    res.status(200).json({
      session
    });

  } catch (error) {
    console.error('Error getting understanding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
}