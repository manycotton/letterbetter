import { NextApiRequest, NextApiResponse } from 'next';
import { saveCompletionHistory } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, reflectionId, action = 'completed' } = req.body;

    console.log('=== SAVE COMPLETION API CALLED ===');
    console.log('Request body:', req.body);
    console.log('Request data:', { sessionId, reflectionId, action });

    if (!sessionId || !reflectionId) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, reflectionId' 
      });
    }

    console.log('About to call saveCompletionHistory...');
    const historyId = await saveCompletionHistory(reflectionId, sessionId, action);
    console.log('saveCompletionHistory returned:', historyId);

    if (historyId) {
      console.log('Completion history saved successfully:', historyId);
      res.status(200).json({ 
        message: 'Completion history saved successfully',
        historyId
      });
    } else {
      console.error('saveCompletionHistory returned null');
      res.status(500).json({ 
        message: 'Failed to save completion history - function returned null'
      });
    }

  } catch (error) {
    console.error('Error saving completion history:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}