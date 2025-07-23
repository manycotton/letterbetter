import { NextApiRequest, NextApiResponse } from 'next';
import { getStrengthFindingSessionByLetter } from '../../../../../lib/database/sessions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { letterId } = req.query;

    if (typeof letterId !== 'string') {
      return res.status(400).json({ message: 'Invalid letter ID' });
    }

    const session = await getStrengthFindingSessionByLetter(letterId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found for this letter' });
    }

    res.status(200).json(session);

  } catch (error) {
    console.error('Error fetching strength finding session by letter:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
