import redis from './upstash';
import { User, LetterSession, HighlightedItem, QuestionAnswers, ReflectionItem } from '../types/database';

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
export async function createLetterSession(userId: string, highlightedItems: HighlightedItem[], questionAnswersId?: string): Promise<LetterSession> {
  const sessionId = `session:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const session: LetterSession = {
    id: sessionId,
    userId,
    questionAnswersId,
    highlightedItems,
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

export async function updateLetterSession(sessionId: string, highlightedItems: HighlightedItem[], reflectionItems?: ReflectionItem[], currentStep?: number): Promise<void> {
  const sessionData = await redis.get(sessionId);
  if (!sessionData) throw new Error('Session not found');
  
  let session: LetterSession;
  if (typeof sessionData === 'object') {
    session = sessionData as LetterSession;
  } else {
    session = JSON.parse(sessionData as string) as LetterSession;
  }
  
  session.highlightedItems = highlightedItems;
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