import { useState } from 'react';
import { useRouter } from 'next/router';
import NicknameModal from '../components/NicknameModal';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleNicknameSubmit = async (nickname: string, password: string) => {
    setIsLoading(true);
    setError('');

    try {
      // 먼저 로그인 시도
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname, password }),
      });

      if (loginResponse.ok) {
        // 로그인 성공
        const { user } = await loginResponse.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        setIsModalOpen(false);
        router.push({
          pathname: '/questions',
          query: { userId: user.userId, nickname: user.nickname }
        });
        return;
      }

      // 로그인 실패 시 - 닉네임 존재 여부 확인 후 적절한 메시지 표시
      const loginError = await loginResponse.json();
      
      // 회원가입 시도 (닉네임 중복 확인용)
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname, password }),
      });

      if (registerResponse.ok) {
        // 회원가입 성공
        const { user } = await registerResponse.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        setIsModalOpen(false);
        router.push({
          pathname: '/questions',
          query: { userId: user.userId, nickname: user.nickname }
        });
      } else {
        const registerError = await registerResponse.json();
        
        // 닉네임이 이미 있는 경우 - 비밀번호가 틀렸다는 메시지
        if (registerError.message === 'Nickname already exists') {
          setError('비밀번호가 틀렸습니다. 다시 시도해주세요.');
        } else {
          setError(registerError.message || '오류가 발생했습니다.');
        }
      }

    } catch (error) {
      console.error('Auth error:', error);
      setError('서버 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    // 모달 외부 클릭 시 아무 일도 하지 않음
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <main style={{ textAlign: 'center', color: '#00ffff' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>LETTERBETTER</h1>
        <p style={{ fontSize: '14px' }}>8-BIT RETRO GAME</p>
      </main>
      
      <NicknameModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleNicknameSubmit}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
