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
          query: { userId: user.id, nickname: user.nickname }
        });
        return;
      }

      // 로그인 실패 시 회원가입 시도
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
          query: { userId: user.id, nickname: user.nickname }
        });
      } else {
        const errorData = await registerResponse.json();
        setError(errorData.message || '오류가 발생했습니다.');
      }

    } catch (error) {
      console.error('Auth error:', error);
      setError('서버 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
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
