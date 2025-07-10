import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSessions, getUserQuestionAnswers } from '../../../../../lib/database';
import redis from '../../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // 사용자 정보 조회
    const userData = await redis.get(userId as string);
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);
    
    // 사용자 세션 조회
    const sessions = await getUserSessions(userId as string);
    
    // 사용자 답변 조회
    const answers = await getUserQuestionAnswers(userId as string);
    
    // 상세 통계 계산
    let totalReflections = 0;
    let completedReflections = 0;
    let emotionChecks = { passed: 0, failed: 0 };
    let blameChecks = { passed: 0, failed: 0 };
    
    const sessionDetails = sessions.map(session => {
      let sessionReflections = 0;
      let sessionCompletedReflections = 0;
      
      if (session.reflectionItems) {
        sessionReflections = session.reflectionItems.length;
        
        session.reflectionItems.forEach(item => {
          totalReflections++;
          
          if (item.inspectionStep === 3) {
            sessionCompletedReflections++;
            completedReflections++;
          }
          
          // 감정 검사 통계
          if (item.emotionCheckResult) {
            if (item.emotionCheckResult.hasEmotion) {
              emotionChecks.passed++;
            } else {
              emotionChecks.failed++;
            }
          }
          
          // 비난 패턴 검사 통계
          if (item.blameCheckResult) {
            if (item.blameCheckResult.hasBlamePattern) {
              blameChecks.failed++;
            } else {
              blameChecks.passed++;
            }
          }
        });
      }
      
      return {
        ...session,
        reflectionCount: sessionReflections,
        completedReflectionCount: sessionCompletedReflections,
        highlightCount: session.highlightedItems ? session.highlightedItems.length : 0
      };
    });
    
    const userDetail = {
      user: {
        id: user.id,
        nickname: user.nickname,
        createdAt: user.createdAt
      },
      stats: {
        totalSessions: sessions.length,
        totalReflections,
        completedReflections,
        completionRate: totalReflections > 0 ? (completedReflections / totalReflections * 100).toFixed(1) : 0,
        emotionChecks,
        blameChecks,
        totalAnswers: answers.length
      },
      sessions: sessionDetails,
      answers
    };
    
    res.status(200).json(userDetail);
    
  } catch (error) {
    console.error('Error fetching user detail:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}