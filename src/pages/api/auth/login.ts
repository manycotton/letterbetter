import { NextApiRequest, NextApiResponse } from 'next';
import { validateUser } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { nickname, password } = req.body;

    if (!nickname || !password) {
      return res.status(400).json({ message: 'Nickname and password are required' });
    }

    // 사용자 인증
    const user = await validateUser(nickname, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid nickname or password' });
    }

    // 비밀번호 제외하고 응답
    const { password: _, ...userResponse } = user;
    
    res.status(200).json({ 
      message: 'Login successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}