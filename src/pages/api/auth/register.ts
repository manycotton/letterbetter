import { NextApiRequest, NextApiResponse } from 'next';
import { createUser, getUserByNickname } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { nickname, password } = req.body;

    if (!nickname || !password) {
      return res.status(400).json({ message: 'Nickname and password are required' });
    }

    if (!/^\d{1,5}$/.test(password)) {
      return res.status(400).json({ message: 'Password must be 1-5 digits' });
    }

    // 닉네임 중복 확인
    const existingUser = await getUserByNickname(nickname);
    if (existingUser) {
      return res.status(409).json({ message: 'Nickname already exists' });
    }

    // 사용자 생성 - 기본값으로 빈 데이터 설정
    const defaultUserIntroduction = "";
    const defaultUserStrength = {
      generalStrength: "",
      keywordBasedStrength: []
    };
    const defaultUserChallenge = {
      context: "",
      challenge: ""
    };
    
    const user = await createUser(nickname, password, defaultUserIntroduction, defaultUserStrength, defaultUserChallenge);
    
    // 비밀번호 제외하고 응답
    const { password: _, ...userResponse } = user;
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : '');
    res.status(500).json({ message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}