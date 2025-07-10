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
        const value = await redis.get(key);
        result.data[key] = value;
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