import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/LetterComplete.module.css';

interface LetterCompleteData {
  characterName: string;
  userNickname: string;
}

export default function LetterComplete() {
  const router = useRouter();
  const [letterData, setLetterData] = useState<LetterCompleteData | null>(null);

  useEffect(() => {
    // sessionStorage에서 데이터 가져오기
    const storedData = sessionStorage.getItem('letterCompleteData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setLetterData(data);
      } catch (error) {
        console.error('Error parsing stored letter complete data:', error);
        // 데이터가 없으면 기본값 설정
        setLetterData({ characterName: '뚜뚜', userNickname: '사용자' });
      }
    } else {
      // 데이터가 없으면 기본값 설정
      setLetterData({ characterName: '뚜뚜', userNickname: '사용자' });
    }
  }, []);

  const handleGoHome = () => {
    // 모든 sessionStorage 데이터 정리
    sessionStorage.removeItem('responseLetterData');
    sessionStorage.removeItem('letterCompleteData');
    sessionStorage.removeItem('userNickname');
    sessionStorage.removeItem('characterName');
    
    // 로그인 페이지(홈)로 이동
    router.push('/');
  };

  if (!letterData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>페이지를 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.messageBox}>
          <div className={styles.icon}>
            💌
          </div>
          <h1 className={styles.title}>
            {letterData.characterName}에게 편지가 도착했어요!
          </h1>
          <p className={styles.message}>
            편지를 작성해주셔서 감사합니다.
          </p>
          <p className={styles.subMessage}>
            {letterData.userNickname}님의 진심이 담긴 편지가 {letterData.characterName}에게 잘 전달되었습니다.
          </p>
        </div>
        
        <div className={styles.actions}>
          <button onClick={handleGoHome} className={styles.homeButton}>
            🏠 홈으로 가기
          </button>
        </div>
      </div>
    </div>
  );
}