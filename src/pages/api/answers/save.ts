import { NextApiRequest, NextApiResponse } from 'next';
import { saveQuestionAnswers, updateQuestionAnswers, getQuestionAnswers, saveQuestionAnswersWithStrengthData } from '../../../../lib/database';

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
      // Extract strength data from question 2 (index 1)
      let strengthData = null;
      if (answers.length > 1 && answers[1]) {
        const question2Answer = answers[1];
        // Parse strength tags format: [tag_name] content
        const strengthTagMatches = question2Answer.match(/\[([^\]]+)\]\s*([^[]*)/g);
        if (strengthTagMatches) {
          const parsedStrengths = strengthTagMatches.map((match: string) => {
            const tagMatch = match.match(/\[([^\]]+)\]\s*(.*)/);
            if (tagMatch) {
              return {
                tag: tagMatch[1].trim(),
                content: tagMatch[2].trim()
              };
            }
            return null;
          }).filter(Boolean);
          
          if (parsedStrengths.length > 0) {
            strengthData = {
              strengthTags: parsedStrengths,
              rawAnswer: question2Answer,
              extractedAt: new Date().toISOString()
            };
          }
        }
      }
      
      // Use enhanced function if strength data exists, otherwise use regular function
      if (strengthData) {
        questionAnswers = await saveQuestionAnswersWithStrengthData(userId, answers, strengthData);
      } else {
        questionAnswers = await saveQuestionAnswers(userId, answers);
      }
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