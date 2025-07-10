import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSessions, getUserQuestionAnswers } from '../../../../lib/database';
import redis from '../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { format = 'json', userId } = req.query;
    
    // 모든 사용자 ID 가져오기
    const allKeys = await redis.keys('user:*');
    const userIds = allKeys.filter(key => !key.includes('user_sessions:') && !key.includes('user_answers:'));
    
    const exportData = [];
    
    const targetUserIds = userId ? [userId] : userIds;
    
    for (const userKey of targetUserIds) {
      const userKeyString = Array.isArray(userKey) ? userKey[0] : userKey;
      const userData = await redis.get(userKeyString);
      if (userData) {
        const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);
        
        // 사용자 세션 조회
        const sessions = await getUserSessions(user.id);
        
        // 사용자 답변 조회
        const answers = await getUserQuestionAnswers(user.id);
        
        // 사용자별 데이터 정리
        const userExportData = {
          user: {
            id: user.id,
            nickname: user.nickname,
            createdAt: user.createdAt
          },
          questionnaire: answers.map(answer => ({
            id: answer.id,
            createdAt: answer.createdAt,
            updatedAt: answer.updatedAt,
            completionTime: answer.updatedAt !== answer.createdAt ? 
              Math.round((new Date(answer.updatedAt).getTime() - new Date(answer.createdAt).getTime()) / 1000) : null,
            answers: answer.answers.map((ans, index) => ({
              questionNumber: index + 1,
              answer: ans,
              wordCount: ans.split(' ').length,
              characterCount: ans.length,
              sentenceCount: ans.split(/[.!?]/).filter(s => s.trim().length > 0).length
            }))
          })),
          sessions: sessions.map(session => ({
            id: session.id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            currentStep: session.currentStep || 1,
            duration: session.updatedAt !== session.createdAt ? 
              Math.round((new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()) / 1000) : 0,
            highlights: session.highlightedItems?.map(item => ({
              id: item.id,
              text: item.text,
              paragraphIndex: item.paragraphIndex,
              color: item.color,
              textLength: item.text.length,
              wordCount: item.text.split(' ').length,
              userExplanation: item.userExplanation,
              explanationLength: item.userExplanation?.length || 0,
              explanationWordCount: item.userExplanation?.split(' ').length || 0,
              conversationHistory: item.conversationHistory?.map(qa => ({
                question: qa.question,
                answer: qa.answer,
                answerLength: qa.answer.length,
                answerWordCount: qa.answer.split(' ').length
              })) || []
            })) || [],
            reflections: session.reflectionItems?.map(item => ({
              id: item.id,
              content: item.content,
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
                environmentalFactors: item.blameCheckResult.environmentalFactors || [],
                environmentalFactorsCount: item.blameCheckResult.environmentalFactors?.length || 0
              } : null,
              completedAt: item.completedAt,
              isCompleted: item.inspectionStep === 3,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            })) || []
          })),
          statistics: {
            totalSessions: sessions.length,
            totalHighlights: sessions.reduce((acc, session) => acc + (session.highlightedItems?.length || 0), 0),
            totalReflections: sessions.reduce((acc, session) => acc + (session.reflectionItems?.length || 0), 0),
            completedReflections: sessions.reduce((acc, session) => 
              acc + (session.reflectionItems?.filter(item => item.inspectionStep === 3).length || 0), 0),
            totalWordsInReflections: sessions.reduce((acc, session) => 
              acc + (session.reflectionItems?.reduce((itemAcc, item) => 
                itemAcc + (item.content?.split(' ').length || 0), 0) || 0), 0),
            totalCharactersInReflections: sessions.reduce((acc, session) => 
              acc + (session.reflectionItems?.reduce((itemAcc, item) => 
                itemAcc + (item.content?.length || 0), 0) || 0), 0),
            averageSessionDuration: sessions.length > 0 ? 
              sessions.reduce((acc, session) => 
                acc + (session.updatedAt !== session.createdAt ? 
                  Math.round((new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()) / 1000) : 0), 0) / sessions.length : 0,
            emotionCheckStats: sessions.reduce((acc, session) => {
              const items = session.reflectionItems || [];
              items.forEach(item => {
                if (item.emotionCheckResult) {
                  acc.total++;
                  if (item.emotionCheckResult.hasEmotion) {
                    acc.passed++;
                  } else {
                    acc.failed++;
                  }
                }
              });
              return acc;
            }, { total: 0, passed: 0, failed: 0 }),
            blameCheckStats: sessions.reduce((acc, session) => {
              const items = session.reflectionItems || [];
              items.forEach(item => {
                if (item.blameCheckResult) {
                  acc.total++;
                  if (item.blameCheckResult.hasBlamePattern) {
                    acc.failed++;
                  } else {
                    acc.passed++;
                  }
                }
              });
              return acc;
            }, { total: 0, passed: 0, failed: 0 })
          }
        };
        
        exportData.push(userExportData);
      }
    }
    
    if (format === 'csv') {
      // CSV 형태로 변환
      const csvRows = [];
      
      // 헤더
      csvRows.push([
        'User ID', 'Nickname', 'Created At', 'Session ID', 'Session Duration (s)',
        'Current Step', 'Total Highlights', 'Total Reflections', 'Completed Reflections',
        'Reflection Content', 'Content Length', 'Word Count', 'Inspection Step',
        'Emotion Check Result', 'Blame Check Result', 'Keywords', 'Selected Tags',
        'Completion Rate (%)'
      ]);
      
      // 데이터 행
      exportData.forEach(userData => {
        userData.sessions.forEach(session => {
          if (session.reflections.length > 0) {
            session.reflections.forEach(reflection => {
              csvRows.push([
                userData.user.id,
                userData.user.nickname,
                userData.user.createdAt,
                session.id,
                session.duration,
                session.currentStep,
                session.highlights.length,
                session.reflections.length,
                session.reflections.filter(r => r.isCompleted).length,
                `"${reflection.content.replace(/"/g, '""')}"`,
                reflection.contentLength,
                reflection.wordCount,
                reflection.inspectionStep,
                reflection.emotionCheck ? (reflection.emotionCheck.hasEmotion ? 'Pass' : 'Fail') : 'N/A',
                reflection.blameCheck ? (reflection.blameCheck.hasBlamePattern ? 'Fail' : 'Pass') : 'N/A',
                reflection.keywords.join('; '),
                reflection.selectedTags.map(tag => `${tag.tag}(${tag.type})`).join('; '),
                userData.statistics.totalReflections > 0 ? 
                  ((userData.statistics.completedReflections / userData.statistics.totalReflections) * 100).toFixed(1) : 0
              ]);
            });
          } else {
            csvRows.push([
              userData.user.id,
              userData.user.nickname,
              userData.user.createdAt,
              session.id,
              session.duration,
              session.currentStep,
              session.highlights.length,
              0,
              0,
              '', 0, 0, 0, 'N/A', 'N/A', '', '', 0
            ]);
          }
        });
      });
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
      
    } else {
      // JSON 형태로 반환
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        totalUsers: exportData.length,
        data: exportData
      });
    }
    
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}