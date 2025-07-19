import { NextApiRequest, NextApiResponse } from 'next';
import { saveSuggestionData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, suggestionResults, allGeneratedFactors } = req.body;

    if (!sessionId || !suggestionResults || !allGeneratedFactors) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, suggestionResults, allGeneratedFactors' 
      });
    }

    const suggestionData = await saveSuggestionData(sessionId, suggestionResults, allGeneratedFactors);

    res.status(200).json({ 
      message: 'Suggestion data saved successfully',
      suggestionData
    });

  } catch (error) {
    console.error('Error saving suggestion data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}