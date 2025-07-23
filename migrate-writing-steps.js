const { Redis } = require('@upstash/redis');
const fs = require('fs');

// .env.local 파일 로드
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envFileContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envFileContent.split('\n');
  
  envLines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, value] = trimmedLine.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// 환경 변수 확인
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error('Redis configuration is incomplete');
}

const redis = new Redis({
  url: url,
  token: token,
});

async function migrateWritingSteps() {
  try {
    console.log('🔄 Starting writing steps migration...');
    
    // 모든 키 조회
    const keys = await redis.keys('*');
    console.log('Found total keys:', keys.length);
    
    // writing_step:* 키들 찾기
    const writingStepKeys = keys.filter(key => key.startsWith('writing_step:'));
    console.log(`Found ${writingStepKeys.length} writing_step keys`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const key of writingStepKeys) {
      try {
        console.log(`Processing: ${key}`);
        
        // 기존 데이터 조회
        const writingStepData = await redis.get(key);
        if (!writingStepData) {
          console.log(`❌ No data found for ${key}`);
          continue;
        }
        
        const stepData = typeof writingStepData === 'string' ? JSON.parse(writingStepData) : writingStepData;
        
        // letterId를 찾기 위해 sessionId로 session 조회
        const sessionData = await redis.get(stepData.sessionId);
        if (!sessionData) {
          console.log(`❌ Session not found for ${stepData.sessionId}`);
          continue;
        }
        
        const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
        
        // letter_session에서 letterId 찾기
        const letterSessionKey = `letter_session:${session.userId}`;
        const letterSessionId = await redis.get(letterSessionKey);
        if (!letterSessionId) {
          console.log(`❌ Letter session not found for ${session.userId}`);
          continue;
        }
        
        // 실제 letter 찾기
        const allKeys = await redis.keys('letter:*');
        let letterId = null;
        
        for (const letterKey of allKeys) {
          const letterData = await redis.get(letterKey);
          if (letterData) {
            const letter = typeof letterData === 'string' ? JSON.parse(letterData) : letterData;
            if (letter.userId === session.userId) {
              letterId = letter.id;
              break;
            }
          }
        }
        
        if (!letterId) {
          console.log(`❌ Letter not found for userId ${session.userId}`);
          continue;
        }
        
        console.log(`Found letterId: ${letterId} for step: ${stepData.stepType}`);
        
        if (stepData.stepType === 'understanding') {
          // UnderstandingSession 생성
          const understandingSessionId = `understanding_session:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
          
          const cleanItems = stepData.highlightedItems.map(item => ({
            id: item.id,
            color: item.color,
            highlightedText: item.text,
            problemReason: item.problemReason,
            userExplanation: item.userExplanation,
            emotionInference: item.emotionInference,
            completedAt: stepData.completedAt || stepData.createdAt
          }));
          
          const understandingSession = {
            understandingSessionId,
            letterId,
            highlightedItems: cleanItems
          };
          
          // 새로운 understanding session 저장
          await redis.set(understandingSessionId, JSON.stringify(understandingSession));
          await redis.set(`understanding_session_by_letter:${letterId}`, understandingSessionId);
          
          console.log(`✅ Created understanding session: ${understandingSessionId}`);
          
        } else if (stepData.stepType === 'strength_finding') {
          // StrengthFindingSession 생성
          const strengthFindingSessionId = `strength_finding_session:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
          
          const cleanItems = stepData.highlightedItems.map(item => ({
            id: item.id,
            color: item.color,
            highlightedText: item.text,
            strengthDescription: item.strengthDescription,
            strengthApplication: item.strengthApplication,
            completedAt: stepData.completedAt || stepData.createdAt
          }));
          
          const strengthFindingSession = {
            strengthFindingSessionId,
            letterId,
            highlightedItems: cleanItems
          };
          
          // 새로운 strength finding session 저장
          await redis.set(strengthFindingSessionId, JSON.stringify(strengthFindingSession));
          await redis.set(`strength_finding_session_by_letter:${letterId}`, strengthFindingSessionId);
          
          console.log(`✅ Created strength finding session: ${strengthFindingSessionId}`);
        }
        
        // 기존 writing_step 삭제
        await redis.del(key);
        console.log(`🗑️ Deleted old writing_step: ${key}`);
        
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing ${key}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} writing steps`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🧹 Deleted ${migratedCount} old writing_step keys`);
    
    // 최종 결과 확인
    const finalKeys = await redis.keys('*');
    const understandingSessions = finalKeys.filter(key => key.startsWith('understanding_session:')).length;
    const strengthFindingSessions = finalKeys.filter(key => key.startsWith('strength_finding_session:')).length;
    const remainingWritingSteps = finalKeys.filter(key => key.startsWith('writing_step:')).length;
    
    console.log(`\\n📈 Final Status:`);
    console.log(`Understanding sessions: ${understandingSessions}`);
    console.log(`Strength finding sessions: ${strengthFindingSessions}`);
    console.log(`Remaining writing steps: ${remainingWritingSteps}`);
    
    console.log('\\n✨ Migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateWritingSteps();