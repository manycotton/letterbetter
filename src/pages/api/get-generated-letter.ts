import { NextApiRequest, NextApiResponse } from 'next';
import { getGeneratedLetter } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'UserId is required' });
    }

    const letter = await getGeneratedLetter(userId);
    
    if (!letter) {
      return res.status(404).json({ message: 'Generated letter not found' });
    }

    res.status(200).json({ 
      letter
    });

  } catch (error) {
    console.error('Error fetching generated letter:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}