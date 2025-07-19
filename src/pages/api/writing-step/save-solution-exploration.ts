import { NextApiRequest, NextApiResponse } from 'next';
import { saveSolutionExplorationData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, solutionsByReflection } = req.body;

    if (!sessionId || !solutionsByReflection) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, solutionsByReflection' 
      });
    }

    const solutionExplorationData = await saveSolutionExplorationData(sessionId, solutionsByReflection);

    res.status(200).json({ 
      message: 'Solution exploration data saved successfully',
      solutionExplorationData
    });

  } catch (error) {
    console.error('Error saving solution exploration data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}