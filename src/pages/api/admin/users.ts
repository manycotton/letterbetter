import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSessions } from '../../../../lib/database';
import redis from '../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // 모든 사용자 ID 가져오기
    const allKeys = await redis.keys('user:*');
    const userIds = allKeys.filter(key => !key.includes('user_sessions:') && !key.includes('user_answers:'));
    
    const users = [];
    
    for (const userKey of userIds) {
      const userData = await redis.get(userKey);
      if (userData) {
        const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);
        
        // 검색 필터링
        if (search && !user.nickname.toLowerCase().includes(search.toString().toLowerCase())) {
          continue;
        }
        
        // 사용자 세션 조회
        const sessions = await getUserSessions(user.id);
        
        let reflectionCount = 0;
        let completedReflectionCount = 0;
        
        sessions.forEach(session => {
          if (session.reflectionItems) {
            reflectionCount += session.reflectionItems.length;
            session.reflectionItems.forEach(item => {
              if (item.inspectionStep === 3) {
                completedReflectionCount++;
              }
            });
          }
        });
        
        users.push({
          id: user.id,
          nickname: user.nickname,
          createdAt: user.createdAt,
          sessionCount: sessions.length,
          reflectionCount,
          completedReflectionCount,
          lastActivity: sessions.length > 0 ? sessions[0].updatedAt : user.createdAt
        });
      }
    }
    
    // 사용자를 최근 활동순으로 정렬
    users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    // 페이지네이션
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.status(200).json({
      users: paginatedUsers,
      totalUsers: users.length,
      currentPage: Number(page),
      totalPages: Math.ceil(users.length / Number(limit)),
      hasNext: endIndex < users.length,
      hasPrev: startIndex > 0
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}