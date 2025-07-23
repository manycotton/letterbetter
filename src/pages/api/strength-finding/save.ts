import { NextApiRequest, NextApiResponse } from 'next';
import { createStrengthFindingSession, updateStrengthFindingSession, getStrengthFindingSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      letterId,
      strengthItems,
      strengthFindingSessionId // 업데이트인 경우 제공
    } = req.body;

    console.log('=== STRENGTH FINDING SESSION SAVE API ===');
    console.log('letterId:', letterId);
    console.log('strengthItems:', strengthItems?.length);
    console.log('strengthFindingSessionId:', strengthFindingSessionId);

    if (!strengthItems || !Array.isArray(strengthItems)) {
      return res.status(400).json({ 
        message: 'strengthItems array is required' 
      });
    }

    let strengthFindingSession;

    if (strengthFindingSessionId) {
      // 기존 세션 업데이트
      await updateStrengthFindingSession(strengthFindingSessionId, strengthItems);
      strengthFindingSession = await getStrengthFindingSession(strengthFindingSessionId);
    } else {
      // 새 세션 생성
      if (!letterId) {
        return res.status(400).json({ 
          message: 'letterId is required for new session' 
        });
      }
      strengthFindingSession = await createStrengthFindingSession(letterId, strengthItems);
    }

    console.log('Strength finding session saved successfully');

    res.status(201).json({
      message: 'Strength finding session saved successfully',
      strengthFindingSession
    });

  } catch (error) {
    console.error('Error saving strength finding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}