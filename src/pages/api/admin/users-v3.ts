import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { page = '1', limit = '20', search = '' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // 모든 사용자 키 가져오기
    const allKeys = await redis.keys('user:*');
    const userKeys = allKeys.filter(key => typeof key === 'string');

    const users = [];

    for (const userKey of userKeys) {
      const userData = await redis.get(userKey as string);
      
      if (userData) {
        const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);
        
        // 검색 필터링
        if (search && !user.nickname.toLowerCase().includes((search as string).toLowerCase())) {
          continue;
        }

        // 사용자별 세션 수
        const userSessionsKey = `user_sessions:${user.id}`;
        const userSessionIds = await redis.lrange(userSessionsKey, 0, -1);
        const sessionCount = userSessionIds ? userSessionIds.length : 0;

        // 사용자별 질문답변 수
        const userAnswersKey = `user_answers:${user.id}`;
        const userAnswerIds = await redis.lrange(userAnswersKey, 0, -1);
        const questionAnswersCount = userAnswerIds ? userAnswerIds.length : 0;

        // 사용자별 고민 정리 수
        let reflectionCount = 0;
        let completedReflectionCount = 0;

        for (const sessionId of userSessionIds || []) {
          const sessionData = await redis.get(sessionId as string);
          if (sessionData) {
            const session = typeof sessionData === 'object' ? sessionData : JSON.parse(sessionData as string);
            if (session.reflectionItems) {
              reflectionCount += session.reflectionItems.length;
              completedReflectionCount += session.reflectionItems.filter((item: any) => 
                item.inspectionStep === 3 || item.solutionCompleted
              ).length;
            }
          }
        }

        users.push({
          id: user.id,
          nickname: user.nickname,
          createdAt: user.createdAt,
          sessionCount,
          questionAnswersCount,
          reflectionCount,
          completedReflectionCount,
          lastActivity: user.createdAt // 임시로 createdAt 사용
        });
      }
    }

    // 최근 활동 순으로 정렬
    users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    // 페이지네이션
    const totalPages = Math.ceil(users.length / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.status(200).json({
      users: paginatedUsers,
      totalPages,
      currentPage: pageNum,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}