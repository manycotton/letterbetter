import { NextApiRequest, NextApiResponse } from 'next';
import { saveWritingStepData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, stepType, highlightedItems, userAnswers, letterId } = req.body;

    if (!sessionId || !stepType || !highlightedItems || !userAnswers) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, stepType, highlightedItems, userAnswers' 
      });
    }

    const stepData = await saveWritingStepData(sessionId, stepType, highlightedItems, userAnswers, letterId);

    res.status(200).json({ 
      message: 'Writing step data saved successfully',
      stepData
    });

  } catch (error) {
    console.error('Error saving writing step data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}