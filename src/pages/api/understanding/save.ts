import { NextApiRequest, NextApiResponse } from 'next';
import { saveUnderstandingSession, updateUnderstandingSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      letterId,
      highlightedItems,
      understandingSessionId // 업데이트인 경우 제공
    } = req.body;

    console.log('=== UNDERSTANDING SESSION SAVE API ===');
    console.log('letterId:', letterId);
    console.log('highlightedItems:', highlightedItems?.length);
    console.log('understandingSessionId:', understandingSessionId);

    if (!highlightedItems || !Array.isArray(highlightedItems)) {
      return res.status(400).json({ 
        message: 'highlightedItems array is required' 
      });
    }

    let understandingSession;

    if (understandingSessionId) {
      // 기존 세션 업데이트
      await updateUnderstandingSession(understandingSessionId, highlightedItems);
      const { getUnderstandingSession } = require('../../../../lib/database');
      understandingSession = await getUnderstandingSession(understandingSessionId);
    } else {
      // 새 세션 생성
      if (!letterId) {
        return res.status(400).json({ 
          message: 'letterId is required for new session' 
        });
      }
      understandingSession = await saveUnderstandingSession(letterId, highlightedItems);
    }

    console.log('Understanding session saved successfully');

    res.status(201).json({
      message: 'Understanding session saved successfully',
      understandingSession
    });

  } catch (error) {
    console.error('Error saving understanding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}