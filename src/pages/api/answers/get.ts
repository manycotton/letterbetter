import { NextApiRequest, NextApiResponse } from 'next';
import { getQuestionAnswers } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { answersId } = req.query;

    if (!answersId || typeof answersId !== 'string') {
      return res.status(400).json({ message: 'AnswersId is required' });
    }

    const questionAnswers = await getQuestionAnswers(answersId);
    
    if (!questionAnswers) {
      return res.status(404).json({ message: 'Answers not found' });
    }

    res.status(200).json({ 
      questionAnswers,
      answers: questionAnswers.answers
    });

  } catch (error) {
    console.error('Error fetching answers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}