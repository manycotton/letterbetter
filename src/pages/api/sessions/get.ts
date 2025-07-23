import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSessions } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'UserId is required' });
    }

    const sessions = await getUserSessions(userId);

    res.status(200).json({
      sessions
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}