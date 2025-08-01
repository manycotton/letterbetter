import { NextApiRequest, NextApiResponse } from 'next';
import { saveCompletionHistory } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, reflectionId, action = 'completed' } = req.body;

    if (!sessionId || !reflectionId) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, reflectionId' 
      });
    }

    const historyId = await saveCompletionHistory(reflectionId, sessionId, action);

    if (historyId) {
      res.status(200).json({ 
        message: 'Completion history saved successfully',
        historyId
      });
    } else if (action.includes('inspection') || action === 'inspection_refreshed') {
      // Skipped for inspection actions - this is expected
      res.status(200).json({ 
        message: 'Completion history skipped for inspection action',
        action
      });
    } else {
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