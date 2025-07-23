import { NextApiRequest, NextApiResponse } from 'next';
import { createLetterSession, updateLetterSession, getLetterSession } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, highlightedItems, sessionId, letterId, reflectionItems, currentStep } = req.body;

    console.log('Sessions save API called with:', { userId, sessionId, letterId, hasHighlightedItems: !!highlightedItems });

    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }

    // highlightedItems가 없거나 빈 배열인 경우 빈 배열로 초기화
    const processedHighlightedItems = highlightedItems || [];

    let session;
    if (sessionId) {
      // 기존 세션 업데이트
      try {
        await updateLetterSession(sessionId, processedHighlightedItems, reflectionItems, currentStep);
        session = await getLetterSession(sessionId);
        if (!session) {
          return res.status(404).json({ message: 'Session not found after update' });
        }
      } catch (error) {
        console.error('Error updating session:', error);
        return res.status(404).json({ message: 'Session not found' });
      }
    } else {
      // 새 세션 생성 (letterId 우선, 없으면 userId 사용)
      session = await createLetterSession(userId, processedHighlightedItems, undefined, letterId && letterId.trim() ? letterId : undefined);
    }

    res.status(200).json({ 
      message: 'Session saved successfully',
      session
    });

  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}