import { NextApiRequest, NextApiResponse } from 'next';
import { createLetterSession, updateLetterSession, getLetterSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, highlightedItems, sessionId, questionAnswersId, reflectionItems, currentStep } = req.body;

    if (!userId || !highlightedItems) {
      return res.status(400).json({ message: 'UserId and highlightedItems are required' });
    }

    let session;
    if (sessionId) {
      // 기존 세션 업데이트
      await updateLetterSession(sessionId, highlightedItems, reflectionItems, currentStep);
      session = await getLetterSession(sessionId);
    } else {
      // 새 세션 생성
      session = await createLetterSession(userId, highlightedItems, questionAnswersId);
    }

    res.status(200).json({ 
      message: 'Session saved successfully',
      session
    });

  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}