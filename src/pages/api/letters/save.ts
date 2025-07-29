import { NextApiRequest, NextApiResponse } from 'next';
import { saveLetter } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      userId,
      letterData,
      sessionIds
    } = req.body;

    if (!userId || !letterData || !sessionIds) {
      return res.status(400).json({ 
        message: 'userId, letterData, and sessionIds are required' 
      });
    }

    // 필수 세션 ID 검증
    const requiredSessionIds = [
      'understandingSessionId',
      'strengthFindingSessionId', 
      'reflectionSessionId',
      'solutionSessionId'
    ];

    for (const sessionId of requiredSessionIds) {
      if (!sessionIds[sessionId]) {
        return res.status(400).json({ 
          message: `${sessionId} is required` 
        });
      }
    }

    // 편지 저장
    const letter = await saveLetter(userId, letterData, sessionIds);

    res.status(201).json({
      message: 'Letter saved successfully',
      letter
    });

  } catch (error) {
    console.error('Error saving letter:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}