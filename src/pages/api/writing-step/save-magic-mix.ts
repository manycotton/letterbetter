import { NextApiRequest, NextApiResponse } from 'next';
import { saveMagicMixInteractionData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, interactions, totalMixCount, totalSolutionsAdded } = req.body;

    if (!sessionId || !interactions || totalMixCount === undefined || totalSolutionsAdded === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, interactions, totalMixCount, totalSolutionsAdded' 
      });
    }

    const magicMixData = await saveMagicMixInteractionData(sessionId, interactions, totalMixCount, totalSolutionsAdded);

    res.status(200).json({ 
      message: 'Magic mix interaction data saved successfully',
      magicMixData
    });

  } catch (error) {
    console.error('Error saving magic mix interaction data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}