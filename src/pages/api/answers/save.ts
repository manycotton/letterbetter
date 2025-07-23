import { NextApiRequest, NextApiResponse } from 'next';
import { saveQuestionAnswers, updateQuestionAnswers, getQuestionAnswers } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, answers } = req.body;
    
    // 디버깅용 로깅
    console.log('=== ANSWERS SAVE API DEBUG ===');
    console.log('userId:', userId);
    console.log('answers:', answers);
    console.log('answers length:', answers?.length);
    console.log('===============================');

    if (!userId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'UserId and answers array are required' });
    }

    // User 데이터 대체 업데이트 (answers 중복 제거)
    const questionAnswers = await saveQuestionAnswers(userId, answers);

    res.status(200).json({ 
      message: 'Answers saved successfully',
      questionAnswers
    });

  } catch (error) {
    console.error('Error saving answers:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : '');
    res.status(500).json({ message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}