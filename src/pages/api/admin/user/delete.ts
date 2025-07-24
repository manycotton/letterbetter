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
        
        // Magic mix 데이터 삭제 (hash storage에서 sessionId로 검색)
        const magicMixKeys = await redis.keys('magic_mix:*');
        for (const key of magicMixKeys) {
          const mixData = await redis.hgetall(key);
          if (mixData && mixData.sessionId === sessionId) {
            await redis.del(key);
          }
        }
        
        // AI strength tags 데이터 삭제 (hash storage에서 sessionId로 검색)
        const aiStrengthKeys = await redis.keys('ai_strength_tags:*');
        for (const key of aiStrengthKeys) {
          const strengthData = await redis.hgetall(key);
          if (strengthData && strengthData.sessionId === sessionId) {
            await redis.del(key);
          }
        }
        
        // Response letter 데이터 삭제 (hash storage)
        const responseLetterDataId = await redis.get(`session_response_letter:${sessionId}`);
        if (responseLetterDataId) {
          await redis.del(responseLetterDataId as string);
          await redis.del(`session_response_letter:${sessionId}`);
        }
        
        // Solution exploration 데이터 삭제
        await redis.del(`session_solution_exploration:${sessionId}`);
        
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
    
    // 사용자 관련 Letter 데이터 삭제 (새로운 Letter 구조)
    const newLetterKeys = await redis.keys(`letter:*`);
    for (const key of newLetterKeys) {
      const letterData = await redis.hgetall(key);
      if (letterData && letterData.userId === userId) {
        // letter_response 매핑 삭제
        await redis.del(`letter_response:${letterData.letterId}`);
        // Letter 자체 삭제
        await redis.del(key);
      }
    }
    
    // 사용자 관련 강점 분석 로그 삭제
    const strengthAnalysisKeys = await redis.keys(`strength_analysis:${userId}:*`);
    for (const key of strengthAnalysisKeys) {
      await redis.del(key);
    }
    
    // 사용자 관련 reflection hints 삭제 (userId로 검색)
    const reflectionHintsKeys = await redis.keys('reflection_hints:*');
    for (const key of reflectionHintsKeys) {
      const hintsData = await redis.hgetall(key);
      if (hintsData && hintsData.userId === userId) {
        await redis.del(key);
      }
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