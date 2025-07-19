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

export default redis;