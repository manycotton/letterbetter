import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/ResponseLetter.module.css';

interface ResponseLetterData {
  letter: string;
  userNickname: string;
  characterName: string;
  generatedAt: string;
}

export default function ResponseLetter() {
  const router = useRouter();
  const [letterData, setLetterData] = useState<ResponseLetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLetter, setEditedLetter] = useState('');

  useEffect(() => {
    // URL 파라미터나 sessionStorage에서 데이터 가져오기
    const storedData = sessionStorage.getItem('responseLetterData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setLetterData(data);
        setEditedLetter(data.letter);
      } catch (error) {
        console.error('Error parsing stored letter data:', error);
        router.push('/');
      }
    } else {
      // 데이터가 없으면 홈으로 리다이렉트
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSendLetter = async () => {
    // Debug: Check what we're about to send
    console.log('handleSendLetter called');
    console.log('editedLetter state:', editedLetter);
    console.log('editedLetter length:', editedLetter.length);
    
    // 편지 완료 페이지로 이동하기 위한 데이터 저장
    const completeData = {
      characterName: letterData?.characterName || '뚜뚜',
      userNickname: letterData?.userNickname || '사용자'
    };
    
    // Save letter content to database
    try {
      const sessionId = sessionStorage.getItem('currentSessionId');
      const strengthKeywords = JSON.parse(sessionStorage.getItem('strengthKeywords') || '[]');
      
      if (sessionId && letterData) {
        // Save letter content data
        await fetch('/api/writing-step/save-letter-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            letterContent: letterData.letter,
            strengthKeywords
          })
        });
        
        // Get original response letter data
        const getResponse = await fetch(`/api/writing-step/get-response-letter?sessionId=${sessionId}`);
        if (getResponse.ok) {
          const { responseLetterData: originalResponseData } = await getResponse.json();
          
          // Update response letter data with final edited version
          await fetch('/api/writing-step/save-response-letter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              originalGeneratedLetter: originalResponseData.originalGeneratedLetter,
              finalEditedLetter: editedLetter, // final edited version
              characterName: letterData.characterName,
              userNickname: letterData.userNickname,
              generatedAt: originalResponseData.generatedAt
            })
          });
        }
      }
    } catch (error) {
      console.error('Error saving letter content:', error);
    }
    
    sessionStorage.setItem('letterCompleteData', JSON.stringify(completeData));
    router.push('/lettercomplete');
  };

  const handleGoBack = () => {
    // 이전 작성 내용으로 돌아가기
    router.push('/writing');
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // 편집 완료 - 수정된 내용 저장
      if (letterData) {
        const updatedData = {
          ...letterData,
          letter: editedLetter
        };
        setLetterData(updatedData);
        sessionStorage.setItem('responseLetterData', JSON.stringify(updatedData));
      }
    }
    setIsEditing(!isEditing);
  };

  const handleLetterChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('handleLetterChange called, new value length:', e.target.value.length);
    setEditedLetter(e.target.value);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>편지를 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!letterData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>편지 데이터를 찾을 수 없습니다.</p>
          <button onClick={handleSendLetter} className={styles.goHomeButton}>
            🏠 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button onClick={handleGoBack} className={styles.backButtonTop}>
        ← 뒤로가기
      </button>
      
      <div className={styles.header}>
        <h1 className={styles.title}>
          💌 {letterData.userNickname}님이 {letterData.characterName}에게 보내는 편지 ✨
        </h1>
      </div>

      <div className={styles.letterContainer}>
        <div className={styles.letterBox}>
          <div className={styles.letterContent}>
            {isEditing ? (
              <textarea
                value={editedLetter}
                onChange={handleLetterChange}
                className={styles.editTextarea}
                placeholder="편지 내용을 입력하세요..."
              />
            ) : (
              editedLetter.split('\n').map((paragraph, index) => (
                <p key={index} className={styles.letterText}>
                  {paragraph}
                </p>
              ))
            )}
            
            {!isEditing && (
              <div className={styles.letterDate}>
                <p className={styles.dateText}>
                  {formatDate(letterData.generatedAt)}
                </p>
                <p className={styles.signature}>
                  {letterData.userNickname} 드림
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={handleEditToggle} className={styles.editButton}>
          {isEditing ? '✅ 편지쓰기 완료' : '✏️ 편지 수정'}
        </button>
        <button onClick={handleSendLetter} className={styles.sendButton}>
          💌 {letterData.characterName}에게 편지 보내기
        </button>
      </div>
    </div>
  );
}