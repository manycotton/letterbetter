import redis from './upstash';
import { User, LetterSession, HighlightedItem, StrengthItem, QuestionAnswers, ReflectionItem, GeneratedLetter, ReflectionHints, ReflectionSupportHints, StrengthAnalysisLog, WritingStepData, InspectionData, LetterContentData, SolutionExplorationData, AIStrengthTagsData, MagicMixInteractionData, ResponseLetterData, UnderstandingSession, StrengthFindingSession, CleanHighlightedItem, CleanStrengthItem, Letter } from '../types/database';

// 안전한 JSON 파싱 헬퍼 함수
function safeJSONParse<T>(value: string | undefined | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    // JSON 파싱에 실패하면 문자열인 경우 그대로 반환, 아니면 기본값 반환
    if (typeof value === 'string' && value.trim()) {
      // letterContent의 경우 문자열을 배열로 감싸서 반환
      if (Array.isArray(defaultValue)) {
        return [value] as T;
      }
      return value as T;
    }
    return defaultValue;
  }
}

// User 관련 함수들 - Redis Hash 사용
export async function createUser(nickname: string, password: string, userIntroduction: string, userStrength: any, userChallenge: any): Promise<User> {
  const userId = `user:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const user: User = {
    userId,
    nickname,
    password,
    userIntroduction,
    userStrength,
    userChallenge,
    createdAt: new Date().toISOString(),
  };

  // Store user data as Hash
  await redis.hset(userId, {
    userId,
    nickname,
    password,
    userIntroduction,
    userStrength: JSON.stringify(userStrength),
    userChallenge: JSON.stringify(userChallenge),
    createdAt: user.createdAt
  });
  
  // nickname 매핑 제거 - User 객체에서 직접 검색
  
  return user;
}

export async function getUserByNickname(nickname: string): Promise<User | null> {
  try {
    // 모든 user:* 키들을 찾아서 nickname으로 필터링
    const userKeys = await redis.keys('user:*');
    
    for (const userKey of userKeys) {
      const userData = await redis.hgetall(userKey);
      
      if (userData && Object.keys(userData).length > 0) {
        if (userData.nickname === nickname) {
          
          // Hash 데이터를 User 객체로 변환
          const user: User = {
            userId: userData.userId as string,
            nickname: userData.nickname as string,
            password: String(userData.password), // Convert to string to handle number type
            userIntroduction: (userData.userIntroduction as string) || "",
            userStrength: userData.userStrength ? (typeof userData.userStrength === 'string' ? safeJSONParse(userData.userStrength, { generalStrength: "", keywordBasedStrength: [] }) : userData.userStrength as any) : { generalStrength: "", keywordBasedStrength: [] },
            userChallenge: userData.userChallenge ? (typeof userData.userChallenge === 'string' ? safeJSONParse(userData.userChallenge, { context: "", challenge: "" }) : userData.userChallenge as any) : { context: "", challenge: "" },
            createdAt: userData.createdAt as string
          };
          
          return user;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in getUserByNickname:', error);
    return null;
  }
}

export async function validateUser(nickname: string, password: string): Promise<User | null> {
  const user = await getUserByNickname(nickname);
  if (!user) {
    return null;
  }
  
  // Handle type conversion - password might be stored as number or string
  const storedPassword = String(user.password);
  const providedPassword = String(password);
  
  if (storedPassword !== providedPassword) {
    return null;
  }
  
  return user;
}

// Letter Session 관련 함수들 - 이제 letter에 직접 세션 데이터 저장
export async function createLetterSession(userId: string, highlightedItems: HighlightedItem[], strengthItems?: StrengthItem[], letterId?: string): Promise<LetterSession> {
  const sessionId = `session:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const session: LetterSession = {
    id: sessionId,
    userId,
    highlightedItems,
    strengthItems: strengthItems || [],
    reflectionItems: [],
    currentStep: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // letterId가 있으면 letter에 세션 데이터 직접 저장
  if (letterId) {
    await redis.hset(letterId, {
      sessionId: sessionId,
      highlightedItems: JSON.stringify(highlightedItems),
      strengthItems: JSON.stringify(strengthItems || []),
      reflectionItems: JSON.stringify([]),
      currentStep: "1",
      sessionCreatedAt: session.createdAt,
      sessionUpdatedAt: session.updatedAt
    });
  } else {
    // letterId가 없으면 기존 방식으로 별도 저장 (호환성)
    await redis.set(sessionId, JSON.stringify(session));
  }
  
  // Note: user_sessions 제거 - letter에서 직접 관리
  
  return session;
}

// Legacy 필드 제거 헬퍼 함수들
function cleanHighlightedItem(item: any): CleanHighlightedItem {
  return {
    id: item.id,
    color: item.color,
    highlightedText: item.text || item.highlightedText || '',
    problemReason: item.problemReason,
    userExplanation: item.userExplanation,
    emotionInference: item.emotionInference,
    completedAt: item.completedAt
  };
}

function cleanHighlightedItems(items: any[]): CleanHighlightedItem[] {
  return items.map(cleanHighlightedItem);
}

function cleanStrengthItem(item: any): CleanStrengthItem {
  return {
    id: item.id,
    color: item.color,
    highlightedText: item.text || item.highlightedText || '',
    strengthDescription: item.strengthDescription,
    strengthApplication: item.strengthApplication,
    completedAt: item.completedAt
  };
}

function cleanStrengthItems(items: any[]): CleanStrengthItem[] {
  return items.map(cleanStrengthItem);
}

function cleanReflectionItem(item: any): ReflectionItem {
  return {
    id: item.id,
    sessionId: item.sessionId || '',
    content: item.content,
    inspectionStep: item.inspectionStep || 0,
    emotionCheckResult: item.emotionCheckResult,
    blameCheckResult: item.blameCheckResult,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    solutionIds: (item as any).solutionIds || [],
    solutionCompleted: item.solutionCompleted
  };
}

function cleanReflectionItems(items: any[]): ReflectionItem[] {
  return items.map(cleanReflectionItem);
}

export async function updateLetterSession(sessionId: string, highlightedItems: HighlightedItem[], strengthItems?: StrengthItem[], reflectionItems?: ReflectionItem[], currentStep?: number, letterId?: string): Promise<void> {
  console.log('updateLetterSession called with:', { sessionId, letterId, hasHighlightedItems: !!highlightedItems });
  // letterId가 있으면 letter에서 직접 업데이트
  if (letterId) {
    const updateData: any = {
      highlightedItems: JSON.stringify(highlightedItems),
      sessionUpdatedAt: new Date().toISOString()
    };
    
    if (strengthItems !== undefined) {
      updateData.strengthItems = JSON.stringify(strengthItems);
    }
    if (reflectionItems !== undefined) {
      updateData.reflectionItems = JSON.stringify(reflectionItems);
    }
    if (currentStep !== undefined) {
      updateData.currentStep = currentStep.toString();
    }
    
    await redis.hset(letterId, updateData);
    return;
  }
  
  // Fallback: 기존 방식 - hash와 string 둘 다 확인
  console.log('Looking for session with ID:', sessionId);
  let sessionData = await redis.get(sessionId);
  console.log('Session data from redis.get:', sessionData ? 'found' : 'not found');
  if (!sessionData) {
    // hash 형태로 저장되어 있는지 확인
    console.log('Trying to find session as hash...');
    const hashData = await redis.hgetall(sessionId);
    console.log('Hash data:', hashData ? Object.keys(hashData) : 'null');
    if (hashData && Object.keys(hashData).length > 0) {
      // hash 데이터를 LetterSession 형태로 변환
      sessionData = {
        sessionId: hashData.sessionId || sessionId,
        userId: hashData.userId,
        highlightedItems: safeJSONParse(hashData.highlightedItems as string, []),
        strengthItems: safeJSONParse(hashData.strengthItems as string, []),
        reflectionItems: safeJSONParse(hashData.reflectionItems as string, []),
        currentStep: parseInt(hashData.currentStep as string) || 0,
        createdAt: hashData.createdAt || new Date().toISOString(),
        updatedAt: hashData.updatedAt || new Date().toISOString()
      };
    } else {
      throw new Error('Session not found');
    }
  }
  
  let session: LetterSession;
  if (typeof sessionData === 'object') {
    session = sessionData as LetterSession;
  } else {
    session = safeJSONParse(sessionData as string, {} as LetterSession);
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

export async function getLetterSession(sessionId: string, letterId?: string): Promise<LetterSession | null> {
  // letterId가 있으면 letter에서 세션 데이터 조회
  if (letterId) {
    const letterData = await redis.hgetall(letterId);
    if (letterData && Object.keys(letterData).length > 0 && letterData.sessionId === sessionId) {
      return {
        id: sessionId,
        userId: letterData.userId as string,
        highlightedItems: safeJSONParse(letterData.highlightedItems as string, []),
        strengthItems: safeJSONParse(letterData.strengthItems as string, []),
        reflectionItems: safeJSONParse(letterData.reflectionItems as string, []),
        currentStep: letterData.currentStep ? parseInt(letterData.currentStep as string) : 1,
        createdAt: letterData.sessionCreatedAt as string || letterData.createdAt as string,
        updatedAt: letterData.sessionUpdatedAt as string || letterData.createdAt as string
      };
    }
  }
  
  // Fallback: 기존 방식
  const sessionData = await redis.get(sessionId);
  if (!sessionData) return null;
  
  if (typeof sessionData === 'object') {
    return sessionData as LetterSession;
  }
  
  return safeJSONParse(sessionData as string, {} as LetterSession);
}

export async function getUserSessions(userId: string): Promise<LetterSession[]> {
  // 이제 letter에서 세션 데이터를 가져옴
  const letterKeys = await redis.keys('letter:*');
  const sessions: LetterSession[] = [];
  
  for (const letterKey of letterKeys) {
    const letterData = await redis.hgetall(letterKey);
    if (letterData && Object.keys(letterData).length > 0 && letterData.userId === userId && letterData.sessionId) {
      const session: LetterSession = {
        id: letterData.sessionId as string,
        userId: letterData.userId as string,
        highlightedItems: safeJSONParse(letterData.highlightedItems as string, []),
        strengthItems: safeJSONParse(letterData.strengthItems as string, []),
        reflectionItems: safeJSONParse(letterData.reflectionItems as string, []),
        currentStep: letterData.currentStep ? parseInt(letterData.currentStep as string) : 1,
        createdAt: letterData.sessionCreatedAt as string || letterData.createdAt as string,
        updatedAt: letterData.sessionUpdatedAt as string || letterData.createdAt as string
      };
      sessions.push(session);
    }
  }
  
  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function deleteLetterSession(sessionId: string, userId: string): Promise<void> {
  // 이제 letter에서 sessionId를 찾아서 해당 letter의 세션 데이터만 제거
  const letterKeys = await redis.keys('letter:*');
  
  for (const letterKey of letterKeys) {
    const letterData = await redis.hgetall(letterKey);
    if (letterData && letterData.sessionId === sessionId && letterData.userId === userId) {
      // 세션 관련 필드들을 제거
      await redis.hdel(letterKey, 'sessionId', 'highlightedItems', 'strengthItems', 'reflectionItems', 'currentStep', 'sessionCreatedAt', 'sessionUpdatedAt');
      break;
    }
  }
  
  // Legacy session 데이터도 제거
  await redis.del(sessionId);
}

// 편지별 세션 조회 함수 - 이제 letter에서 직접 조회
export async function getLetterSessionId(letterId: string): Promise<string | null> {
  const letterData = await redis.hgetall(letterId);
  if (letterData && Object.keys(letterData).length > 0) {
    return letterData.sessionId as string || null;
  }
  return null;
}

// letterId로 세션 조회 함수
export async function getLetterSessionByLetterId(letterId: string): Promise<string | null> {
  return getLetterSessionId(letterId);
}

// Question Answers 관련 함수들 - 이제 User 객체에 직접 저장 (Hash 사용)
export async function saveQuestionAnswers(userId: string, answers: string[]): Promise<QuestionAnswers> {
  // Get existing user from Hash
  console.log('Getting user data for userId:', userId);
  const userData = await redis.hgetall(userId);
  console.log('Retrieved userData:', userData, 'type:', typeof userData);
  
  if (!userData || Object.keys(userData).length === 0) {
    throw new Error('User not found');
  }
  
  let user: User;
  try {
    user = {
      userId: userData.userId as string,
      nickname: userData.nickname as string,
      password: userData.password as string,
      userIntroduction: (userData.userIntroduction as string) || "",
      userStrength: userData.userStrength ? (typeof userData.userStrength === 'string' ? JSON.parse(userData.userStrength) : userData.userStrength) : { generalStrength: "", keywordBasedStrength: [] },
      userChallenge: userData.userChallenge ? (typeof userData.userChallenge === 'string' ? JSON.parse(userData.userChallenge) : userData.userChallenge) : { context: "", challenge: "" },
      createdAt: userData.createdAt as string
    };
    
    console.log('Parsed user:', user);
  } catch (error) {
    console.error('Error parsing user data:', error);
    throw error;
  }

  // Extract user data from answers and update user object
  const userIntroduction = answers[0] || "";
  
  console.log('=== SAVE QUESTION ANSWERS DEBUG ===');
  console.log('userId:', userId);
  console.log('answers:', answers);
  console.log('answers.length:', answers.length);
  console.log('answers[0] (userIntroduction):', answers[0]);
  console.log('answers[1] (userStrength):', answers[1]);
  console.log('answers[2] (userChallenge.context):', answers[2]);
  console.log('answers[3] (userChallenge.challenge):', answers[3]);
  
  // Parse second question for userStrength
  let userStrength = user.userStrength || {
    generalStrength: "",
    keywordBasedStrength: []
  };
  
  if (answers[1]) {
    const strengthLines = answers[1].split('\n');
    const generalLine = strengthLines.find(line => !line.includes('[') && !line.includes(']'));
    const taggedLines = strengthLines.filter(line => line.includes('[') && line.includes(']'));
    
    if (generalLine) {
      userStrength.generalStrength = generalLine.trim();
    }
    
    userStrength.keywordBasedStrength = taggedLines.map(line => {
      const match = line.match(/\[([^\]]+)\]\s*(.*)/);
      return match ? {
        keyword: match[1].trim(),
        content: match[2].trim()
      } : null;
    }).filter((item): item is { keyword: string; content: string } => item !== null);
  }
  
  // Extract userChallenge from third and fourth questions
  const userChallenge = {
    context: answers[2] || "",
    challenge: answers[3] || ""
  };

  // Update user object
  user.userIntroduction = userIntroduction;
  user.userStrength = userStrength;
  user.userChallenge = userChallenge;

  try {
    // Save updated user as Hash
    console.log('Saving user data:', user);
    await redis.hset(userId, {
      userId: user.userId,
      nickname: user.nickname,
      password: user.password,
      userIntroduction: user.userIntroduction,
      userStrength: JSON.stringify(user.userStrength),
      userChallenge: JSON.stringify(user.userChallenge),
      createdAt: user.createdAt
    });
    console.log('User data saved successfully');

    // User 데이터만 사용, answers 중복 제거
    // Legacy 호환성을 위해 QuestionAnswers 형식으로 반환
    const questionAnswers: QuestionAnswers = {
      id: userId, // User ID를 answers ID로 사용
      userId,
      answers,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('Returning user-based questionAnswers:', questionAnswers);
    return questionAnswers;
  } catch (error) {
    console.error('Error in saveQuestionAnswers (saving):', error);
    throw error;
  }
}

// Legacy function - 더 이상 사용하지 않음 (User 기반으로 대체됨)
export async function updateQuestionAnswers(userId: string, answers: string[]): Promise<void> {
  console.log('=== UPDATE USER ANSWERS (Legacy compatibility) ===');
  console.log('userId:', userId);
  console.log('answers:', answers);
  
  // User 데이터 직접 업데이트로 대체
  await updateUserDataFromAnswers(userId, answers);
  console.log('User data updated successfully');
}

// 사용자 데이터를 답변으로부터 업데이트하는 헬퍼 함수
async function updateUserDataFromAnswers(userId: string, answers: string[]): Promise<void> {
  // Get existing user from Hash
  const userData = await redis.hgetall(userId);
  if (!userData || Object.keys(userData).length === 0) {
    throw new Error('User not found');
  }
  
  let user: User;
  try {
    user = {
      userId: userData.userId as string,
      nickname: userData.nickname as string,
      password: userData.password as string,
      userIntroduction: (userData.userIntroduction as string) || "",
      userStrength: userData.userStrength ? (typeof userData.userStrength === 'string' ? JSON.parse(userData.userStrength) : userData.userStrength) : { generalStrength: "", keywordBasedStrength: [] },
      userChallenge: userData.userChallenge ? (typeof userData.userChallenge === 'string' ? JSON.parse(userData.userChallenge) : userData.userChallenge) : { context: "", challenge: "" },
      createdAt: userData.createdAt as string
    };
  } catch (error) {
    console.error('Error parsing user data:', error);
    throw error;
  }

  // Extract user data from answers and update user object
  const userIntroduction = answers[0] || "";
  
  // Parse second question for userStrength
  let userStrength = user.userStrength || {
    generalStrength: "",
    keywordBasedStrength: []
  };
  
  if (answers[1]) {
    const strengthLines = answers[1].split('\n');
    const generalLine = strengthLines.find(line => !line.includes('[') && !line.includes(']'));
    const taggedLines = strengthLines.filter(line => line.includes('[') && line.includes(']'));
    
    if (generalLine) {
      userStrength.generalStrength = generalLine.trim();
    }
    
    userStrength.keywordBasedStrength = taggedLines.map(line => {
      const match = line.match(/\[([^\]]+)\]\s*(.*)/);
      return match ? {
        keyword: match[1].trim(),
        content: match[2].trim()
      } : null;
    }).filter((item): item is { keyword: string; content: string } => item !== null);
  }
  
  // Extract userChallenge from third and fourth questions
  const userChallenge = {
    context: answers[2] || "",
    challenge: answers[3] || ""
  };

  // Update user object
  user.userIntroduction = userIntroduction;
  user.userStrength = userStrength;
  user.userChallenge = userChallenge;

  // Save updated user as Hash
  console.log('Saving updated user data:', user);
  await redis.hset(userId, {
    userId: user.userId,
    nickname: user.nickname,
    password: user.password,
    userIntroduction: user.userIntroduction,
    userStrength: JSON.stringify(user.userStrength),
    userChallenge: JSON.stringify(user.userChallenge),
    createdAt: user.createdAt
  });
}

export async function getQuestionAnswers(userId: string): Promise<QuestionAnswers | null> {
  // User 데이터에서 QuestionAnswers 형식으로 변환하여 반환
  const userAnswers = await getUserQuestionAnswers(userId);
  return userAnswers.length > 0 ? userAnswers[0] : null;
}

export async function getUserQuestionAnswers(userId: string): Promise<QuestionAnswers[]> {
  try {
    // Get user data from hash
    const userData = await redis.hgetall(userId);
    if (!userData || Object.keys(userData).length === 0) return [];
    
    const user: User = {
      userId: userData.userId as string,
      nickname: userData.nickname as string,
      password: userData.password as string,
      userIntroduction: (userData.userIntroduction as string) || "",
      userStrength: userData.userStrength ? (typeof userData.userStrength === 'string' ? JSON.parse(userData.userStrength) : userData.userStrength) : { generalStrength: "", keywordBasedStrength: [] },
      userChallenge: userData.userChallenge ? (typeof userData.userChallenge === 'string' ? JSON.parse(userData.userChallenge) : userData.userChallenge) : { context: "", challenge: "" },
      createdAt: userData.createdAt as string
    };
  
  // Convert user data back to QuestionAnswers format for compatibility
  if (user.userIntroduction || user.userStrength?.generalStrength || user.userChallenge?.challenge) {
    const answers = [
      user.userIntroduction || "",
      user.userStrength ? 
        `${user.userStrength.generalStrength || ""}\n${user.userStrength.keywordBasedStrength?.map(item => `[${item.keyword}] ${item.content}`).join('\n') || ""}`.trim()
        : "",
      user.userChallenge?.context || "",
      user.userChallenge?.challenge || ""
    ];
    
    const questionAnswers: QuestionAnswers = {
      id: `answers:${userId}:converted`,
      userId,
      answers,
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    };
    
    return [questionAnswers];
  }
  
    return [];
  } catch (error) {
    console.error('Error in getUserQuestionAnswers:', error);
    return [];
  }
}

// Strength Analysis Log 관련 함수들
export async function saveStrengthAnalysisLog(
  userId: string,
  userStrengthsAnalysis: any,
  selectedStrengthsForLetter: any[]
): Promise<StrengthAnalysisLog> {
  const logId = `strength_log:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const strengthLog: StrengthAnalysisLog = {
    id: logId,
    userId,
    userStrengthsAnalysis,
    selectedStrengthsForLetter,
    createdAt: new Date().toISOString()
  };

  await redis.hset(logId, {
    id: logId,
    userId,
    userStrengthsAnalysis: JSON.stringify(userStrengthsAnalysis),
    selectedStrengthsForLetter: JSON.stringify(selectedStrengthsForLetter),
    createdAt: strengthLog.createdAt
  });
  
  return strengthLog;
}

export async function getStrengthAnalysisLog(userId: string): Promise<StrengthAnalysisLog | null> {
  // 모든 strength_log:* 키들을 찾아서 userId로 필터링하여 가장 최근 로그 가져오기
  const logKeys = await redis.keys('strength_log:*');
  
  const userLogs: {log: StrengthAnalysisLog, timestamp: number}[] = [];
  
  for (const logKey of logKeys) {
    const logData = await redis.hgetall(logKey);
    if (logData && Object.keys(logData).length > 0) {
      if (logData.userId === userId) {
        const log: StrengthAnalysisLog = {
          id: logData.id as string,
          userId: logData.userId as string,
          userStrengthsAnalysis: logData.userStrengthsAnalysis ? JSON.parse(logData.userStrengthsAnalysis as string) : {},
          selectedStrengthsForLetter: logData.selectedStrengthsForLetter ? JSON.parse(logData.selectedStrengthsForLetter as string) : [],
          createdAt: logData.createdAt as string
        };
        
        // logId에서 타임스탬프 추출 (strength_log:1753229128100:hm3kj3ow4 형식)
        const timestamp = parseInt(logKey.split(':')[1]);
        userLogs.push({log, timestamp});
      }
    }
  }
  
  if (userLogs.length === 0) return null;
  
  // 타임스탬프로 정렬하여 가장 최근 로그 반환
  userLogs.sort((a, b) => b.timestamp - a.timestamp);
  return userLogs[0].log;
}

// UnderstandingSession 관련 함수들



// Letter 관련 함수들
export async function saveLetter(
  userId: string,
  letterData: {
    characterName: string;
    age: number;
    occupation: string;
    letterContent: string[];
    usedStrengths: string[];
  },
  sessionIds: {
    understandingSessionId: string;
    strengthFindingSessionId: string;
    reflectionSessionId: string;
    solutionSessionId: string;
  }
): Promise<Letter> {
  const letterId = `letter:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const letter: Letter = {
    letterId,
    userId,
    characterName: letterData.characterName,
    age: letterData.age,
    occupation: letterData.occupation,
    letterContent: letterData.letterContent,
    usedStrengths: letterData.usedStrengths,
    createdAt: new Date().toISOString(),
    understandingSessionId: sessionIds.understandingSessionId,
    strengthFindingSessionId: sessionIds.strengthFindingSessionId,
    reflectionSessionId: sessionIds.reflectionSessionId,
    solutionSessionId: sessionIds.solutionSessionId
  };

  // 편지를 Hash로 저장
  await redis.hset(letterId, {
    letterId,
    userId,
    characterName: letterData.characterName,
    age: letterData.age.toString(),
    occupation: letterData.occupation,
    letterContent: JSON.stringify(letterData.letterContent),
    usedStrengths: JSON.stringify(letterData.usedStrengths),
    createdAt: letter.createdAt,
    understandingSessionId: sessionIds.understandingSessionId,
    strengthFindingSessionId: sessionIds.strengthFindingSessionId,
    reflectionSessionId: sessionIds.reflectionSessionId,
    solutionSessionId: sessionIds.solutionSessionId
  });
  
  return letter;
}

export async function getLetter(letterId: string): Promise<Letter | null> {
  const letterData = await redis.hgetall(letterId);
  if (!letterData || Object.keys(letterData).length === 0) return null;
  
  return {
    letterId: letterData.letterId as string,
    userId: letterData.userId as string,
    characterName: letterData.characterName as string,
    age: parseInt(letterData.age as string),
    occupation: letterData.occupation as string,
    letterContent: safeJSONParse(letterData.letterContent as string, []),
    usedStrengths: safeJSONParse(letterData.usedStrengths as string, []),
    createdAt: letterData.createdAt as string,
    understandingSessionId: letterData.understandingSessionId as string,
    strengthFindingSessionId: letterData.strengthFindingSessionId as string,
    reflectionSessionId: letterData.reflectionSessionId as string,
    solutionSessionId: letterData.solutionSessionId as string
  };
}

export async function getUserLetters(userId: string): Promise<Letter[]> {
  const letterIds = await redis.lrange(`user_letters:${userId}`, 0, -1);
  if (!letterIds || letterIds.length === 0) return [];
  
  const letters: Letter[] = [];
  for (const letterId of letterIds) {
    const letter = await getLetter(letterId as string);
    if (letter) {
      letters.push(letter);
    }
  }
  
  return letters;
}

// Legacy - Generated Letter 관련 함수들 (기존 코드 호환성을 위해 유지)
export async function saveGeneratedLetter(userId: string, letterData: any, strengthAnalysisLogId?: string, sessionData?: any): Promise<GeneratedLetter> {
  const letterId = `letter:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const letterRecord: GeneratedLetter = {
    id: letterId,
    userId,
    characterName: letterData.characterName,
    age: letterData.age,
    occupation: letterData.occupation,
    letterContent: letterData.letterContent,
    usedStrengths: letterData.usedStrengths,
    strengthAnalysisLogId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 편지를 Hash로 저장 (세션 데이터 포함)
  const hashData: any = {
    id: letterId,
    userId,
    characterName: letterData.characterName,
    age: letterData.age.toString(),
    occupation: letterData.occupation,
    letterContent: JSON.stringify(letterData.letterContent),
    usedStrengths: JSON.stringify(letterData.usedStrengths),
    strengthAnalysisLogId: strengthAnalysisLogId || "",
    createdAt: letterRecord.createdAt,
    updatedAt: letterRecord.updatedAt
  };

  // 세션 데이터가 있으면 포함
  if (sessionData) {
    hashData.highlightedItems = JSON.stringify(sessionData.highlightedItems || []);
    hashData.strengthItems = JSON.stringify(sessionData.strengthItems || []);
    hashData.reflectionItems = JSON.stringify(sessionData.reflectionItems || []);
    hashData.currentStep = (sessionData.currentStep || 1).toString();
    hashData.sessionCreatedAt = sessionData.createdAt || letterRecord.createdAt;
    hashData.sessionUpdatedAt = sessionData.updatedAt || letterRecord.updatedAt;
  }

  await redis.hset(letterId, hashData);
  
  return letterRecord;
}

export async function getGeneratedLetter(userId: string): Promise<GeneratedLetter | null> {
  // 모든 letter:* 키들을 찾아서 userId로 필터링하여 가장 최근 편지 가져오기
  const letterKeys = await redis.keys('letter:*');
  
  const userLetters: {letter: GeneratedLetter, timestamp: number}[] = [];
  
  for (const letterKey of letterKeys) {
    const letterData = await redis.hgetall(letterKey);
    if (letterData && Object.keys(letterData).length > 0) {
      if (letterData.userId === userId) {
        const letter: GeneratedLetter = {
          id: letterData.id as string,
          userId: letterData.userId as string,
          characterName: letterData.characterName as string,
          age: parseInt(letterData.age as string),
          occupation: letterData.occupation as string,
          letterContent: Array.isArray(letterData.letterContent) ? letterData.letterContent : safeJSONParse(letterData.letterContent as string, []),
          usedStrengths: Array.isArray(letterData.usedStrengths) ? letterData.usedStrengths : safeJSONParse(letterData.usedStrengths as string, []),
          strengthAnalysisLogId: (letterData.strengthAnalysisLogId as string) || undefined,
          createdAt: letterData.createdAt as string,
          updatedAt: letterData.updatedAt as string
        };
        
        // letterId에서 타임스탬프 추출 (letter:1753229183745:5qb2dsbhe 형식)
        const timestamp = parseInt(letterKey.split(':')[1]);
        userLetters.push({letter, timestamp});
      }
    }
  }
  
  if (userLetters.length === 0) return null;
  
  // 타임스탬프로 정렬하여 가장 최근 편지 반환
  userLetters.sort((a, b) => b.timestamp - a.timestamp);
  return userLetters[0].letter;
}

export async function getAllGeneratedLetters(userId: string): Promise<GeneratedLetter[]> {
  // 모든 letter:* 키들을 찾아서 userId로 필터링
  const letterKeys = await redis.keys('letter:*');
  const letters: GeneratedLetter[] = [];
  
  for (const letterKey of letterKeys) {
    const letterData = await redis.hgetall(letterKey);
    if (letterData && Object.keys(letterData).length > 0) {
      if (letterData.userId === userId) {
        const letter: GeneratedLetter = {
          id: letterData.id as string,
          userId: letterData.userId as string,
          characterName: letterData.characterName as string,
          age: parseInt(letterData.age as string),
          occupation: letterData.occupation as string,
          letterContent: Array.isArray(letterData.letterContent) ? letterData.letterContent : safeJSONParse(letterData.letterContent as string, []),
          usedStrengths: Array.isArray(letterData.usedStrengths) ? letterData.usedStrengths : safeJSONParse(letterData.usedStrengths as string, []),
          strengthAnalysisLogId: (letterData.strengthAnalysisLogId as string) || undefined,
          createdAt: letterData.createdAt as string,
          updatedAt: letterData.updatedAt as string
        };
        
        letters.push(letter);
      }
    }
  }
  
  return letters.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Reflection Hints 관련 함수들
export async function saveReflectionHints(sessionId: string, characterName: string, highlightedData: HighlightedItem[], generatedHints: string[]): Promise<ReflectionHints> {
  const hintsId = `hints:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
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

// Writing Step Data functions - Now saves to letter directly
export async function saveWritingStepData(sessionId: string, stepType: 'understanding' | 'strength_finding', highlightedItems: HighlightedItem[], userAnswers: {itemId: string; answers: {question: string; answer: string}[]; timestamp: string}[], letterId?: string): Promise<WritingStepData> {
  try {
    // Create a clean version of highlighted items with only the necessary fields
    const cleanHighlightedItems: HighlightedItem[] = highlightedItems.map(item => ({
      id: item.id,
      text: item.text,
      color: item.color,
      paragraphIndex: item.paragraphIndex
    }));
    
    const stepData: WritingStepData = {
      id: `${stepType}_step:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`,
      sessionId,
      stepType,
      highlightedItems: cleanHighlightedItems,
      userAnswers,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // If letterId is provided, add the step data directly to the letter
    if (letterId) {
      const letterData = await redis.hgetall(letterId);
      if (letterData && Object.keys(letterData).length > 0) {
        // Add step data to letter based on stepType
        const stepFieldName = stepType === 'understanding' ? 'understandingStep' : 'strengthFindingStep';
        const stepData = {
          highlightedItems: cleanHighlightedItems,
          userAnswers,
          completedAt: new Date().toISOString()
        };
        
        await redis.hset(letterId, {
          [stepFieldName]: JSON.stringify(stepData)
        });
      }
    }
    
    // Store the actual data array in session mapping instead of just ID
    const sessionData = stepType === 'understanding' ? 
      highlightedItems.map(item => ({
        id: item.id,
        color: item.color,
        highlightedText: item.text,
        problemReason: item.problemReason || '',
        userExplanation: item.userExplanation || '',
        emotionInference: item.emotionInference || '',
        completedAt: new Date().toISOString()
      })) :
      highlightedItems.map(item => ({
        id: item.id,
        color: item.color,
        highlightedText: item.text,
        strengthDescription: (item as any).strengthDescription || '',
        strengthApplication: (item as any).strengthApplication || '',
        completedAt: new Date().toISOString()
      }));

    // Remove 'session:' prefix from sessionId to avoid duplication
    const cleanSessionId = sessionId.replace(/^session:/, '');
    
    // Store as hash for better structure
    const hashData = {
      sessionId,
      stepType,
      highlightedItems: JSON.stringify(sessionData),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    await redis.hset(`session_${stepType}:${cleanSessionId}`, hashData);
    
    return stepData;
  } catch (error) {
    console.error('Error saving writing step data:', error);
    throw new Error(`Failed to save writing step data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getWritingStepData(sessionId: string, stepType: 'understanding' | 'strength_finding'): Promise<any[]> {
  try {
    // Remove 'session:' prefix from sessionId to avoid duplication
    const cleanSessionId = sessionId.replace(/^session:/, '');
    
    // Try to get from hash first (new format)
    const hashData = await redis.hgetall(`session_${stepType}:${cleanSessionId}`);
    if (hashData && Object.keys(hashData).length > 0 && hashData.highlightedItems) {
      return JSON.parse(hashData.highlightedItems as string);
    }
    
    // Fallback to old string format for backward compatibility
    const sessionData = await redis.get(`session_${stepType}:${cleanSessionId}`);
    if (sessionData && typeof sessionData === 'string') {
      return JSON.parse(sessionData);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting writing step data:', error);
    return [];
  }
}

// Individual Reflection Item functions - using session_reflection hash keys
export async function saveReflectionItem(reflectionItem: ReflectionItem): Promise<ReflectionItem> {
  try {
    // Store each reflection item with its own session_reflection key
    const itemKey = `session_reflection:${reflectionItem.sessionId}:${reflectionItem.id}`;
    
    // Store the reflection item properties as hash fields
    await redis.hset(itemKey, {
      id: reflectionItem.id,
      sessionId: reflectionItem.sessionId,
      content: reflectionItem.content,
      selectedHints: JSON.stringify((reflectionItem as any).selectedHints || []),
      selectedFactors: JSON.stringify((reflectionItem as any).selectedFactors || []),
      inspectionStep: (reflectionItem.inspectionStep || 0).toString(),
      emotionCheckResult: JSON.stringify(reflectionItem.emotionCheckResult || null),
      blameCheckResult: JSON.stringify(reflectionItem.blameCheckResult || null),
      solutionIds: JSON.stringify((reflectionItem as any).solutionIds || []),
      solutionCompleted: (reflectionItem.solutionCompleted || false).toString(),
      itemCreatedAt: reflectionItem.createdAt,
      itemUpdatedAt: reflectionItem.updatedAt,
      completedAt: reflectionItem.completedAt || ''
    });
    
    return reflectionItem;
  } catch (error) {
    console.error('Error saving reflection item:', error);
    throw error;
  }
}

export async function getReflectionItem(reflectionId: string, sessionId?: string): Promise<ReflectionItem | null> {
  try {
    if (!sessionId) {
      // If no sessionId provided, we need to search for it
      // This is less efficient but needed for backward compatibility
      throw new Error('SessionId is required to get reflection item');
    }
    
    // sessionId cleaning
    sessionId = sessionId.replace(/^session:/, '');
    
    // Use individual session_reflection key  
    const itemKey = `session_reflection:${sessionId}:${reflectionId}`;
    
    // Get the specific reflection item
    const itemHash = await redis.hgetall(itemKey);
    
    if (!itemHash || itemHash == null || Object.keys(itemHash).length === 0) {
      return null;
    }

    // Check if the reflection item exists and matches the requested ID
    if (!itemHash.id) {
      console.log('6. No id field in session hash, returning null');
      console.log('=== GETREFLECTIONITEM DEBUG END ===');
      return null;
    }

    // Return the reflection item
    
    return {
      id: itemHash.id as string,
      sessionId: itemHash.sessionId as string,
      content: itemHash.content as string,
      selectedHints: safeJSONParse(itemHash.selectedHints as string, []),
      selectedFactors: safeJSONParse(itemHash.selectedFactors as string, []),
      inspectionStep: itemHash.inspectionStep ? parseInt(itemHash.inspectionStep as string) : 0,
      emotionCheckResult: safeJSONParse(itemHash.emotionCheckResult as string, null) || undefined,
      blameCheckResult: safeJSONParse(itemHash.blameCheckResult as string, null) || undefined,
      completedAt: itemHash.completedAt as string || '',
      createdAt: itemHash.itemCreatedAt as string || itemHash.createdAt as string,
      updatedAt: itemHash.itemUpdatedAt as string || itemHash.updatedAt as string,
      solutionIds: safeJSONParse(itemHash.solutionIds as string, []),
      solutionCompleted: itemHash.solutionCompleted === 'true'
    };
  } catch (error) {
    console.error('Error getting reflection item:', error);
    throw error;
  }
}

export async function updateReflectionItem(reflectionId: string, sessionId: string, updates: Partial<ReflectionItem>): Promise<ReflectionItem> {
  try {
    console.log(`=== UPDATE REFLECTION ITEM DEBUG: ${reflectionId} ===`);
    console.log('Updates received:', updates);
    
    const existing = await getReflectionItem(reflectionId, sessionId);
    if (!existing) {
      throw new Error(`Reflection item ${reflectionId} not found`);
    }
    
    console.log('Existing item before update:', {
      id: existing.id,
      blameCheckResult: existing.blameCheckResult,
      emotionCheckResult: existing.emotionCheckResult
    });

    // Save current state to history before updating
    const historyId = await saveReflectionItemHistory(reflectionId, existing, 'update');
    
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    
    console.log('Updated item before save:', {
      id: updated.id,
      blameCheckResult: updated.blameCheckResult,
      emotionCheckResult: updated.emotionCheckResult
    });
    
    await saveReflectionItem(updated);
    
    // Update history IDs in session metadata if history was saved
    if (historyId) {
      const sessionData = await getReflectionSessionData(sessionId);
      if (sessionData) {
        const updatedHistoryIds = [...(sessionData.metadata.historyIds || []), historyId];
        await saveReflectionSessionMetadata(sessionId, sessionData.metadata.selectedFactors, sessionData.metadata.allGeneratedHints, updatedHistoryIds);
      }
    }
    
    return updated;
  } catch (error) {
    console.error('Error updating reflection item:', error);
    throw error;
  }
}

// Update session metadata on all reflection items
export async function saveReflectionSessionMetadata(sessionId: string, selectedHintData: any[], allGeneratedHints: string[], historyIds: string[] = []): Promise<void> {
  try {
    const cleanSessionId = sessionId.replace(/^session:/, '');
    
    // Get all reflection items for this session
    const itemKeys = await redis.keys(`session_reflection:${cleanSessionId}:*`);
    
    // Transform selectedHintData into factors and hints
    const transformedFactors = selectedHintData.flatMap(item => {
      if (item && typeof item === 'object' && 'selectedFactors' in item) {
        return item.selectedFactors || [];
      }
      return [];
    });
    
    const transformedHints = selectedHintData.flatMap(item => {
      if (item && typeof item === 'object' && 'selectedHints' in item) {
        return item.selectedHints || [];
      }
      return [];
    });
    
    // Update metadata on all reflection items
    const metadataUpdate = {
      selectedFactors: JSON.stringify(transformedFactors),
      selectedHints: JSON.stringify(transformedHints),
      allGeneratedHints: JSON.stringify(allGeneratedHints),
      historyIds: JSON.stringify(historyIds),
      updatedAt: new Date().toISOString()
    };
    
    // Update each reflection item with the session metadata
    for (const itemKey of itemKeys) {
      await redis.hset(itemKey, metadataUpdate);
    }
  } catch (error) {
    console.error('Error saving reflection session metadata:', error);
    throw error;
  }
}

export async function getReflectionSessionData(sessionId: string): Promise<{items: ReflectionItem[], metadata: any} | null> {
  try {
    const cleanSessionId = sessionId.replace(/^session:/, '');
    
    // Get all reflection items for this session
    const itemKeys = await redis.keys(`session_reflection:${cleanSessionId}:*`);
    const items: ReflectionItem[] = [];
    let metadata = {
      selectedFactors: [],
      selectedHints: [],
      allGeneratedHints: [],
      historyIds: []
    };
    
    for (const itemKey of itemKeys) {
      // Extract reflectionId from key: session_reflection:sessionId:reflectionId
      const reflectionId = itemKey.split(':')[2];
      const item = await getReflectionItem(reflectionId, cleanSessionId);
      if (item) {
        items.push(item);
        
        // Get metadata from the first item (all items have the same session metadata)
        if (items.length === 1) {
          const itemHash = await redis.hgetall(itemKey);
          if (itemHash && Object.keys(itemHash).length > 0) {
            metadata = {
              selectedFactors: itemHash.selectedFactors ? safeJSONParse(itemHash.selectedFactors as string, []) : [],
              selectedHints: itemHash.selectedHints ? safeJSONParse(itemHash.selectedHints as string, []) : [],
              allGeneratedHints: itemHash.allGeneratedHints ? safeJSONParse(itemHash.allGeneratedHints as string, []) : [],
              historyIds: itemHash.historyIds ? safeJSONParse(itemHash.historyIds as string, []) : []
            };
          }
        }
      }
    }
    
    return { items, metadata };
  } catch (error) {
    console.error('Error getting reflection session data:', error);
    throw error;
  }
}

// 기존 호환성을 위한 함수들 - 새 구조로 변환
export async function saveReflectionStepData(sessionId: string, reflectionItems: ReflectionItem[], selectedHintData: Array<{reflectionId: string; selectedFactors: string[]; selectedHints: string[]}>, allGeneratedHints: string[]): Promise<any[]> {
  try {
    // Clean reflection items and remove legacy fields
    const cleanedReflectionItems = cleanReflectionItems(reflectionItems);
    const cleanSessionId = sessionId.replace(/^session:/, '');
    
    // Get existing session data to maintain history
    const existingSessionData = await getReflectionSessionData(sessionId);
    
    // Also get historyIds directly from Redis to ensure we have the latest data
    const sessionKey = `session_reflection:${cleanSessionId}`;
    const currentSessionHash = await redis.hgetall(sessionKey);
    const currentHistoryIds: string[] = currentSessionHash && currentSessionHash.historyIds 
      ? safeJSONParse(currentSessionHash.historyIds as string, []) 
      : [];
    
    // If no historyIds found in session data, search for them in Redis directly
    let allHistoryIds: string[] = currentHistoryIds;
    if (currentHistoryIds.length === 0) {
      // Find all history keys for reflection items in this session
      const foundHistoryKeys: string[] = [];
      for (const item of cleanedReflectionItems) {
        const historyKeys = await redis.keys(`history:${item.id}:*`);
        foundHistoryKeys.push(...historyKeys);
      }
      allHistoryIds = foundHistoryKeys;
    }
    
    
    // Save each reflection item individually in session hash
    const processedItems = [];
    
    for (const item of cleanedReflectionItems) {
      // Get existing reflection item to preserve inspection results
      const existingItem = await getReflectionItem(item.id, cleanSessionId);
      
      // Add sessionId to item and preserve inspection results
      const itemWithSession = {
        ...item,
        sessionId: cleanSessionId,
        updatedAt: new Date().toISOString(),
        // Preserve existing inspection results if they exist
        emotionCheckResult: item.emotionCheckResult || existingItem?.emotionCheckResult,
        blameCheckResult: item.blameCheckResult || existingItem?.blameCheckResult,
        inspectionStep: item.inspectionStep || existingItem?.inspectionStep || 0
      };
      
      console.log(`Preserving inspection results for ${item.id}:`, {
        existing_blameCheckResult: existingItem?.blameCheckResult,
        new_blameCheckResult: itemWithSession.blameCheckResult,
        existing_emotionCheckResult: existingItem?.emotionCheckResult,
        new_emotionCheckResult: itemWithSession.emotionCheckResult
      });
      
      // Save individual reflection item to session hash
      await saveReflectionItem(itemWithSession);
      
      // Prepare return data in legacy format
      processedItems.push({
        id: item.id,
        sessionId: cleanSessionId,
        content: item.content,
        inspectionStep: item.inspectionStep || 0,
        emotionCheckResult: item.emotionCheckResult || null,
        blameCheckResult: item.blameCheckResult || null,
        solutionIds: (item as any).solutionIds || [],
        solutionCompleted: item.solutionCompleted || false,
        createdAt: item.createdAt,
        updatedAt: itemWithSession.updatedAt,
        completedAt: new Date().toISOString()
      });
    }
    
    // Save session metadata
    await saveReflectionSessionMetadata(sessionId, selectedHintData, allGeneratedHints, allHistoryIds);
    
    return processedItems;
  } catch (error) {
    console.error('Error saving reflection step data:', error);
    throw error;
  }
}

export async function getReflectionStepData(sessionId: string): Promise<any[]> {
  try {
    // Get reflection session data from hash
    const sessionData = await getReflectionSessionData(sessionId);
    if (!sessionData || !sessionData.items.length) {
      return [];
    }
    
    // Return items in legacy format for compatibility
    return sessionData.items.map(item => ({
      id: item.id,
      content: item.content,
      inspectionStep: item.inspectionStep || 0,
      emotionCheckResult: item.emotionCheckResult || null,
      blameCheckResult: item.blameCheckResult || null,
      solutionIds: (item as any).solutionIds || [],
      solutionCompleted: item.solutionCompleted || false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt
    }));
  } catch (error) {
    console.error('Error getting reflection step data:', error);
    return [];
  }
}

// 버전 관리 기능 제거 - saveReflectionStepData와 동일하게 작동
export async function saveReflectionStepDataWithVersioning(sessionId: string, reflectionItems: ReflectionItem[], selectedHintData: Array<{reflectionId: string; selectedFactors: string[]; selectedHints: string[]}>, allGeneratedHints: string[]): Promise<any[]> {
  return saveReflectionStepData(sessionId, reflectionItems, selectedHintData, allGeneratedHints);
}

export async function getAllReflectionStepVersions(sessionId: string): Promise<any[]> {
  // 버전 관리 기능 제거 - 현재 reflection 데이터만 반환
  return getReflectionStepData(sessionId);
}

// Get individual reflection item from session data

// Save reflection item history - returns historyId for tracking
async function saveReflectionItemHistory(reflectionId: string, currentData: any, action: string): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString();
    const historyId = `history:${reflectionId}:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
    
    // Store history with same key structure as session_reflection
    const historyData = {
      // History metadata (with underscore prefix to distinguish)
      _historyId: historyId,
      _reflectionId: reflectionId,
      _timestamp: timestamp,
      _action: action,
      
      // Exact same structure as session_reflection
      id: currentData.id,
      sessionId: currentData.sessionId,
      content: currentData.content || '',
      selectedHints: JSON.stringify((currentData as any).selectedHints || []),
      selectedFactors: JSON.stringify((currentData as any).selectedFactors || []),
      inspectionStep: (currentData.inspectionStep || 0).toString(),
      emotionCheckResult: JSON.stringify(currentData.emotionCheckResult || null),
      blameCheckResult: JSON.stringify(currentData.blameCheckResult || null),
      solutionIds: JSON.stringify((currentData as any).solutionIds || []),
      solutionCompleted: (currentData.solutionCompleted || false).toString(),
      itemCreatedAt: currentData.createdAt || '',
      itemUpdatedAt: currentData.updatedAt || '',
      completedAt: currentData.completedAt || ''
    };
    
    console.log('About to save history with ID:', historyId);
    console.log('History data:', historyData);
    
    // Store history entry as hash
    await redis.hset(historyId, historyData);
    
    console.log(`History saved successfully with ID: ${historyId}`);
    return historyId;
  } catch (error) {
    console.error('Error saving reflection item history:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    // Don't throw error here to avoid breaking the main update flow
    return null;
  }
}

// Get reflection item update history
export async function getReflectionItemHistory(reflectionId: string, sessionId?: string): Promise<any[]> {
  try {
    let historyIds = [];
    
    if (sessionId) {
      // Get history IDs from session_reflection metadata
      const sessionData = await getReflectionSessionData(sessionId);
      if (sessionData && sessionData.metadata.historyIds) {
        // Filter history IDs for this specific reflection item
        historyIds = sessionData.metadata.historyIds.filter((id: string) => id.includes(`:${reflectionId}:`));
      }
    } else {
      // Fallback: search for history keys matching the reflection ID pattern
      const historyKeys = await redis.keys(`history:${reflectionId}:*`);
      historyIds = historyKeys;
    }
    
    if (historyIds.length === 0) {
      return [];
    }
    
    // Get each history entry
    const historyEntries = [];
    for (const historyId of historyIds) {
      const historyData = await redis.hgetall(historyId);
      if (historyData && Object.keys(historyData).length > 0) {
        historyEntries.push({
          id: historyId,
          timestamp: historyData._timestamp,
          action: historyData._action,
          data: {
            id: historyData.id as string,
            sessionId: historyData.sessionId as string,
            content: historyData.content as string,
            selectedHints: safeJSONParse(historyData.selectedHints as string, []),
            selectedFactors: safeJSONParse(historyData.selectedFactors as string, []),
            inspectionStep: parseInt((historyData.inspectionStep as string) || '0'),
            emotionCheckResult: safeJSONParse(historyData.emotionCheckResult as string, null),
            blameCheckResult: safeJSONParse(historyData.blameCheckResult as string, null) || undefined,
            solutionIds: safeJSONParse(historyData.solutionIds as string, []),
            solutionCompleted: historyData.solutionCompleted === 'true',
            createdAt: (historyData.itemCreatedAt as string) || '',
            updatedAt: (historyData.itemUpdatedAt as string) || '',
            completedAt: (historyData.completedAt as string) || ''
          }
        });
      }
    }
    
    // Sort by timestamp (newest first)
    return historyEntries.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error getting reflection item history:', error);
    return [];
  }
}

// Get reflection item with its history
export async function getReflectionItemWithHistory(reflectionId: string, sessionId?: string): Promise<{item: any, history: any[]} | null> {
  try {
    const [item, history] = await Promise.all([
      getReflectionItem(reflectionId),
      getReflectionItemHistory(reflectionId, sessionId)
    ]);
    
    if (!item) {
      return null;
    }
    
    return { item, history };
  } catch (error) {
    console.error('Error getting reflection item with history:', error);
    return null;
  }
}

// Inspection Data functions - Store inspection results directly in reflection items
// This function should be called AFTER blameCheckResult prompt has been executed
export async function saveInspectionData(sessionId: string, inspectionResults: Array<{reflectionId: string; emotionCheck: any; blameCheck: any}>): Promise<InspectionData> {
  const completedAt = new Date().toISOString();
  const cleanSessionId = sessionId.replace(/^session:/, '');
  
  console.log('saveInspectionData called with:', {
    sessionId,
    inspectionResults: inspectionResults.map(r => ({
      reflectionId: r.reflectionId,
      emotionCheck: typeof r.emotionCheck,
      blameCheck: typeof r.blameCheck,
      emotionCheckValue: r.emotionCheck,
      blameCheckValue: r.blameCheck
    }))
  });
  
  // Update each reflection item with inspection results
  for (const inspectionResult of inspectionResults) {
    try {
      console.log(`Updating reflection item ${inspectionResult.reflectionId} with:`, {
        emotionCheckResult: inspectionResult.emotionCheck,
        blameCheckResult: inspectionResult.blameCheck,
        blameCheckType: typeof inspectionResult.blameCheck,
        blameCheckKeys: inspectionResult.blameCheck ? Object.keys(inspectionResult.blameCheck) : 'null'
      });
      
      // Check if reflection item exists first
      const existingItem = await getReflectionItem(inspectionResult.reflectionId, cleanSessionId);
      console.log(`Existing reflection item for ${inspectionResult.reflectionId}:`, existingItem ? 'found' : 'not found');
      
      if (existingItem) {
        console.log('ID comparison details:', {
          'existingItem.id': existingItem.id,
          'existingItem.id type': typeof existingItem.id,
          'inspectionResult.reflectionId': inspectionResult.reflectionId,
          'inspectionResult.reflectionId type': typeof inspectionResult.reflectionId,
          'are equal (===)': existingItem.id === inspectionResult.reflectionId,
          'are equal (==)': existingItem.id == inspectionResult.reflectionId
        });
      }
      
      if (existingItem && existingItem.id == inspectionResult.reflectionId) {
        // Update existing reflection item with inspection results (same ID)
        const updateData = {
          emotionCheckResult: inspectionResult.emotionCheck,
          blameCheckResult: inspectionResult.blameCheck,
          inspectionStep: 3,
          completedAt: completedAt
        };
        
        console.log(`About to update reflection item ${inspectionResult.reflectionId} with:`, updateData);
        
        try {
          const updatedItem = await updateReflectionItem(inspectionResult.reflectionId, cleanSessionId, updateData);
          console.log(`Successfully updated reflection item ${inspectionResult.reflectionId}:`, {
            id: updatedItem.id,
            updatedAt: updatedItem.updatedAt,
            blameCheckResult: updatedItem.blameCheckResult,
            emotionCheckResult: updatedItem.emotionCheckResult
          });
        } catch (updateError) {
          console.error(`Error updating reflection item ${inspectionResult.reflectionId}:`, updateError);
          throw updateError;
        }
      } else {
        console.log(`Creating new reflection item ${inspectionResult.reflectionId} with inspection results:`, {
          existingItem: existingItem ? 'found' : 'not found',
          existingId: existingItem?.id,
          expectedId: inspectionResult.reflectionId
        });
        
        // Save history of existing item first if it exists (different ID = new reflection item)
        if (existingItem) {
          console.log(`Saving history for existing item ${existingItem.id} before replacing`);
          const historyId = await saveReflectionItemHistory(existingItem.id, existingItem, 'replaced');
          
          // Update session metadata with this history ID
          if (historyId) {
            const sessionData = await getReflectionSessionData(cleanSessionId);
            if (sessionData) {
              const updatedHistoryIds = [...(sessionData.metadata.historyIds || []), historyId];
              await saveReflectionSessionMetadata(cleanSessionId, sessionData.metadata.selectedFactors, sessionData.metadata.allGeneratedHints, updatedHistoryIds);
            }
          }
        }
        
        // Create a new reflection item with inspection results
        const newReflectionItem: ReflectionItem = {
          id: inspectionResult.reflectionId,
          sessionId: cleanSessionId,
          content: existingItem?.content || '', // Preserve existing content if available
          inspectionStep: 3,
          emotionCheckResult: inspectionResult.emotionCheck,
          blameCheckResult: inspectionResult.blameCheck,
          solutionIds: (existingItem as any)?.solutionIds || [],
          solutionCompleted: existingItem?.solutionCompleted || false,
          createdAt: existingItem?.createdAt || completedAt,
          updatedAt: completedAt,
          completedAt: completedAt
        };
        
        await saveReflectionItem(newReflectionItem);
      }
      
      // Verify the update worked
      const updatedItem = await getReflectionItem(inspectionResult.reflectionId, cleanSessionId);
      console.log(`After save/update, reflection item ${inspectionResult.reflectionId} blameCheckResult:`, updatedItem?.blameCheckResult);
    } catch (error) {
      console.error(`Error updating reflection item ${inspectionResult.reflectionId}:`, error);
    }
  }
  
  // Return formatted inspection data for compatibility
  const formattedInspectionResults = inspectionResults.map(result => ({
    reflectionId: result.reflectionId,
    emotionCheck: typeof result.emotionCheck === 'string' 
      ? JSON.parse(result.emotionCheck) 
      : result.emotionCheck,
    blameCheck: typeof result.blameCheck === 'string' 
      ? JSON.parse(result.blameCheck) 
      : result.blameCheck
  }));

  return {
    id: `inspection_${sessionId}_${Date.now()}`,
    sessionId,
    inspectionResults: formattedInspectionResults,
    completedAt,
    createdAt: completedAt
  };
}

export async function getInspectionData(sessionId: string): Promise<InspectionData | null> {
  try {
    // Get reflection items for this session
    const reflectionItems = await getReflectionStepData(sessionId);
    if (!reflectionItems || reflectionItems.length === 0) {
      return null;
    }
    
    // Extract inspection results from reflection items
    const inspectionResults = [];
    let latestCompletedAt = '';
    let earliestCreatedAt = '';
    
    for (const item of reflectionItems) {
      if (item.emotionCheckResult || item.blameCheckResult) {
        inspectionResults.push({
          reflectionId: item.id,
          emotionCheck: item.emotionCheckResult,
          blameCheck: item.blameCheckResult
        });
        
        // Track completion times
        if (item.inspectionCompletedAt) {
          if (!latestCompletedAt || item.inspectionCompletedAt > latestCompletedAt) {
            latestCompletedAt = item.inspectionCompletedAt;
          }
          if (!earliestCreatedAt || item.inspectionCompletedAt < earliestCreatedAt) {
            earliestCreatedAt = item.inspectionCompletedAt;
          }
        }
      }
    }
    
    if (inspectionResults.length === 0) {
      return null;
    }
    
    return {
      id: `inspection_${sessionId}_composite`,
      sessionId,
      inspectionResults,
      completedAt: latestCompletedAt,
      createdAt: earliestCreatedAt || latestCompletedAt
    };
  } catch (error) {
    console.error('Error getting inspection data:', error);
    return null;
  }
}



// Letter Content Data functions
export async function saveLetterContentData(sessionId: string, letterContent: string, strengthKeywords: string[]): Promise<LetterContentData> {
  const letterContentDataId = `letter_content:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
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


// Solution Exploration Data functions
export async function saveSolutionExplorationData(sessionId: string, solutionsByReflection: any[]): Promise<SolutionExplorationData> {
  const solutionDataId = `session_solution_exploration:${sessionId}`;
  
  const solutionData: SolutionExplorationData = {
    id: solutionDataId,
    sessionId,
    solutionsByReflection,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Store data directly as hash in session_solution_exploration
  await redis.hset(solutionDataId, {
    id: solutionData.id,
    sessionId: solutionData.sessionId,
    solutionsByReflection: JSON.stringify(solutionData.solutionsByReflection),
    completedAt: solutionData.completedAt,
    createdAt: solutionData.createdAt
  });
  
  return solutionData;
}

export async function getSolutionExplorationData(sessionId: string): Promise<SolutionExplorationData | null> {
  const solutionDataId = `session_solution_exploration:${sessionId}`;
  
  const solutionHash = await redis.hgetall(solutionDataId);
  if (!solutionHash || Object.keys(solutionHash).length === 0) return null;
  
  return {
    id: solutionHash.id as string,
    sessionId: solutionHash.sessionId as string,
    solutionsByReflection: safeJSONParse(solutionHash.solutionsByReflection as string, []),
    completedAt: solutionHash.completedAt as string,
    createdAt: solutionHash.createdAt as string
  };
}

// AI Strength Tags Data functions
export async function saveAIStrengthTagsData(sessionId: string, strengthTagsByReflection: any[]): Promise<AIStrengthTagsData> {
  const strengthTagsDataId = `ai_strength_tags:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const strengthTagsData: AIStrengthTagsData = {
    id: strengthTagsDataId,
    sessionId,
    strengthTagsByReflection,
    createdAt: new Date().toISOString()
  };

  // Store data as hash instead of JSON string
  await redis.hset(strengthTagsDataId, {
    id: strengthTagsData.id,
    sessionId: strengthTagsData.sessionId,
    strengthTagsByReflection: JSON.stringify(strengthTagsData.strengthTagsByReflection),
    createdAt: strengthTagsData.createdAt
  });
  
  return strengthTagsData;
}

export async function getAIStrengthTagsData(sessionId: string): Promise<AIStrengthTagsData | null> {
  // Search through ai_strength_tags entries to find matching sessionId
  const strengthTagsKeys = await redis.keys('ai_strength_tags:*');
  
  for (const key of strengthTagsKeys) {
    const strengthTagsHash = await redis.hgetall(key);
    if (!strengthTagsHash || Object.keys(strengthTagsHash).length === 0) continue;
    
    if (strengthTagsHash.sessionId === sessionId) {
      return {
        id: strengthTagsHash.id as string,
        sessionId: strengthTagsHash.sessionId as string,
        strengthTagsByReflection: safeJSONParse(strengthTagsHash.strengthTagsByReflection as string, []),
        createdAt: strengthTagsHash.createdAt as string
      };
    }
  }
  
  return null;
}

// Magic Mix Interaction Data functions
export async function saveMagicMixInteractionData(sessionId: string, interactions: any[], totalMixCount: number, totalSolutionsAdded: number): Promise<MagicMixInteractionData> {
  const mixDataId = `magic_mix:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const mixData: MagicMixInteractionData = {
    id: mixDataId,
    sessionId,
    interactions,
    totalMixCount,
    totalSolutionsAdded,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store data as hash instead of JSON string
  await redis.hset(mixDataId, {
    id: mixData.id,
    sessionId: mixData.sessionId,
    interactions: JSON.stringify(mixData.interactions),
    totalMixCount: mixData.totalMixCount.toString(),
    totalSolutionsAdded: mixData.totalSolutionsAdded.toString(),
    createdAt: mixData.createdAt,
    updatedAt: mixData.updatedAt
  });
  
  return mixData;
}

export async function getMagicMixInteractionData(sessionId: string): Promise<MagicMixInteractionData | null> {
  // Search through magic_mix entries to find matching sessionId
  const mixDataKeys = await redis.keys('magic_mix:*');
  
  for (const key of mixDataKeys) {
    const mixDataHash = await redis.hgetall(key);
    if (!mixDataHash || Object.keys(mixDataHash).length === 0) continue;
    
    if (mixDataHash.sessionId === sessionId) {
      return {
        id: mixDataHash.id as string,
        sessionId: mixDataHash.sessionId as string,
        interactions: safeJSONParse(mixDataHash.interactions as string, []),
        totalMixCount: parseInt(mixDataHash.totalMixCount as string) || 0,
        totalSolutionsAdded: parseInt(mixDataHash.totalSolutionsAdded as string) || 0,
        createdAt: mixDataHash.createdAt as string,
        updatedAt: mixDataHash.updatedAt as string
      };
    }
  }
  
  return null;
}

export async function updateMagicMixInteractionData(sessionId: string, interactions: any[], totalMixCount: number, totalSolutionsAdded: number): Promise<void> {
  // Get existing data using the new search method
  const existingData = await getMagicMixInteractionData(sessionId);
  if (!existingData) {
    await saveMagicMixInteractionData(sessionId, interactions, totalMixCount, totalSolutionsAdded);
    return;
  }
  
  // Update the existing data in hash format
  await redis.hset(existingData.id, {
    interactions: JSON.stringify(interactions),
    totalMixCount: totalMixCount.toString(),
    totalSolutionsAdded: totalSolutionsAdded.toString(),
    updatedAt: new Date().toISOString()
  });
}

// Response Letter Data functions
export async function saveResponseLetterData(sessionId: string, originalGeneratedLetter: string, finalEditedLetter: string, characterName: string, userNickname: string, generatedAt: string, letterId?: string): Promise<ResponseLetterData> {
  const responseLetterDataId = `response_letter:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
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

  // Store data as hash instead of JSON string
  await redis.hset(responseLetterDataId, {
    id: responseLetterData.id,
    sessionId: responseLetterData.sessionId,
    originalGeneratedLetter: responseLetterData.originalGeneratedLetter,
    finalEditedLetter: responseLetterData.finalEditedLetter,
    characterName: responseLetterData.characterName,
    userNickname: responseLetterData.userNickname,
    generatedAt: responseLetterData.generatedAt,
    finalizedAt: responseLetterData.finalizedAt,
    createdAt: responseLetterData.createdAt
  });
  
  
  // 편지별 답장 데이터 연결 추가
  if (letterId) {
    await redis.set(`letter_response:${letterId}`, responseLetterDataId);
  }
  
  return responseLetterData;
}


// 편지별 답장 데이터 조회 함수
export async function getResponseLetterByLetter(letterId: string): Promise<ResponseLetterData | null> {
  const responseLetterDataId = await redis.get(`letter_response:${letterId}`);
  if (!responseLetterDataId) return null;
  
  const responseLetterHash = await redis.hgetall(responseLetterDataId as string);
  if (!responseLetterHash || Object.keys(responseLetterHash).length === 0) return null;
  
  return {
    id: responseLetterHash.id as string,
    sessionId: responseLetterHash.sessionId as string,
    originalGeneratedLetter: responseLetterHash.originalGeneratedLetter as string,
    finalEditedLetter: responseLetterHash.finalEditedLetter as string,
    characterName: responseLetterHash.characterName as string,
    userNickname: responseLetterHash.userNickname as string,
    generatedAt: responseLetterHash.generatedAt as string,
    finalizedAt: responseLetterHash.finalizedAt as string,
    createdAt: responseLetterHash.createdAt as string
  };
}

// letterId 기반 writing 로그 조회 함수
export async function getWritingLogsByLetterId(letterId: string): Promise<{
  understandingStep: any[] | null;
  strengthStep: any[] | null;
  reflectionStep: any[] | null;
  reflectionStepVersions: any[];
  magicMixData: MagicMixInteractionData | null;
  solutionExploration: SolutionExplorationData | null;
  inspectionData: InspectionData | null;
  letterContentData: LetterContentData | null;
  aiStrengthTagsData: AIStrengthTagsData | null;
}> {
  const sessionId = await getLetterSessionByLetterId(letterId);
  
  if (!sessionId) {
    return {
      understandingStep: null,
      strengthStep: null,
      reflectionStep: null,
      reflectionStepVersions: [],
      magicMixData: null,
      solutionExploration: null,
      inspectionData: null,
      letterContentData: null,
      aiStrengthTagsData: null
    };
  }
  
  try {
    const [
      understandingStep,
      strengthStep,
      reflectionStep,
      reflectionVersions,
      magicMixData,
      solutionExploration,
      inspectionData,
      letterContentData,
      aiStrengthTagsData
    ] = await Promise.all([
      getWritingStepData(sessionId, 'understanding'),
      getWritingStepData(sessionId, 'strength_finding'),
      getReflectionStepData(sessionId),
      getAllReflectionStepVersions(sessionId),
      getMagicMixInteractionData(sessionId),
      getSolutionExplorationData(sessionId),
      getInspectionData(sessionId),
      getLetterContentData(sessionId),
      getAIStrengthTagsData(sessionId)
    ]);
    
    return {
      understandingStep,
      strengthStep,
      reflectionStep,
      reflectionStepVersions: reflectionVersions,
      magicMixData,
      solutionExploration,
      inspectionData,
      letterContentData,
      aiStrengthTagsData
    };
  } catch (error) {
    console.error(`Error getting writing logs for letter ${letterId}:`, error);
    return {
      understandingStep: null,
      strengthStep: null,
      reflectionStep: null,
      reflectionStepVersions: [],
      magicMixData: null,
      solutionExploration: null,
      inspectionData: null,
      letterContentData: null,
      aiStrengthTagsData: null
    };
  }
}

// 편지별 모든 writing 로그 조회 함수 (기존 answersId 기반)
export async function getWritingLogsByLetter(letterId: string): Promise<{
  understandingStep: any[] | null;
  strengthStep: any[] | null;
  reflectionStep: any[] | null;
  reflectionStepVersions: any[];
  magicMixData: MagicMixInteractionData | null;
  solutionExploration: SolutionExplorationData | null;
  inspectionData: InspectionData | null;
  letterContentData: LetterContentData | null;
  aiStrengthTagsData: AIStrengthTagsData | null;
}> {
  const sessionId = await getLetterSessionId(letterId);
  
  if (!sessionId) {
    return {
      understandingStep: null,
      strengthStep: null,
      reflectionStep: null,
      reflectionStepVersions: [],
      magicMixData: null,
      solutionExploration: null,
      inspectionData: null,
      letterContentData: null,
      aiStrengthTagsData: null
    };
  }
  
  try {
    const [
      understandingStep,
      strengthStep,
      reflectionStep,
      reflectionVersions,
      magicMixData,
      solutionExploration,
      inspectionData,
      letterContentData,
      aiStrengthTagsData
    ] = await Promise.all([
      getWritingStepData(sessionId, 'understanding'),
      getWritingStepData(sessionId, 'strength_finding'),
      getReflectionStepData(sessionId),
      getAllReflectionStepVersions(sessionId),
      getMagicMixInteractionData(sessionId),
      getSolutionExplorationData(sessionId),
      getInspectionData(sessionId),
      getLetterContentData(sessionId),
      getAIStrengthTagsData(sessionId)
    ]);
    
    return {
      understandingStep,
      strengthStep,
      reflectionStep,
      reflectionStepVersions: reflectionVersions,
      magicMixData,
      solutionExploration,
      inspectionData,
      letterContentData,
      aiStrengthTagsData
    };
  } catch (error) {
    console.error(`Error getting writing logs for letter ${letterId}:`, error);
    return {
      understandingStep: null,
      strengthStep: null,
      reflectionStep: null,
      reflectionStepVersions: [],
      magicMixData: null,
      solutionExploration: null,
      inspectionData: null,
      letterContentData: null,
      aiStrengthTagsData: null
    };
  }
}

// ===== UnderstandingSession 관련 함수들 =====
export async function createUnderstandingSession(letterId: string, highlightedItems: CleanHighlightedItem[]): Promise<UnderstandingSession> {
  const understandingSessionId = `understanding_session:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const now = new Date().toISOString();
  const session: UnderstandingSession = {
    understandingSessionId,
    letterId,
    highlightedItems,
    createdAt: now,
    updatedAt: now
  };

  await redis.set(understandingSessionId, JSON.stringify(session));
  
  // letterId와 매핑
  await redis.set(`understanding_session_by_letter:${letterId}`, understandingSessionId);
  
  return session;
}

export async function getUnderstandingSessionByLetter(letterId: string): Promise<UnderstandingSession | null> {
  try {
    const sessionId = await redis.get(`understanding_session_by_letter:${letterId}`);
    if (!sessionId) return null;
    
    const sessionData = await redis.get(sessionId as string);
    if (!sessionData) return null;
    
    return typeof sessionData === "object" ? sessionData as UnderstandingSession : JSON.parse(sessionData as string) as UnderstandingSession;
  } catch (error) {
    console.error("Error getting understanding session:", error);
    return null;
  }
}

export async function getUnderstandingSession(understandingSessionId: string): Promise<UnderstandingSession | null> {
  try {
    const sessionData = await redis.get(understandingSessionId);
    if (!sessionData) {
      return null;
    }
    return typeof sessionData === "object" ? sessionData as UnderstandingSession : JSON.parse(sessionData as string) as UnderstandingSession;
  } catch (error) {
    console.error("Error getting understanding session:", error);
    return null;
  }
}

export async function updateUnderstandingSession(understandingSessionId: string, highlightedItems: CleanHighlightedItem[]): Promise<void> {
  try {
    const sessionData = await redis.get(understandingSessionId);
    if (!sessionData) throw new Error("Understanding session not found");
    
    const session = typeof sessionData === "object" ? sessionData as UnderstandingSession : JSON.parse(sessionData as string) as UnderstandingSession;
    session.highlightedItems = highlightedItems;
    
    await redis.set(understandingSessionId, JSON.stringify(session));
  } catch (error) {
    console.error("Error updating understanding session:", error);
    throw error;
  }
}

// ===== StrengthFindingSession 관련 함수들 =====
export async function createStrengthFindingSession(letterId: string, highlightedItems: CleanStrengthItem[]): Promise<StrengthFindingSession> {
  const strengthFindingSessionId = `strength_finding_session:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  
  const now = new Date().toISOString();
  const session: StrengthFindingSession = {
    strengthFindingSessionId,
    letterId,
    highlightedItems,
    createdAt: now,
    updatedAt: now
  };

  await redis.set(strengthFindingSessionId, JSON.stringify(session));
  
  // letterId와 매핑
  await redis.set(`strength_finding_session_by_letter:${letterId}`, strengthFindingSessionId);
  
  return session;
}

export async function getStrengthFindingSessionByLetter(letterId: string): Promise<StrengthFindingSession | null> {
  try {
    const sessionId = await redis.get(`strength_finding_session_by_letter:${letterId}`);
    if (!sessionId) return null;
    
    const sessionData = await redis.get(sessionId as string);
    if (!sessionData) return null;
    
    return typeof sessionData === "object" ? sessionData as StrengthFindingSession : JSON.parse(sessionData as string) as StrengthFindingSession;
  } catch (error) {
    console.error("Error getting strength finding session:", error);
    return null;
  }
}

export async function getStrengthFindingSession(strengthFindingSessionId: string): Promise<StrengthFindingSession | null> {
  try {
    const sessionData = await redis.get(strengthFindingSessionId);
    if (!sessionData) {
      return null;
    }
    return typeof sessionData === "object" ? sessionData as StrengthFindingSession : JSON.parse(sessionData as string) as StrengthFindingSession;
  } catch (error) {
    console.error("Error getting strength finding session:", error);
    return null;
  }
}

export async function updateStrengthFindingSession(strengthFindingSessionId: string, highlightedItems: CleanStrengthItem[]): Promise<void> {
  try {
    const sessionData = await redis.get(strengthFindingSessionId);
    if (!sessionData) throw new Error("Strength finding session not found");
    
    const session = typeof sessionData === "object" ? sessionData as StrengthFindingSession : JSON.parse(sessionData as string) as StrengthFindingSession;
    session.highlightedItems = highlightedItems;
    
    await redis.set(strengthFindingSessionId, JSON.stringify(session));
  } catch (error) {
    console.error("Error updating strength finding session:", error);
    throw error;
  }
}

export async function createOrUpdateUnderstandingSession(sessionId: string, highlightedItems: CleanHighlightedItem[]): Promise<UnderstandingSession> {
  try {
    const existing = await getUnderstandingSession(sessionId);
    if (existing) {
      await updateUnderstandingSession(sessionId, highlightedItems);
      return await getUnderstandingSession(sessionId) as UnderstandingSession;
    } else {
      // Create new session - we need letterId for this
      throw new Error("Cannot create new session without letterId");
    }
  } catch (error) {
    console.error("Error creating or updating understanding session:", error);
    throw error;
  }
}

export async function createOrUpdateStrengthFindingSession(sessionId: string, highlightedItems: CleanStrengthItem[]): Promise<StrengthFindingSession> {
  try {
    const existing = await getStrengthFindingSession(sessionId);
    if (existing) {
      await updateStrengthFindingSession(sessionId, highlightedItems);
      return await getStrengthFindingSession(sessionId) as StrengthFindingSession;
    } else {
      // Create new session - we need letterId for this
      throw new Error("Cannot create new session without letterId");
    }
  } catch (error) {
    console.error("Error creating or updating strength finding session:", error);
    throw error;
  }
}

// Reflection Support Hints 관련 함수들
export async function saveReflectionSupportHints(userId: string, newKeywords: string[]): Promise<ReflectionSupportHints> {
  try {
    // 기존 키워드 데이터 가져오기
    const existingData = await getReflectionSupportHints(userId);
    
    if (existingData) {
      // 기존 데이터가 있으면 새로운 키워드 배열을 추가
      const updatedKeywords = [...existingData.keywords, newKeywords]; // 2차원 배열에 새 배열 추가
      
      const updatedData: ReflectionSupportHints = {
        ...existingData,
        keywords: updatedKeywords
      };
      
      // Hash 데이터 업데이트
      await redis.hset(existingData.id, {
        keywords: updatedKeywords
      });
      
      return updatedData;
    } else {
      // 새로운 데이터 생성
      const keywordId = `reflection_hints:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
      
      const keywordData: ReflectionSupportHints = {
        id: keywordId,
        userId,
        keywords: [newKeywords], // 첫 번째 키워드 배열을 2차원 배열로 감싸기
        createdAt: new Date().toISOString()
      };
      
      // Hash로 저장
      await redis.hset(keywordId, {
        id: keywordId,
        userId,
        keywords: [newKeywords], // 2차원 배열로 저장
        createdAt: keywordData.createdAt
      });
      
      return keywordData;
    }
  } catch (error) {
    console.error('Error saving reflection support keywords:', error);
    throw error;
  }
}

export async function getReflectionSupportHints(userId: string): Promise<ReflectionSupportHints | null> {
  try {
    // 모든 reflection_hints:* 키들을 찾아서 userId로 필터링
    const keywordKeys = await redis.keys('reflection_hints:*');
    
    for (const keywordKey of keywordKeys) {
      const keywordData = await redis.hgetall(keywordKey);
      if (keywordData && keywordData.userId === userId) {
        // 2차원 배열 처리
        let keywords: string[][] = [];
        if (Array.isArray(keywordData.keywords)) {
          // 이미 2차원 배열인지 확인
          if (keywordData.keywords.length > 0 && Array.isArray(keywordData.keywords[0])) {
            keywords = keywordData.keywords as string[][];
          } else {
            // 1차원 배열이면 2차원으로 변환 (기존 데이터 호환성)
            keywords = [keywordData.keywords as string[]];
          }
        } else {
          // 문자열인 경우 파싱
          const parsed = safeJSONParse(keywordData.keywords as string, []);
          keywords = Array.isArray(parsed[0]) ? parsed : [parsed];
        }
        
        return {
          id: keywordData.id as string,
          userId: keywordData.userId as string,
          keywords: keywords,
          createdAt: keywordData.createdAt as string
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting reflection support keywords:', error);
    return null;
  }
}

// Save completion history - called when user completes a reflection
export async function saveCompletionHistory(reflectionId: string, sessionId: string, action: string = 'completed'): Promise<string | null> {
  try {
    // Clean session ID (remove session: prefix if present)
    const cleanSessionId = sessionId.replace(/^session:/, '');
    
    // Get current reflection item state using the new structure
    const currentItem = await getReflectionItem(reflectionId, cleanSessionId);
    
    if (!currentItem) {
      console.error(`Cannot save completion history: reflection item ${reflectionId} not found`);
      return null;
    }
    
    // Save current state as completion history
    const historyId = await saveReflectionItemHistory(reflectionId, currentItem, action);
    
    if (historyId) {
      // Update session metadata with this history ID
      const sessionData = await getReflectionSessionData(cleanSessionId);
      if (sessionData) {
        const updatedHistoryIds = [...(sessionData.metadata.historyIds || []), historyId];
        await saveReflectionSessionMetadata(cleanSessionId, sessionData.metadata.selectedFactors, sessionData.metadata.allGeneratedHints, updatedHistoryIds);
      }
      
      console.log(`Completion history saved successfully with ID: ${historyId}`);
    }
    
    return historyId;
  } catch (error) {
    console.error('Error saving completion history:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}

// Test function to list all reflection sessions
export async function listReflectionSessions(): Promise<string[]> {
  try {
    const sessionKeys = await redis.keys('session_reflection:*');
    console.log(`Found ${sessionKeys.length} reflection session keys:`, sessionKeys);
    
    // Test any existing session
    if (sessionKeys.length > 0) {
      const testSessionKey = sessionKeys[0];
      const sessionId = testSessionKey.replace('session_reflection:', '');
      console.log(`=== TESTING SESSION ${sessionId} ===`);
      const sessionData = await redis.hgetall(testSessionKey);
      if (sessionData && Object.keys(sessionData).length > 0) {
        console.log('Session data keys:', Object.keys(sessionData));
        console.log('blameCheckResult raw:', sessionData.blameCheckResult);
        console.log('blameCheckResult type:', typeof sessionData.blameCheckResult);
        console.log('emotionCheckResult raw:', sessionData.emotionCheckResult);
        console.log('inspectionStep raw:', sessionData.inspectionStep);
        
        if (sessionData.blameCheckResult) {
          try {
            const parsed = JSON.parse(sessionData.blameCheckResult as string);
            console.log('blameCheckResult parsed:', parsed);
          } catch (e) {
            console.log('blameCheckResult parse error:', e);
          }
        }
      }
    }
    
    return sessionKeys;
  } catch (error) {
    console.error('Error listing reflection sessions:', error);
    return [];
  }
}
