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
    
    // 활동 타임라인 생성
    const timeline = [];
    
    // 1. 가입 이벤트
    timeline.push({
      id: 'signup',
      type: 'signup',
      title: '사용자 가입',
      timestamp: user.createdAt,
      data: {
        nickname: user.nickname,
        userId: user.id
      }
    });
    
    // 2. 질문 답변 이벤트들
    answers.forEach(answer => {
      timeline.push({
        id: `answer-${answer.id}`,
        type: 'questionnaire',
        title: '사전 질문 답변 완료',
        timestamp: answer.createdAt,
        data: {
          answerId: answer.id,
          totalQuestions: answer.answers.length,
          answers: answer.answers.map((ans, index) => ({
            questionNumber: index + 1,
            answer: ans,
            length: ans.length,
            wordCount: ans.split(' ').length
          })),
          completionTime: answer.updatedAt !== answer.createdAt ? 
            Math.round((new Date(answer.updatedAt).getTime() - new Date(answer.createdAt).getTime()) / 1000) : null
        }
      });
    });
    
    // 3. 세션 활동들
    sessions.forEach(session => {
      // 하이라이트 활동
      if (session.highlightedItems && session.highlightedItems.length > 0) {
        session.highlightedItems.forEach((item, index) => {
          timeline.push({
            id: `highlight-${session.id}-${item.id}`,
            type: 'highlight',
            title: `텍스트 하이라이트 (${index + 1}/${session.highlightedItems.length})`,
            timestamp: session.createdAt, // 실제로는 각 하이라이트마다 timestamp가 있어야 함
            data: {
              sessionId: session.id,
              highlightedText: item.text,
              paragraphIndex: item.paragraphIndex,
              color: item.color,
              textLength: item.text.length,
              userExplanation: item.userExplanation,
              explanationLength: item.userExplanation?.length || 0,
              conversationHistory: item.conversationHistory?.map(qa => ({
                question: qa.question,
                answer: qa.answer,
                answerLength: qa.answer.length,
                answerWordCount: qa.answer.split(' ').length
              })) || []
            }
          });
        });
      }
      
      // 고민 정리 활동
      if (session.reflectionItems && session.reflectionItems.length > 0) {
        session.reflectionItems.forEach((item, index) => {
          timeline.push({
            id: `reflection-${session.id}-${item.id}`,
            type: 'reflection',
            title: `고민 정리 (${index + 1}/${session.reflectionItems?.length || 0})`,
            timestamp: item.createdAt || session.createdAt,
            data: {
              sessionId: session.id,
              reflectionContent: item.content,
              contentLength: item.content.length,
              wordCount: item.content.split(' ').length,
              sentenceCount: item.content.split(/[.!?]/).filter(s => s.trim().length > 0).length,
              keywords: item.keywords || [],
              keywordCount: item.keywords?.length || 0,
              selectedTags: item.selectedTags || [],
              selectedTagsCount: item.selectedTags?.length || 0,
              inspectionStep: item.inspectionStep || 0,
              emotionCheck: item.emotionCheckResult ? {
                hasEmotion: item.emotionCheckResult.hasEmotion,
                suggestion: item.emotionCheckResult.suggestion,
                situationSummary: item.emotionCheckResult.situationSummary
              } : null,
              blameCheck: item.blameCheckResult ? {
                hasBlamePattern: item.blameCheckResult.hasBlamePattern,
                warning: item.blameCheckResult.warning,
                environmentalFactors: item.blameCheckResult.environmentalFactors || []
              } : null,
              completedAt: item.completedAt,
              isCompleted: item.inspectionStep === 3
            }
          });
        });
      }
    });
    
    // 타임라인을 시간순으로 정렬
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // 상세 분석 데이터 생성
    const analysis = {
      totalSessions: sessions.length,
      totalHighlights: sessions.reduce((acc, session) => acc + (session.highlightedItems?.length || 0), 0),
      totalReflections: sessions.reduce((acc, session) => acc + (session.reflectionItems?.length || 0), 0),
      completedReflections: sessions.reduce((acc, session) => 
        acc + (session.reflectionItems?.filter(item => item.inspectionStep === 3).length || 0), 0),
      
      // 텍스트 분석
      textAnalysis: {
        totalWordsInReflections: sessions.reduce((acc, session) => 
          acc + (session.reflectionItems?.reduce((itemAcc, item) => 
            itemAcc + (item.content?.split(' ').length || 0), 0) || 0), 0),
        averageReflectionLength: 0,
        totalCharactersInReflections: sessions.reduce((acc, session) => 
          acc + (session.reflectionItems?.reduce((itemAcc, item) => 
            itemAcc + (item.content?.length || 0), 0) || 0), 0)
      },
      
      // 검사 결과 분석
      inspectionAnalysis: {
        emotionChecks: {
          total: 0,
          passed: 0,
          failed: 0,
          passRate: 0
        },
        blameChecks: {
          total: 0,
          passed: 0,
          failed: 0,
          passRate: 0
        }
      },
      
      // 행동 패턴 분석
      behaviorAnalysis: {
        averageSessionDuration: 0,
        mostActiveStep: 1,
        preferredHighlightColors: {},
        keywordUsageFrequency: {},
        completionRate: 0
      }
    };
    
    // 분석 데이터 계산
    const allReflections = sessions.flatMap(s => s.reflectionItems || []);
    if (allReflections.length > 0) {
      analysis.textAnalysis.averageReflectionLength = 
        analysis.textAnalysis.totalCharactersInReflections / allReflections.length;
      
      // 검사 결과 통계
      allReflections.forEach(item => {
        if (item.emotionCheckResult) {
          analysis.inspectionAnalysis.emotionChecks.total++;
          if (item.emotionCheckResult.hasEmotion) {
            analysis.inspectionAnalysis.emotionChecks.passed++;
          } else {
            analysis.inspectionAnalysis.emotionChecks.failed++;
          }
        }
        
        if (item.blameCheckResult) {
          analysis.inspectionAnalysis.blameChecks.total++;
          if (item.blameCheckResult.hasBlamePattern) {
            analysis.inspectionAnalysis.blameChecks.failed++;
          } else {
            analysis.inspectionAnalysis.blameChecks.passed++;
          }
        }
      });
      
      // 통과율 계산
      if (analysis.inspectionAnalysis.emotionChecks.total > 0) {
        analysis.inspectionAnalysis.emotionChecks.passRate = 
          (analysis.inspectionAnalysis.emotionChecks.passed / analysis.inspectionAnalysis.emotionChecks.total) * 100;
      }
      
      if (analysis.inspectionAnalysis.blameChecks.total > 0) {
        analysis.inspectionAnalysis.blameChecks.passRate = 
          (analysis.inspectionAnalysis.blameChecks.passed / analysis.inspectionAnalysis.blameChecks.total) * 100;
      }
    }
    
    // 완료율 계산
    if (analysis.totalReflections > 0) {
      analysis.behaviorAnalysis.completionRate = 
        (analysis.completedReflections / analysis.totalReflections) * 100;
    }
    
    const result = {
      user: {
        id: user.id,
        nickname: user.nickname,
        createdAt: user.createdAt
      },
      timeline,
      analysis,
      sessions: sessions.map(session => ({
        ...session,
        duration: session.updatedAt !== session.createdAt ? 
          Math.round((new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()) / 1000) : 0
      })),
      answers
    };
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}