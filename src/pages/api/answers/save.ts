import { NextApiRequest, NextApiResponse } from 'next';
import { saveQuestionAnswers, updateQuestionAnswers, getQuestionAnswers } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, answers, answersId } = req.body;

    if (!userId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'UserId and answers array are required' });
    }

    let questionAnswers;
    if (answersId) {
      // 기존 답변 업데이트
      await updateQuestionAnswers(answersId, answers);
      questionAnswers = await getQuestionAnswers(answersId);
    } else {
      // 새 답변 저장
      questionAnswers = await saveQuestionAnswers(userId, answers);
    }

    res.status(200).json({ 
      message: 'Answers saved successfully',
      questionAnswers
    });

  } catch (error) {
    console.error('Error saving answers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}