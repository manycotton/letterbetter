import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getUserByNickname, 
  getUserQuestionAnswers, 
  getAllGeneratedLetters,
  getWritingStepData,
  getReflectionStepData,
  getMagicMixInteractionData,
  getResponseLetterData,
  getSolutionExplorationData,
  getInspectionData,
  getSuggestionData,
  getLetterContentData,
  getAIStrengthTagsData
} from '../../../../../lib/database';
import { 
  WritingStepData, 
  ReflectionStepData, 
  MagicMixInteractionData, 
  SolutionExplorationData,
  InspectionData,
  SuggestionData,
  LetterContentData,
  AIStrengthTagsData
} from '../../../../../types/database';
import redis from '../../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    // Get user data
    const userData = await redis.get(userId);
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = typeof userData === 'object' ? userData : JSON.parse(userData as string);

    // Get all user's question answers
    const questionAnswers = await getUserQuestionAnswers(userId);

    // Get all generated letters for this user
    const generatedLetters = await getAllGeneratedLetters(userId);

    // Get writing logs from all sessions
    const userSessions = await redis.lrange(`user_sessions:${userId}`, 0, -1);
    let writingLogs: {
      understandingStep: WritingStepData | null;
      strengthStep: WritingStepData | null;
      reflectionStep: ReflectionStepData | null;
      magicMixData: MagicMixInteractionData | null;
      solutionExploration: SolutionExplorationData | null;
      inspectionData: InspectionData | null;
      suggestionData: SuggestionData | null;
      letterContentData: LetterContentData | null;
      aiStrengthTagsData: AIStrengthTagsData | null;
    } = {
      understandingStep: null,
      strengthStep: null,
      reflectionStep: null,
      magicMixData: null,
      solutionExploration: null,
      inspectionData: null,
      suggestionData: null,
      letterContentData: null,
      aiStrengthTagsData: null
    };

    // Collect data from all sessions
    for (const sessionId of userSessions) {
      try {
        const understandingStep = await getWritingStepData(sessionId as string, 'understanding');
        const strengthStep = await getWritingStepData(sessionId as string, 'strength_finding');
        const reflectionStep = await getReflectionStepData(sessionId as string);
        const magicMixData = await getMagicMixInteractionData(sessionId as string);
        const solutionExploration = await getSolutionExplorationData(sessionId as string);
        const inspectionData = await getInspectionData(sessionId as string);
        const suggestionData = await getSuggestionData(sessionId as string);
        const letterContentData = await getLetterContentData(sessionId as string);
        const aiStrengthTagsData = await getAIStrengthTagsData(sessionId as string);

        if (understandingStep && !writingLogs.understandingStep) {
          writingLogs.understandingStep = understandingStep;
        }
        if (strengthStep && !writingLogs.strengthStep) {
          writingLogs.strengthStep = strengthStep;
        }
        if (reflectionStep && !writingLogs.reflectionStep) {
          writingLogs.reflectionStep = reflectionStep;
        }
        if (magicMixData && !writingLogs.magicMixData) {
          writingLogs.magicMixData = magicMixData;
        }
        if (solutionExploration && !writingLogs.solutionExploration) {
          writingLogs.solutionExploration = solutionExploration;
        }
        if (inspectionData && !writingLogs.inspectionData) {
          writingLogs.inspectionData = inspectionData;
        }
        if (suggestionData && !writingLogs.suggestionData) {
          writingLogs.suggestionData = suggestionData;
        }
        if (letterContentData && !writingLogs.letterContentData) {
          writingLogs.letterContentData = letterContentData;
        }
        if (aiStrengthTagsData && !writingLogs.aiStrengthTagsData) {
          writingLogs.aiStrengthTagsData = aiStrengthTagsData;
        }
      } catch (error) {
        console.error(`Error getting data for session ${sessionId}:`, error);
      }
    }

    // Get response letters
    const responseLetters = [];
    for (const sessionId of userSessions) {
      try {
        const responseData = await getResponseLetterData(sessionId as string);
        if (responseData) {
          responseLetters.push(responseData);
        }
      } catch (error) {
        console.error(`Error getting response letter for session ${sessionId}:`, error);
      }
    }

    const result = {
      user,
      questionAnswers,
      generatedLetters,
      writingLogs,
      responseLetters
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}