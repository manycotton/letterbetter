import { Redis } from '@upstash/redis';
import { 
  UnderstandingSession, 
  StrengthFindingSession,
  CleanHighlightedItem,
  CleanStrengthItem
} from '../../types/database';

const redis = Redis.fromEnv();

// Understanding Session Functions
export async function createOrUpdateUnderstandingSession(
  sessionId: string,
  highlightedItems: CleanHighlightedItem[]
): Promise<UnderstandingSession> {
  const sessionKey = `understanding_session:${sessionId}`;
  const now = new Date().toISOString();
  
  const session: UnderstandingSession = {
    understandingSessionId: sessionKey,
    letterId: sessionId,
    highlightedItems: highlightedItems.map(item => ({
      ...item,
      completedAt: item.completedAt || now
    })),
    updatedAt: now,
    createdAt: now
  };

  await redis.set(sessionKey, JSON.stringify(session));
  return session;
}

export async function getUnderstandingSession(sessionId: string): Promise<UnderstandingSession | null> {
  const sessionKey = `understanding_session:${sessionId}`;
  const session = await redis.get<string>(sessionKey);
  
  if (!session) return null;
  
  return JSON.parse(session);
}

// Strength Finding Session Functions
export async function createOrUpdateStrengthFindingSession(
  sessionId: string,
  highlightedItems: CleanStrengthItem[]
): Promise<StrengthFindingSession> {
  const sessionKey = `strength_session:${sessionId}`;
  const now = new Date().toISOString();
  
  const session: StrengthFindingSession = {
    strengthFindingSessionId: sessionKey,
    letterId: sessionId,
    highlightedItems: highlightedItems.map(item => ({
      ...item,
      completedAt: item.completedAt || now
    })),
    updatedAt: now,
    createdAt: now
  };

  await redis.set(sessionKey, JSON.stringify(session));
  return session;
}

export async function getStrengthFindingSession(sessionId: string): Promise<StrengthFindingSession | null> {
  const sessionKey = `strength_session:${sessionId}`;
  const session = await redis.get<string>(sessionKey);
  
  if (!session) return null;
  
  return JSON.parse(session);
}
