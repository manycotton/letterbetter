import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../../lib/upstash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all user keys
    const userKeys = await redis.keys('user:*');
    
    if (!userKeys || userKeys.length === 0) {
      return res.status(200).json({ users: [] });
    }

    // Get all user data
    const users = [];
    for (const key of userKeys) {
      const userData = await redis.get(key);
      if (userData) {
        if (typeof userData === 'object') {
          users.push(userData);
        } else {
          users.push(JSON.parse(userData as string));
        }
      }
    }

    // Sort users by creation date (newest first)
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}