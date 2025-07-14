import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { answersId } = req.query;

    if (!answersId || typeof answersId !== 'string') {
      return res.status(400).json({ message: 'Answers ID is required' });
    }

    // 질문 답변 데이터 가져오기
    const answersData = await redis.get(answersId);
    if (!answersData) {
      return res.status(404).json({ message: 'Question answers not found' });
    }

    const questionAnswers = typeof answersData === 'object' ? answersData : JSON.parse(answersData as string);

    // AI 생성 편지 가져오기
    const letterKey = `generated_letter:${answersId}`;
    const letterData = await redis.get(letterKey);
    let generatedLetter = null;

    if (letterData) {
      generatedLetter = typeof letterData === 'object' ? letterData : JSON.parse(letterData as string);
    }

    // 연관된 세션들 가져오기
    const userSessionsKey = `user_sessions:${questionAnswers.userId}`;
    const sessionIds = await redis.lrange(userSessionsKey, 0, -1);
    
    const sessions = [];
    let totalHighlights = 0;
    let totalReflections = 0;
    let completedReflections = 0;
    let totalReflectionLength = 0;
    const colorUsage: { [key: string]: number } = {};
    const keywordUsage: { [key: string]: number } = {};
    let emotionCheckPassed = 0;
    let blameCheckPassed = 0;

    for (const sessionId of sessionIds || []) {
      const sessionData = await redis.get(sessionId as string);
      if (sessionData) {
        const session = typeof sessionData === 'object' ? sessionData : JSON.parse(sessionData as string);
        
        // 이 답변과 연관된 세션만 처리
        if (session.questionAnswersId === answersId) {
          // 추천 힌트 가져오기
          let reflectionHints = null;
          const hintsId = await redis.get(`session_hints:${session.id}`);
          if (hintsId) {
            const hintsData = await redis.get(hintsId as string);
            if (hintsData) {
              const hints = typeof hintsData === 'object' ? hintsData : JSON.parse(hintsData as string);
              reflectionHints = {
                characterName: hints.characterName,
                generatedHints: hints.generatedHints
              };
            }
          }

          // 하이라이트 분석 (1단계: 이해하기)
          if (session.highlightedItems) {
            totalHighlights += session.highlightedItems.length;
            session.highlightedItems.forEach((item: any) => {
              if (item.color) {
                colorUsage[item.color] = (colorUsage[item.color] || 0) + 1;
              }
            });
          }

          // 강점 하이라이트 분석 (2단계: 강점)
          if (session.strengthItems) {
            totalHighlights += session.strengthItems.length;
            session.strengthItems.forEach((item: any) => {
              if (item.color) {
                colorUsage[item.color] = (colorUsage[item.color] || 0) + 1;
              }
            });
          }

          // 고민 정리 분석
          if (session.reflectionItems) {
            totalReflections += session.reflectionItems.length;
            
            session.reflectionItems.forEach((item: any) => {
              if (item.content) {
                totalReflectionLength += item.content.length;
              }
              
              if (item.inspectionStep === 3 || item.solutionCompleted) {
                completedReflections++;
              }

              // 키워드 분석
              if (item.keywords) {
                item.keywords.forEach((keyword: string) => {
                  keywordUsage[keyword] = (keywordUsage[keyword] || 0) + 1;
                });
              }

              if (item.selectedTags) {
                item.selectedTags.forEach((tag: any) => {
                  if (tag.type === 'keyword') {
                    keywordUsage[tag.tag] = (keywordUsage[tag.tag] || 0) + 1;
                  }
                });
              }

              // 검사 결과 분석
              if (item.emotionCheckResult && item.emotionCheckResult.hasEmotion) {
                emotionCheckPassed++;
              }
              if (item.blameCheckResult && !item.blameCheckResult.hasBlamePattern) {
                blameCheckPassed++;
              }
            });
          }

          sessions.push({
            id: session.id,
            currentStep: session.currentStep || 1,
            highlightedItems: session.highlightedItems || [],
            strengthItems: session.strengthItems || [],
            reflectionItems: session.reflectionItems || [],
            reflectionHints,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          });
        }
      }
    }

    // 사용자 행동 분석 데이터 생성
    const completionRate = totalReflections > 0 ? (completedReflections / totalReflections * 100) : 0;
    const averageReflectionLength = totalReflections > 0 ? totalReflectionLength / totalReflections : 0;

    const mostUsedColors = Object.entries(colorUsage)
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topKeywords = Object.entries(keywordUsage)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const userBehaviorAnalysis = {
      totalHighlights,
      totalReflections,
      completionRate,
      averageReflectionLength,
      mostUsedColors,
      keywordUsage: topKeywords,
      emotionCheckPassed,
      blameCheckPassed
    };

    // 세션을 최신순으로 정렬
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      questionAnswers,
      generatedLetter,
      sessions,
      userBehaviorAnalysis
    });

  } catch (error) {
    console.error('Error fetching question answers detail:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}