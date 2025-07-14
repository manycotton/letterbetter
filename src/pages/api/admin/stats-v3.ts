import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 모든 키 가져오기
    const allKeys = await redis.keys('*');
    
    // 사용자 데이터 필터링
    const userKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('user:'));
    const sessionKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('session:'));
    const answersKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('answers:'));
    const letterKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('generated_letter:'));

    const totalUsers = userKeys.length;
    const totalSessions = sessionKeys.length;
    const totalQuestionAnswers = answersKeys.length;
    const totalGeneratedLetters = letterKeys.length;

    // 상세 통계 계산을 위한 데이터 수집
    let totalReflections = 0;
    let completedReflections = 0;
    const recentUsers = [];

    // 최근 사용자 5명 데이터 수집
    for (let i = 0; i < Math.min(5, userKeys.length); i++) {
      const userKey = userKeys[i];
      const userData = await redis.get(userKey as string);
      
      if (userData) {
        const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);
        
        // 사용자별 세션 수
        const userSessionsKey = `user_sessions:${user.id}`;
        const userSessionIds = await redis.lrange(userSessionsKey, 0, -1);
        const sessionCount = userSessionIds ? userSessionIds.length : 0;

        // 사용자별 질문답변 수
        const userAnswersKey = `user_answers:${user.id}`;
        const userAnswerIds = await redis.lrange(userAnswersKey, 0, -1);
        const questionAnswersCount = userAnswerIds ? userAnswerIds.length : 0;

        // 사용자별 고민 정리 수
        let userReflectionCount = 0;
        let userCompletedReflectionCount = 0;

        for (const sessionId of userSessionIds || []) {
          const sessionData = await redis.get(sessionId as string);
          if (sessionData) {
            const session = typeof sessionData === 'object' ? sessionData : JSON.parse(sessionData as string);
            if (session.reflectionItems) {
              userReflectionCount += session.reflectionItems.length;
              userCompletedReflectionCount += session.reflectionItems.filter((item: any) => 
                item.inspectionStep === 3 || item.solutionCompleted
              ).length;
            }
          }
        }

        totalReflections += userReflectionCount;
        completedReflections += userCompletedReflectionCount;

        recentUsers.push({
          id: user.id,
          nickname: user.nickname,
          createdAt: user.createdAt,
          sessionCount,
          questionAnswersCount,
          reflectionCount: userReflectionCount,
          completedReflectionCount: userCompletedReflectionCount,
          lastActivity: user.createdAt // 임시로 createdAt 사용
        });
      }
    }

    const completionRate = totalReflections > 0 ? (completedReflections / totalReflections * 100) : 0;
    const sessionCreationRate = totalQuestionAnswers > 0 ? (totalSessions / totalQuestionAnswers * 100) : 0;

    const stats = {
      totalUsers,
      totalQuestionAnswers,
      totalGeneratedLetters,
      totalSessions,
      totalReflections,
      completedReflections,
      completionRate: parseFloat(completionRate.toFixed(1)),
      sessionCreationRate: parseFloat(sessionCreationRate.toFixed(1)),
      users: recentUsers.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}