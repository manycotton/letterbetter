import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSessions, getUserQuestionAnswers } from '../../../../lib/database';
import redis from '../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 모든 사용자 ID 가져오기
    const allKeys = await redis.keys('user:*');
    const userIds = allKeys.filter(key => !key.includes('user_sessions:') && !key.includes('user_answers:'));
    
    let totalUsers = 0;
    let totalSessions = 0;
    let totalReflections = 0;
    let completedReflections = 0;
    let emotionCheckStats = { passed: 0, failed: 0 };
    let blameCheckStats = { passed: 0, failed: 0 };
    
    const users = [];
    
    for (const userKey of userIds) {
      const userData = await redis.get(userKey);
      if (userData) {
        const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);
        totalUsers++;
        
        // 사용자 세션 조회
        const sessions = await getUserSessions(user.id);
        totalSessions += sessions.length;
        
        let userReflections = 0;
        let userCompletedReflections = 0;
        
        sessions.forEach(session => {
          if (session.reflectionItems) {
            userReflections += session.reflectionItems.length;
            
            session.reflectionItems.forEach(item => {
              if (item.inspectionStep === 3) {
                userCompletedReflections++;
                completedReflections++;
              }
              
              // 감정 검사 통계
              if (item.emotionCheckResult) {
                if (item.emotionCheckResult.hasEmotion) {
                  emotionCheckStats.passed++;
                } else {
                  emotionCheckStats.failed++;
                }
              }
              
              // 비난 패턴 검사 통계
              if (item.blameCheckResult) {
                if (item.blameCheckResult.hasBlamePattern) {
                  blameCheckStats.failed++;
                } else {
                  blameCheckStats.passed++;
                }
              }
            });
          }
        });
        
        totalReflections += userReflections;
        
        users.push({
          id: user.id,
          nickname: user.nickname,
          createdAt: user.createdAt,
          sessionCount: sessions.length,
          reflectionCount: userReflections,
          completedReflectionCount: userCompletedReflections,
          lastActivity: sessions.length > 0 ? sessions[0].updatedAt : user.createdAt
        });
      }
    }
    
    // 사용자를 최근 활동순으로 정렬
    users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    const stats = {
      totalUsers,
      totalSessions,
      totalReflections,
      completedReflections,
      completionRate: totalReflections > 0 ? (completedReflections / totalReflections * 100).toFixed(1) : 0,
      emotionCheckStats,
      blameCheckStats,
      users: users.slice(0, 10) // 최근 10명만 미리보기
    };
    
    res.status(200).json(stats);
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}