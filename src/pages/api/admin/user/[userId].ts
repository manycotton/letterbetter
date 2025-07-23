import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getUserByNickname, 
  getUserQuestionAnswers, 
  getAllGeneratedLetters,
  getWritingLogsByLetter,
  getWritingLogsByLetterId,
  getResponseLetterByLetter
} from '../../../../../lib/database';
import { 
  WritingStepData, 
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
    // Get user data (Hash format)
    const userData = await redis.hgetall(userId);
    if (!userData || Object.keys(userData).length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = {
      ...userData,
      userStrength: userData.userStrength ? (typeof userData.userStrength === 'string' ? JSON.parse(userData.userStrength) : userData.userStrength) : { generalStrength: "", keywordBasedStrength: [] },
      userChallenge: userData.userChallenge ? (typeof userData.userChallenge === 'string' ? JSON.parse(userData.userChallenge) : userData.userChallenge) : { context: "", challenge: "" }
    };

    // Get all user's question answers
    const questionAnswers: any[] = []; // await getUserQuestionAnswers(userId);

    // Get all generated letters for this user
    const generatedLetters: any[] = []; // await getAllGeneratedLetters(userId);

    // Get writing logs and response letters by letter
    const letterData: any[] = [];
    for (let i = 0; i < generatedLetters.length; i++) {
      const letter = generatedLetters[i];
      try {
        const writingLogs = await getWritingLogsByLetterId(letter.id);
        const responseData = await getResponseLetterByLetter(letter.userId);
        
        letterData.push({
          letterNumber: i + 1,
          letter: letter,
          questionAnswers: questionAnswers.find(qa => qa.userId === letter.userId),
          writingLogs: writingLogs,
          responseData: responseData
        });
      } catch (error) {
        console.error(`Error getting data for letter ${letter.userId}:`, error);
      }
    }

    // Legacy support: 편지가 없는 사용자에 대한 writing 로그도 포함
    const lettersWithUserIds = new Set(generatedLetters.map(l => l.userId));
    const questionsWithoutLetters = questionAnswers.filter(qa => !lettersWithUserIds.has(qa.userId));
    
    for (let i = 0; i < questionsWithoutLetters.length; i++) {
      const qa = questionsWithoutLetters[i];
      try {
        const writingLogs = await getWritingLogsByLetter(qa.id);
        const responseData = await getResponseLetterByLetter(qa.id);
        
        // 로그가 있는 경우에만 추가
        if (writingLogs.understandingStep || writingLogs.strengthStep || writingLogs.reflectionStep) {
          letterData.push({
            letterNumber: generatedLetters.length + i + 1,
            letter: null,
            questionAnswers: qa,
            writingLogs: writingLogs,
            responseData: responseData
          });
        }
      } catch (error) {
        console.error(`Error getting data for question ${qa.id}:`, error);
      }
    }

    const result = {
      user,
      questionAnswers,
      generatedLetters,
      letterData, // 편지별로 정리된 데이터
      // Legacy support - 기존 구조 유지
      writingLogs: letterData.length > 0 ? letterData[0].writingLogs : {
        understandingStep: null,
        strengthStep: null,
        reflectionStep: null,
        reflectionStepVersions: [],
        magicMixData: null,
        solutionExploration: null,
        inspectionData: null,
        suggestionData: null,
        letterContentData: null,
        aiStrengthTagsData: null
      },
      responseLetters: letterData.map(ld => ld.responseData).filter(Boolean)
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}