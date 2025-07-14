import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // 사용자 정보 가져오기
    const userData = await redis.get(userId);
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);

    // 사용자의 질문 답변 목록 가져오기
    const userAnswersKey = `user_answers:${userId}`;
    const answerIds = await redis.lrange(userAnswersKey, 0, -1);

    const questionAnswers = [];

    for (const answerId of answerIds || []) {
      const answersData = await redis.get(answerId as string);
      
      if (answersData) {
        const answers = typeof answersData === 'object' ? answersData : JSON.parse(answersData as string);
        
        // AI 편지 생성 여부 확인
        const letterKey = `generated_letter:${answers.id}`;
        const letterData = await redis.get(letterKey);
        const hasGeneratedLetter = !!letterData;

        // 해당 답변과 연관된 세션 수 확인
        const userSessionsKey = `user_sessions:${userId}`;
        const sessionIds = await redis.lrange(userSessionsKey, 0, -1);
        
        let sessionCount = 0;
        let completedReflections = 0;

        for (const sessionId of sessionIds || []) {
          const sessionData = await redis.get(sessionId as string);
          if (sessionData) {
            const session = typeof sessionData === 'object' ? sessionData : JSON.parse(sessionData as string);
            
            // 세션이 이 답변과 연관되어 있는지 확인
            if (session.questionAnswersId === answers.id) {
              sessionCount++;
              
              if (session.reflectionItems) {
                completedReflections += session.reflectionItems.filter((item: any) => 
                  item.inspectionStep === 3 || item.solutionCompleted
                ).length;
              }
            }
          }
        }

        questionAnswers.push({
          id: answers.id,
          userId: answers.userId,
          answers: answers.answers,
          createdAt: answers.createdAt,
          updatedAt: answers.updatedAt,
          hasGeneratedLetter,
          hasSessions: sessionCount > 0,
          sessionCount,
          completedReflections
        });
      }
    }

    // 최신순으로 정렬
    questionAnswers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      user: {
        id: user.id,
        nickname: user.nickname,
        createdAt: user.createdAt
      },
      questionAnswers
    });

  } catch (error) {
    console.error('Error fetching user question answers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}