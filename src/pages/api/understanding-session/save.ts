import { NextApiRequest, NextApiResponse } from 'next';
import { createOrUpdateUnderstandingSession } from '../../../../lib/database';
import { CleanHighlightedItem } from '../../../../types/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, highlightedItems = [] } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    if (!Array.isArray(highlightedItems)) {
      return res.status(400).json({ message: 'highlightedItems must be an array' });
    }

    // Transform and validate highlighted items
    const cleanItems: CleanHighlightedItem[] = highlightedItems.map(item => ({
      id: item.id,
      color: item.color,
      highlightedText: item.highlightedText || item.text,
      problemReason: item.problemReason,
      userExplanation: item.userExplanation,
      emotionInference: item.emotionInference,
      completedAt: item.completedAt || new Date().toISOString()
    }));

    // Create or update the session
    const session = await createOrUpdateUnderstandingSession(sessionId, cleanItems);

    if (!session) {
      throw new Error('Failed to save understanding session');
    }

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Error saving understanding session:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save understanding session',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
