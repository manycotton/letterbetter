import { Redis } from '@upstash/redis';
import { 
  createOrUpdateUnderstandingSession, 
  createOrUpdateStrengthFindingSession 
} from './database/sessions';

const redis = Redis.fromEnv();

interface OldWritingStep {
  id: string;
  sessionId: string;
  stepType: 'understanding' | 'strength_finding';
  highlightedItems: Array<{
    id: string;
    text: string;
    color: string;
    paragraphIndex: number;
    problemReason?: string;
    userExplanation?: string;
    emotionInference?: string;
    strengthDescription?: string;
    strengthApplication?: string;
  }>;
  userAnswers: Array<{
    itemId: string;
    answers: Array<{
      question: string;
      answer: string;
    }>;
    timestamp: string;
  }>;
  completedAt: string;
  createdAt: string;
}

export async function migrateOldSessionsToNewFormat() {
  try {
    // Get all writing step keys
    const keys = await redis.keys('writing_step:*');
    
    for (const key of keys) {
      const data = await redis.get<string>(key);
      if (!data) continue;
      
      const step: OldWritingStep = JSON.parse(data);
      const letterId = step.sessionId.split(':')[1];
      
      if (step.stepType === 'understanding') {
        // Migrate understanding step
        const cleanItems = step.highlightedItems.map(item => ({
          id: item.id,
          color: item.color,
          highlightedText: item.text,
          problemReason: item.problemReason,
          userExplanation: item.userExplanation,
          emotionInference: item.emotionInference,
          completedAt: step.completedAt
        }));
        
        await createOrUpdateUnderstandingSession(letterId, cleanItems);
        console.log(`Migrated understanding session for letter ${letterId}`);
        
      } else if (step.stepType === 'strength_finding') {
        // Migrate strength finding step
        const cleanItems = step.highlightedItems.map(item => ({
          id: item.id,
          color: item.color,
          highlightedText: item.text,
          strengthDescription: item.strengthDescription,
          strengthApplication: item.strengthApplication,
          completedAt: step.completedAt
        }));
        
        await createOrUpdateStrengthFindingSession(letterId, cleanItems);
        console.log(`Migrated strength finding session for letter ${letterId}`);
      }
    }
    
    return { success: true, message: `Migrated ${keys.length} sessions` };
    
  } catch (error) {
    console.error('Migration error:', error);
    return { 
      success: false, 
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Add this endpoint to run the migration
// Create a new file at: pages/api/migrate/sessions.ts
/*
import { migrateOldSessionsToNewFormat } from '../../../lib/migrateToSessions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const result = await migrateOldSessionsToNewFormat();
  res.status(result.success ? 200 : 500).json(result);
}
*/
