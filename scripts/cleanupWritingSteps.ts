import { Redis } from '@upstash/redis';

// 환경 변수 확인
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('Redis configuration missing:');
  console.error('URL:', url ? 'Present' : 'Missing');
  console.error('Token:', token ? 'Present' : 'Missing');
  throw new Error('Redis configuration is incomplete. Please check your environment variables.');
}

const redis = new Redis({
  url: url,
  token: token,
});

async function cleanWritingSteps() {
  try {
    // Get all writing_step keys
    const keys = await redis.keys('writing_step:*');
    console.log(`Found ${keys.length} writing steps to clean`);

    let cleanedCount = 0;
    
    for (const key of keys) {
      const stepData = await redis.get(key);
      
      if (!stepData) continue;
      
      try {
        const data = typeof stepData === 'string' ? JSON.parse(stepData) : stepData;
        
        // Create a clean version of highlighted items with only the necessary fields
        if (data.highlightedItems && Array.isArray(data.highlightedItems)) {
          const cleanHighlightedItems = data.highlightedItems.map((item: any) => ({
            id: item.id,
            text: item.text,
            color: item.color,
            paragraphIndex: item.paragraphIndex
          }));
          
          // Only update if there are changes
          if (JSON.stringify(cleanHighlightedItems) !== JSON.stringify(data.highlightedItems)) {
            await redis.set(key, JSON.stringify({
              ...data,
              highlightedItems: cleanHighlightedItems
            }));
            cleanedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing key ${key}:`, error);
      }
    }
    
    console.log(`Cleaned ${cleanedCount} writing steps`);
    return { success: true, cleanedCount };
  } catch (error) {
    console.error('Error cleaning writing steps:', error);
    throw error;
  }
}

// Run the cleanup
cleanWritingSteps()
  .then(result => {
    console.log('Cleanup completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
