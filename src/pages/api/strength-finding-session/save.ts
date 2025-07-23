import { NextApiRequest, NextApiResponse } from 'next';
import { createStrengthFindingSession, updateStrengthFindingSession, getStrengthFindingSessionByLetter } from '../../../../lib/database';
import { CleanStrengthItem } from '../../../../types/database';

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
    const cleanItems: CleanStrengthItem[] = highlightedItems.map(item => ({
      id: item.id,
      color: item.color,
      highlightedText: item.text,
      strengthDescription: item.strengthDescription,
      strengthApplication: item.strengthApplication,
      completedAt: new Date().toISOString()
    }));

    // 기존 세션이 있는지 확인
    const existingSession = await getStrengthFindingSessionByLetter(letterId);
    
    let session;
    if (existingSession) {
      // 기존 세션 업데이트
      await updateStrengthFindingSession(existingSession.strengthFindingSessionId, cleanItems);
      session = {
        ...existingSession,
        highlightedItems: cleanItems
      };
    } else {
      // 새 세션 생성
      session = await createStrengthFindingSession(letterId, cleanItems);
    }

    res.status(200).json({
      message: 'Strength finding session saved successfully',
      session
    });

  } catch (error) {
    console.error('Error saving strength finding session:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}