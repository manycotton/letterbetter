import { NextApiRequest, NextApiResponse } from 'next';
import { createOrUpdateStrengthFindingSession } from '../../../../lib/database';
import { CleanStrengthItem } from '../../../../types/database';

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
    const cleanItems: CleanStrengthItem[] = highlightedItems.map(item => ({
      id: item.id,
      color: item.color,
      highlightedText: item.highlightedText || item.text,
      strengthDescription: item.strengthDescription,
      strengthApplication: item.strengthApplication,
      completedAt: item.completedAt || new Date().toISOString()
    }));

    // Create or update the session
    const session = await createOrUpdateStrengthFindingSession(sessionId, cleanItems);

    if (!session) {
      throw new Error('Failed to save strength finding session');
    }

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Error saving strength finding session:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save strength finding session',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
