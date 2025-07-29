import { NextApiRequest, NextApiResponse } from 'next';
import { getLetter } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { letterId } = req.query;

    if (!letterId || typeof letterId !== 'string') {
      return res.status(400).json({ message: 'letterId is required' });
    }

    const letter = await getLetter(letterId);

    if (!letter) {
      return res.status(404).json({ message: 'Letter not found' });
    }

    res.status(200).json({
      letter
    });

  } catch (error) {
    console.error('Error fetching letter:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}