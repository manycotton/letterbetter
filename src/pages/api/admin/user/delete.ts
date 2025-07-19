import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // 사용자 데이터 삭제
    await redis.del(`user:${userId}`);
    
    // 사용자 세션 목록 가져오기
    const userSessions = await redis.lrange(`user_sessions:${userId}`, 0, -1);
    
    // 각 세션 관련 데이터 삭제
    for (const sessionId of userSessions) {
      try {
        // 세션 데이터 삭제
        await redis.del(`session:${sessionId}`);
        
        // Writing step 데이터 삭제
        const understandingStepId = await redis.get(`session_understanding:${sessionId}`);
        if (understandingStepId) {
          await redis.del(understandingStepId as string);
          await redis.del(`session_understanding:${sessionId}`);
        }
        
        const strengthStepId = await redis.get(`session_strength_finding:${sessionId}`);
        if (strengthStepId) {
          await redis.del(strengthStepId as string);
          await redis.del(`session_strength_finding:${sessionId}`);
        }
        
        // Reflection step 데이터 삭제
        const reflectionStepId = await redis.get(`session_reflection:${sessionId}`);
        if (reflectionStepId) {
          await redis.del(reflectionStepId as string);
          await redis.del(`session_reflection:${sessionId}`);
        }
        
        // Magic mix 데이터 삭제
        const magicMixId = await redis.get(`session_magic_mix:${sessionId}`);
        if (magicMixId) {
          await redis.del(magicMixId as string);
          await redis.del(`session_magic_mix:${sessionId}`);
        }
        
        // Response letter 데이터 삭제
        const responseLetterKeys = await redis.keys(`response_letter:*:${sessionId}`);
        for (const key of responseLetterKeys) {
          await redis.del(key);
        }
        
        // Reflection hints 삭제
        const hintsKeys = await redis.keys(`reflection_hints:${sessionId}:*`);
        for (const key of hintsKeys) {
          await redis.del(key);
        }
        
      } catch (sessionError) {
        console.error(`Error deleting session ${sessionId}:`, sessionError);
      }
    }
    
    // 사용자 세션 목록 삭제
    await redis.del(`user_sessions:${userId}`);
    
    // 사용자 관련 질문 답변 삭제
    const questionAnswerKeys = await redis.keys(`question_answers:${userId}:*`);
    for (const key of questionAnswerKeys) {
      await redis.del(key);
    }
    
    // 사용자 관련 생성된 편지 삭제
    const letterKeys = await redis.keys(`generated_letter:${userId}:*`);
    for (const key of letterKeys) {
      await redis.del(key);
    }
    
    // 사용자 관련 강점 분석 로그 삭제
    const strengthAnalysisKeys = await redis.keys(`strength_analysis:${userId}:*`);
    for (const key of strengthAnalysisKeys) {
      await redis.del(key);
    }

    res.status(200).json({ 
      message: 'User and all related data deleted successfully',
      deletedUserId: userId 
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}