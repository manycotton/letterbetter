import redis from './upstash';
import { User, LetterSession, HighlightedItem, StrengthItem, QuestionAnswers, ReflectionItem, GeneratedLetter, ReflectionHints, StrengthAnalysisLog, WritingStepData, ReflectionStepData, InspectionData, SuggestionData, LetterContentData, SolutionExplorationData, AIStrengthTagsData, MagicMixInteractionData, ResponseLetterData } from '../types/database';

// User 관련 함수들
export async function createUser(nickname: string, password: string): Promise<User> {
  const userId = `user:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const user: User = {
    id: userId,
    nickname,
    password,
    createdAt: new Date().toISOString(),
  };

  await redis.set(userId, JSON.stringify(user));
  await redis.set(`nickname:${nickname}`, userId);
  
  return user;
}

export async function getUserByNickname(nickname: string): Promise<User | null> {
  try {
    console.log('Getting user by nickname:', nickname);
    const userId = await redis.get(`nickname:${nickname}`);
    console.log('Found userId:', userId, 'type:', typeof userId);
    if (!userId) return null;
    
    const userData = await redis.get(userId as string);
    console.log('Found userData:', userData, 'type:', typeof userData);
    if (!userData) return null;
    
    // Upstash에서 이미 객체로 파싱되어 올 수 있음
    if (typeof userData === 'object') {
      return userData as User;
    }
    
    return JSON.parse(userData as string) as User;
  } catch (error) {
    console.error('Error in getUserByNickname:', error);
    throw error;
  }
}

export async function validateUser(nickname: string, password: string): Promise<User | null> {
  const user = await getUserByNickname(nickname);
  if (!user || user.password !== password) return null;
  
  return user;
}

// Letter Session 관련 함수들
export async function createLetterSession(userId: string, highlightedItems: HighlightedItem[], strengthItems?: StrengthItem[], questionAnswersId?: string): Promise<LetterSession> {
  const sessionId = `session:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const session: LetterSession = {
    id: sessionId,
    userId,
    questionAnswersId,
    highlightedItems,
    strengthItems: strengthItems || [],
    reflectionItems: [],
    currentStep: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.set(sessionId, JSON.stringify(session));
  
  // 사용자별 세션 목록에 추가
  await redis.lpush(`user_sessions:${userId}`, sessionId);
  
  return session;
}

export async function updateLetterSession(sessionId: string, highlightedItems: HighlightedItem[], strengthItems?: StrengthItem[], reflectionItems?: ReflectionItem[], currentStep?: number): Promise<void> {
  const sessionData = await redis.get(sessionId);
  if (!sessionData) throw new Error('Session not found');
  
  let session: LetterSession;
  if (typeof sessionData === 'object') {
    session = sessionData as LetterSession;
  } else {
    session = JSON.parse(sessionData as string) as LetterSession;
  }
  
  session.highlightedItems = highlightedItems;
  if (strengthItems !== undefined) {
    session.strengthItems = strengthItems;
  }
  if (reflectionItems !== undefined) {
    session.reflectionItems = reflectionItems;
  }
  if (currentStep !== undefined) {
    session.currentStep = currentStep;
  }
  session.updatedAt = new Date().toISOString();
  
  await redis.set(sessionId, JSON.stringify(session));
}

export async function getLetterSession(sessionId: string): Promise<LetterSession | null> {
  const sessionData = await redis.get(sessionId);
  if (!sessionData) return null;
  
  if (typeof sessionData === 'object') {
    return sessionData as LetterSession;
  }
  
  return JSON.parse(sessionData as string) as LetterSession;
}

export async function getUserSessions(userId: string): Promise<LetterSession[]> {
  const sessionIds = await redis.lrange(`user_sessions:${userId}`, 0, -1);
  if (!sessionIds || sessionIds.length === 0) return [];
  
  const sessions: LetterSession[] = [];
  for (const sessionId of sessionIds) {
    const sessionData = await redis.get(sessionId as string);
    if (sessionData) {
      if (typeof sessionData === 'object') {
        sessions.push(sessionData as LetterSession);
      } else {
        sessions.push(JSON.parse(sessionData as string) as LetterSession);
      }
    }
  }
  
  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function deleteLetterSession(sessionId: string, userId: string): Promise<void> {
  await redis.del(sessionId);
  await redis.lrem(`user_sessions:${userId}`, 1, sessionId);
}

// Question Answers 관련 함수들
export async function saveQuestionAnswers(userId: string, answers: string[]): Promise<QuestionAnswers> {
  const answersId = `answers:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const questionAnswers: QuestionAnswers = {
    id: answersId,
    userId,
    answers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.set(answersId, JSON.stringify(questionAnswers));
  
  // 사용자별 답변 목록에 추가
  await redis.lpush(`user_answers:${userId}`, answersId);
  
  return questionAnswers;
}

export async function updateQuestionAnswers(answersId: string, answers: string[]): Promise<void> {
  const answersData = await redis.get(answersId);
  if (!answersData) throw new Error('Answers not found');
  
  let questionAnswers: QuestionAnswers;
  if (typeof answersData === 'object') {
    questionAnswers = answersData as QuestionAnswers;
  } else {
    questionAnswers = JSON.parse(answersData as string) as QuestionAnswers;
  }
  
  questionAnswers.answers = answers;
  questionAnswers.updatedAt = new Date().toISOString();
  
  await redis.set(answersId, JSON.stringify(questionAnswers));
}

export async function getQuestionAnswers(answersId: string): Promise<QuestionAnswers | null> {
  const answersData = await redis.get(answersId);
  if (!answersData) return null;
  
  if (typeof answersData === 'object') {
    return answersData as QuestionAnswers;
  }
  
  return JSON.parse(answersData as string) as QuestionAnswers;
}

export async function getUserQuestionAnswers(userId: string): Promise<QuestionAnswers[]> {
  const answersIds = await redis.lrange(`user_answers:${userId}`, 0, -1);
  if (!answersIds || answersIds.length === 0) return [];
  
  const answers: QuestionAnswers[] = [];
  for (const answersId of answersIds) {
    const answersData = await redis.get(answersId as string);
    if (answersData) {
      if (typeof answersData === 'object') {
        answers.push(answersData as QuestionAnswers);
      } else {
        answers.push(JSON.parse(answersData as string) as QuestionAnswers);
      }
    }
  }
  
  return answers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Strength Analysis Log 관련 함수들
export async function saveStrengthAnalysisLog(
  answersId: string, 
  userId: string,
  userStrengthsAnalysis: any,
  selectedStrengthsForLetter: any[]
): Promise<StrengthAnalysisLog> {
  const logId = `strength_log:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const strengthLog: StrengthAnalysisLog = {
    id: logId,
    answersId,
    userId,
    userStrengthsAnalysis,
    selectedStrengthsForLetter,
    createdAt: new Date().toISOString()
  };

  await redis.set(logId, JSON.stringify(strengthLog));
  await redis.set(`strength_analysis:${answersId}`, logId);
  
  return strengthLog;
}

export async function getStrengthAnalysisLog(answersId: string): Promise<StrengthAnalysisLog | null> {
  const logId = await redis.get(`strength_analysis:${answersId}`);
  if (!logId) return null;
  
  const logData = await redis.get(logId as string);
  if (!logData) return null;
  
  if (typeof logData === 'object') {
    return logData as StrengthAnalysisLog;
  }
  
  return JSON.parse(logData as string) as StrengthAnalysisLog;
}

// Generated Letter 관련 함수들
export async function saveGeneratedLetter(answersId: string, letterData: any, strengthAnalysisLogId?: string): Promise<GeneratedLetter> {
  const letterId = `letter:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const letterKey = `generated_letter:${answersId}`;
  
  const letterRecord: GeneratedLetter = {
    id: letterId,
    answersId,
    characterName: letterData.characterName,
    age: letterData.age,
    occupation: letterData.occupation,
    letterContent: letterData.letterContent,
    usedStrengths: letterData.usedStrengths,
    strengthAnalysisLogId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await redis.set(letterKey, JSON.stringify(letterRecord));
  await redis.set(letterId, JSON.stringify(letterRecord));
  
  return letterRecord;
}

export async function getGeneratedLetter(answersId: string): Promise<GeneratedLetter | null> {
  const letterKey = `generated_letter:${answersId}`;
  const letterData = await redis.get(letterKey);
  
  if (!letterData) return null;
  
  if (typeof letterData === 'object') {
    return letterData as GeneratedLetter;
  }
  
  return JSON.parse(letterData as string) as GeneratedLetter;
}

export async function getAllGeneratedLetters(userId: string): Promise<GeneratedLetter[]> {
  const userAnswers = await getUserQuestionAnswers(userId);
  const letters: GeneratedLetter[] = [];
  
  for (const answers of userAnswers) {
    const letter = await getGeneratedLetter(answers.id);
    if (letter) {
      letters.push(letter);
    }
  }
  
  return letters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Reflection Hints 관련 함수들
export async function saveReflectionHints(sessionId: string, characterName: string, highlightedData: HighlightedItem[], generatedHints: string[]): Promise<ReflectionHints> {
  const hintsId = `hints:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const hintsRecord: ReflectionHints = {
    id: hintsId,
    sessionId,
    characterName,
    highlightedData,
    generatedHints,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await redis.set(hintsId, JSON.stringify(hintsRecord));
  await redis.set(`session_hints:${sessionId}`, hintsId);
  
  return hintsRecord;
}

export async function getReflectionHints(sessionId: string): Promise<ReflectionHints | null> {
  const hintsId = await redis.get(`session_hints:${sessionId}`);
  if (!hintsId) return null;
  
  const hintsData = await redis.get(hintsId as string);
  if (!hintsData) return null;
  
  if (typeof hintsData === 'object') {
    return hintsData as ReflectionHints;
  }
  
  return JSON.parse(hintsData as string) as ReflectionHints;
}

export async function updateReflectionHints(hintsId: string, generatedHints: string[]): Promise<void> {
  const hintsData = await redis.get(hintsId);
  if (!hintsData) throw new Error('Reflection hints not found');
  
  let hints: ReflectionHints;
  if (typeof hintsData === 'object') {
    hints = hintsData as ReflectionHints;
  } else {
    hints = JSON.parse(hintsData as string) as ReflectionHints;
  }
  
  hints.generatedHints = generatedHints;
  hints.updatedAt = new Date().toISOString();
  
  await redis.set(hintsId, JSON.stringify(hints));
}

// Writing Step Data functions
export async function saveWritingStepData(sessionId: string, stepType: 'understanding' | 'strength_finding', highlightedItems: HighlightedItem[], userAnswers: {itemId: string; answers: {question: string; answer: string}[]; timestamp: string}[]): Promise<WritingStepData> {
  try {
    const stepDataId = `writing_step:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const stepData: WritingStepData = {
      id: stepDataId,
      sessionId,
      stepType,
      highlightedItems,
      userAnswers,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await redis.set(stepDataId, JSON.stringify(stepData));
    await redis.set(`session_${stepType}:${sessionId}`, stepDataId);
    
    return stepData;
  } catch (error) {
    console.error('Error saving writing step data:', error);
    throw new Error(`Failed to save writing step data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getWritingStepData(sessionId: string, stepType: 'understanding' | 'strength_finding'): Promise<WritingStepData | null> {
  const stepDataId = await redis.get(`session_${stepType}:${sessionId}`);
  if (!stepDataId) return null;
  
  const stepData = await redis.get(stepDataId as string);
  if (!stepData) return null;
  
  if (typeof stepData === 'object') {
    return stepData as WritingStepData;
  }
  
  return JSON.parse(stepData as string) as WritingStepData;
}

// Reflection Step Data functions
export async function saveReflectionStepData(sessionId: string, reflectionItems: ReflectionItem[], selectedHintTags: Array<{reflectionId: string; tags: string[]}>, allGeneratedHints: string[]): Promise<ReflectionStepData> {
  const reflectionDataId = `reflection_step:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const reflectionData: ReflectionStepData = {
    id: reflectionDataId,
    sessionId,
    reflectionItems,
    selectedHintTags,
    allGeneratedHints,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await redis.set(reflectionDataId, JSON.stringify(reflectionData));
  await redis.set(`session_reflection:${sessionId}`, reflectionDataId);
  
  return reflectionData;
}

export async function getReflectionStepData(sessionId: string): Promise<ReflectionStepData | null> {
  const reflectionDataId = await redis.get(`session_reflection:${sessionId}`);
  if (!reflectionDataId) return null;
  
  const reflectionData = await redis.get(reflectionDataId as string);
  if (!reflectionData) return null;
  
  if (typeof reflectionData === 'object') {
    return reflectionData as ReflectionStepData;
  }
  
  return JSON.parse(reflectionData as string) as ReflectionStepData;
}

// Inspection Data functions
export async function saveInspectionData(sessionId: string, inspectionResults: Array<{reflectionId: string; emotionCheck: any; blameCheck: any}>): Promise<InspectionData> {
  const inspectionDataId = `inspection:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const inspectionData: InspectionData = {
    id: inspectionDataId,
    sessionId,
    inspectionResults,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await redis.set(inspectionDataId, JSON.stringify(inspectionData));
  await redis.set(`session_inspection:${sessionId}`, inspectionDataId);
  
  return inspectionData;
}

export async function getInspectionData(sessionId: string): Promise<InspectionData | null> {
  const inspectionDataId = await redis.get(`session_inspection:${sessionId}`);
  if (!inspectionDataId) return null;
  
  const inspectionData = await redis.get(inspectionDataId as string);
  if (!inspectionData) return null;
  
  if (typeof inspectionData === 'object') {
    return inspectionData as InspectionData;
  }
  
  return JSON.parse(inspectionData as string) as InspectionData;
}

// Suggestion Data functions
export async function saveSuggestionData(sessionId: string, suggestionResults: Array<{reflectionId: string; warningText?: string; environmentalFactors: string[]}>, allGeneratedFactors: string[]): Promise<SuggestionData> {
  const suggestionDataId = `suggestion:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const suggestionData: SuggestionData = {
    id: suggestionDataId,
    sessionId,
    suggestionResults,
    allGeneratedFactors,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await redis.set(suggestionDataId, JSON.stringify(suggestionData));
  await redis.set(`session_suggestion:${sessionId}`, suggestionDataId);
  
  return suggestionData;
}

export async function getSuggestionData(sessionId: string): Promise<SuggestionData | null> {
  const suggestionDataId = await redis.get(`session_suggestion:${sessionId}`);
  if (!suggestionDataId) return null;
  
  const suggestionData = await redis.get(suggestionDataId as string);
  if (!suggestionData) return null;
  
  if (typeof suggestionData === 'object') {
    return suggestionData as SuggestionData;
  }
  
  return JSON.parse(suggestionData as string) as SuggestionData;
}

// Letter Content Data functions
export async function saveLetterContentData(sessionId: string, letterContent: string, strengthKeywords: string[]): Promise<LetterContentData> {
  const letterContentDataId = `letter_content:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const letterContentData: LetterContentData = {
    id: letterContentDataId,
    sessionId,
    letterContent,
    strengthKeywords,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await redis.set(letterContentDataId, JSON.stringify(letterContentData));
  await redis.set(`session_letter_content:${sessionId}`, letterContentDataId);
  
  return letterContentData;
}

export async function getLetterContentData(sessionId: string): Promise<LetterContentData | null> {
  const letterContentDataId = await redis.get(`session_letter_content:${sessionId}`);
  if (!letterContentDataId) return null;
  
  const letterContentData = await redis.get(letterContentDataId as string);
  if (!letterContentData) return null;
  
  if (typeof letterContentData === 'object') {
    return letterContentData as LetterContentData;
  }
  
  return JSON.parse(letterContentData as string) as LetterContentData;
}

// Enhanced question answers saving with strength data
export async function saveQuestionAnswersWithStrengthData(userId: string, answers: string[], strengthData?: any): Promise<QuestionAnswers> {
  const answersId = `answers:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const questionAnswers: QuestionAnswers = {
    id: answersId,
    userId,
    answers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.set(answersId, JSON.stringify(questionAnswers));
  await redis.lpush(`user_answers:${userId}`, answersId);
  
  // Save strength-related data from question 2 if provided
  if (strengthData) {
    const strengthLogId = `question_strength:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await redis.set(strengthLogId, JSON.stringify(strengthData));
    await redis.set(`question_strength:${answersId}`, strengthLogId);
  }
  
  return questionAnswers;
}

// Solution Exploration Data functions
export async function saveSolutionExplorationData(sessionId: string, solutionsByReflection: any[]): Promise<SolutionExplorationData> {
  const solutionDataId = `solution_exploration:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const solutionData: SolutionExplorationData = {
    id: solutionDataId,
    sessionId,
    solutionsByReflection,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await redis.set(solutionDataId, JSON.stringify(solutionData));
  await redis.set(`session_solution_exploration:${sessionId}`, solutionDataId);
  
  return solutionData;
}

export async function getSolutionExplorationData(sessionId: string): Promise<SolutionExplorationData | null> {
  const solutionDataId = await redis.get(`session_solution_exploration:${sessionId}`);
  if (!solutionDataId) return null;
  
  const solutionData = await redis.get(solutionDataId as string);
  if (!solutionData) return null;
  
  if (typeof solutionData === 'object') {
    return solutionData as SolutionExplorationData;
  }
  
  return JSON.parse(solutionData as string) as SolutionExplorationData;
}

// AI Strength Tags Data functions
export async function saveAIStrengthTagsData(sessionId: string, strengthTagsByReflection: any[]): Promise<AIStrengthTagsData> {
  const strengthTagsDataId = `ai_strength_tags:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const strengthTagsData: AIStrengthTagsData = {
    id: strengthTagsDataId,
    sessionId,
    strengthTagsByReflection,
    createdAt: new Date().toISOString()
  };

  await redis.set(strengthTagsDataId, JSON.stringify(strengthTagsData));
  await redis.set(`session_ai_strength_tags:${sessionId}`, strengthTagsDataId);
  
  return strengthTagsData;
}

export async function getAIStrengthTagsData(sessionId: string): Promise<AIStrengthTagsData | null> {
  const strengthTagsDataId = await redis.get(`session_ai_strength_tags:${sessionId}`);
  if (!strengthTagsDataId) return null;
  
  const strengthTagsData = await redis.get(strengthTagsDataId as string);
  if (!strengthTagsData) return null;
  
  if (typeof strengthTagsData === 'object') {
    return strengthTagsData as AIStrengthTagsData;
  }
  
  return JSON.parse(strengthTagsData as string) as AIStrengthTagsData;
}

// Magic Mix Interaction Data functions
export async function saveMagicMixInteractionData(sessionId: string, interactions: any[], totalMixCount: number, totalSolutionsAdded: number): Promise<MagicMixInteractionData> {
  const mixDataId = `magic_mix:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const mixData: MagicMixInteractionData = {
    id: mixDataId,
    sessionId,
    interactions,
    totalMixCount,
    totalSolutionsAdded,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await redis.set(mixDataId, JSON.stringify(mixData));
  await redis.set(`session_magic_mix:${sessionId}`, mixDataId);
  
  return mixData;
}

export async function getMagicMixInteractionData(sessionId: string): Promise<MagicMixInteractionData | null> {
  const mixDataId = await redis.get(`session_magic_mix:${sessionId}`);
  if (!mixDataId) return null;
  
  const mixData = await redis.get(mixDataId as string);
  if (!mixData) return null;
  
  if (typeof mixData === 'object') {
    return mixData as MagicMixInteractionData;
  }
  
  return JSON.parse(mixData as string) as MagicMixInteractionData;
}

export async function updateMagicMixInteractionData(sessionId: string, interactions: any[], totalMixCount: number, totalSolutionsAdded: number): Promise<void> {
  const mixDataId = await redis.get(`session_magic_mix:${sessionId}`);
  if (!mixDataId) {
    await saveMagicMixInteractionData(sessionId, interactions, totalMixCount, totalSolutionsAdded);
    return;
  }
  
  const mixData = await redis.get(mixDataId as string);
  if (!mixData) return;
  
  let currentData: MagicMixInteractionData;
  if (typeof mixData === 'object') {
    currentData = mixData as MagicMixInteractionData;
  } else {
    currentData = JSON.parse(mixData as string) as MagicMixInteractionData;
  }
  
  currentData.interactions = interactions;
  currentData.totalMixCount = totalMixCount;
  currentData.totalSolutionsAdded = totalSolutionsAdded;
  currentData.updatedAt = new Date().toISOString();
  
  await redis.set(mixDataId as string, JSON.stringify(currentData));
}

// Response Letter Data functions
export async function saveResponseLetterData(sessionId: string, originalGeneratedLetter: string, finalEditedLetter: string, characterName: string, userNickname: string, generatedAt: string): Promise<ResponseLetterData> {
  const responseLetterDataId = `response_letter:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const responseLetterData: ResponseLetterData = {
    id: responseLetterDataId,
    sessionId,
    originalGeneratedLetter,
    finalEditedLetter,
    characterName,
    userNickname,
    generatedAt,
    finalizedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await redis.set(responseLetterDataId, JSON.stringify(responseLetterData));
  await redis.set(`session_response_letter:${sessionId}`, responseLetterDataId);
  
  return responseLetterData;
}

export async function getResponseLetterData(sessionId: string): Promise<ResponseLetterData | null> {
  const responseLetterDataId = await redis.get(`session_response_letter:${sessionId}`);
  if (!responseLetterDataId) return null;
  
  const responseLetterData = await redis.get(responseLetterDataId as string);
  if (!responseLetterData) return null;
  
  if (typeof responseLetterData === 'object') {
    return responseLetterData as ResponseLetterData;
  }
  
  return JSON.parse(responseLetterData as string) as ResponseLetterData;
}