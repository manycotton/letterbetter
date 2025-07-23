// 사용자에게 실제 데이터가 있는지 확인하고 마이그레이션하는 스크립트
const redis = require('./lib/upstash').default;

async function findAndMigrateUserData() {
  console.log('=== 사용자 데이터 마이그레이션 ===');
  
  try {
    // 모든 키 확인
    const allKeys = await redis.keys('*');
    console.log('모든 Redis 키들:', allKeys);
    
    // answers 키들 찾기
    const answerKeys = allKeys.filter(key => key.startsWith('answers:'));
    console.log('Answer 키들:', answerKeys);
    
    // user 키들 확인
    const userKeys = allKeys.filter(key => key.startsWith('user:'));
    console.log('User 키들:', userKeys);
    
    // 각 answer 키의 데이터 확인
    for (const answerKey of answerKeys) {
      console.log(`\n--- ${answerKey} 데이터 ---`);
      const answerData = await redis.get(answerKey);
      console.log(typeof answerData === 'string' ? JSON.parse(answerData) : answerData);
    }
    
    // 각 user 키의 현재 상태 확인
    for (const userKey of userKeys) {
      console.log(`\n--- ${userKey} 해시 데이터 ---`);
      const userData = await redis.hgetall(userKey);
      console.log(userData);
    }
    
  } catch (error) {
    console.error('마이그레이션 에러:', error);
  }
}

findAndMigrateUserData().then(() => {
  console.log('\n=== 데이터 조사 완료 ===');
  process.exit(0);
}).catch(error => {
  console.error('스크립트 에러:', error);
  process.exit(1);
});