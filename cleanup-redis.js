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

async function cleanupRedis() {
  try {
    console.log('🧹 Starting Redis cleanup...');
    
    // 모든 키 조회
    const keys = await redis.keys('*');
    console.log('Found total keys:', keys.length);
    
    // 1. answers:* 키들 제거
    console.log('\n📝 Cleaning up answers:* keys...');
    const answersKeys = keys.filter(key => key.startsWith('answers:'));
    console.log(`Found ${answersKeys.length} answers keys`);
    
    for (const key of answersKeys) {
      await redis.del(key);
      console.log(`✅ Deleted: ${key}`);
    }
    
    // 2. nickname:* 키들 제거
    console.log('\n👤 Cleaning up nickname:* keys...');
    const nicknameKeys = keys.filter(key => key.startsWith('nickname:'));
    console.log(`Found ${nicknameKeys.length} nickname keys`);
    
    for (const key of nicknameKeys) {
      await redis.del(key);
      console.log(`✅ Deleted: ${key}`);
    }
    
    // 3. user_letters:* 키들 제거
    console.log('\n📮 Cleaning up user_letters:* keys...');
    const userLettersKeys = keys.filter(key => key.startsWith('user_letters:'));
    console.log(`Found ${userLettersKeys.length} user_letters keys`);
    
    for (const key of userLettersKeys) {
      await redis.del(key);
      console.log(`✅ Deleted: ${key}`);
    }
    
    // 4. user_strength_analysis:* 키들 제거
    console.log('\n💪 Cleaning up user_strength_analysis:* keys...');
    const userStrengthKeys = keys.filter(key => key.startsWith('user_strength_analysis:'));
    console.log(`Found ${userStrengthKeys.length} user_strength_analysis keys`);
    
    for (const key of userStrengthKeys) {
      await redis.del(key);
      console.log(`✅ Deleted: ${key}`);
    }
    
    // 3. user:* 키들 처리 (JSON to Hash 변환)
    console.log('\n👥 Processing user:* keys (JSON → Hash)...');
    const userKeys = keys.filter(key => key.startsWith('user:'));
    console.log(`Found ${userKeys.length} user keys`);
    
    for (const key of userKeys) {
      if (key.startsWith('user:')) {
        try {
          console.log(`Processing user key: ${key}`);
          
          // JSON으로 조회 시도
          const jsonData = await redis.get(key);
          if (jsonData) {
            console.log(`Converting JSON to Hash for key: ${key}`);
            console.log(`Raw data type: ${typeof jsonData}`);
            console.log(`Raw data preview: ${JSON.stringify(jsonData).substring(0, 100)}...`);
            
            // JSON 데이터를 파싱
            let user;
            if (typeof jsonData === 'string') {
              user = JSON.parse(jsonData);
            } else {
              user = jsonData; // 이미 객체인 경우
            }
            
            // JSON 키 삭제
            await redis.del(key);
            console.log(`Deleted JSON key: ${key}`);
            
            // Hash 형태로 다시 저장
            await redis.hset(key, {
              userId: user.userId,
              nickname: user.nickname,
              password: user.password,
              userIntroduction: user.userIntroduction || "",
              userStrength: JSON.stringify(user.userStrength || { generalStrength: "", keywordBasedStrength: [] }),
              userChallenge: JSON.stringify(user.userChallenge || { context: "", challenge: "" }),
              createdAt: user.createdAt || new Date().toISOString()
            });
            console.log(`✅ Saved as Hash: ${key}`);
          }
        } catch (error) {
          if (error.message.includes('WRONGTYPE')) {
            console.log(`✅ Key ${key} is already in Hash format`);
          } else {
            console.error(`❌ Error processing key ${key}:`, error.message);
          }
        }
      }
    }
    
    // 4. 최종 결과 확인
    console.log('\n📊 Final cleanup summary:');
    const finalKeys = await redis.keys('*');
    const keysByType = {};
    
    finalKeys.forEach(key => {
      const prefix = key.split(':')[0];
      keysByType[prefix] = (keysByType[prefix] || 0) + 1;
    });
    
    console.log('Remaining keys by type:');
    Object.entries(keysByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} keys`);
    });
    
    console.log(`\n✨ Cleanup completed! Total remaining keys: ${finalKeys.length}`);
    console.log('✅ User data is now the single source of truth');
    console.log('🗑️ Removed all duplicate answers:* and nickname:* keys');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

cleanupRedis();