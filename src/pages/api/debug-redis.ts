import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 모든 키 확인
    const keys = await redis.keys('*');
    console.log('All keys:', keys);
    
    const result = {
      keys: keys,
      data: {} as { [key: string]: any }
    };
    
    // 각 키의 값 확인
    for (const key of keys) {
      try {
        // user 키는 Hash 형태로 조회
        if (key.startsWith('user:')) {
          const hashValue = await redis.hgetall(key);
          result.data[key] = {
            type: 'hash',
            ttl: -1,
            value: hashValue
          };
        } else {
          // 다른 키들은 JSON으로 조회
          const value = await redis.get(key);
          result.data[key] = {
            type: 'json',
            ttl: -1,
            value: value
          };
        }
      } catch (error) {
        result.data[key] = 'Error: ' + (error instanceof Error ? error.message : String(error));
      }
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}