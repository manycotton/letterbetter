import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 환경변수 확인
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    console.log('URL:', url);
    console.log('Token exists:', !!token);
    
    if (!url || !token) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        hasUrl: !!url,
        hasToken: !!token
      });
    }

    // Redis 연결 테스트
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    
    res.status(200).json({ 
      message: 'Connection successful',
      testValue: value,
      url: url.substring(0, 20) + '...',
    });
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({ 
      error: 'Connection failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}