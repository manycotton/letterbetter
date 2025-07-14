import redis from './upstash';
import { User, LetterSession, HighlightedItem, StrengthItem, QuestionAnswers, ReflectionItem, GeneratedLetter, ReflectionHints, StrengthAnalysisLog } from '../types/database';

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