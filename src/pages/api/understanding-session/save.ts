import { NextApiRequest, NextApiResponse } from 'next';
import { createUnderstandingSession, updateUnderstandingSession, getUnderstandingSessionByLetter } from '../../../../lib/database';
import { CleanHighlightedItem } from '../../../../types/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { letterId, highlightedItems } = req.body;

    if (!letterId || !highlightedItems || !Array.isArray(highlightedItems)) {
      return res.status(400).json({ message: 'LetterId and highlightedItems array are required' });
    }

    // 데이터 변환: 기존 형식에서 Clean 형식으로
    const cleanItems: CleanHighlightedItem[] = highlightedItems.map(item => ({
      id: item.id,
      color: item.color,
      highlightedText: item.text,
      problemReason: item.problemReason,
      userExplanation: item.userExplanation,
      emotionInference: item.emotionInference,
      completedAt: new Date().toISOString()
    }));

    // 기존 세션이 있는지 확인
    const existingSession = await getUnderstandingSessionByLetter(letterId);
    
    let session;
    if (existingSession) {
      // 기존 세션 업데이트
      await updateUnderstandingSession(existingSession.understandingSessionId, cleanItems);
      session = {
        ...existingSession,
        highlightedItems: cleanItems
      };
    } else {
      // 새 세션 생성
      session = await createUnderstandingSession(letterId, cleanItems);
    }

    res.status(200).json({
      message: 'Understanding session saved successfully',
      session
    });

  } catch (error) {
    console.error('Error saving understanding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}