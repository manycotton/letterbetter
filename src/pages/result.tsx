import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Result.module.css';

const Result: React.FC = () => {
  const router = useRouter();
  const { answers, nickname, userId, answersId } = router.query;
  const [parsedAnswers, setParsedAnswers] = useState<string[]>([]);
  const [combinedText, setCombinedText] = useState('');

  useEffect(() => {
    if (answers && typeof answers === 'string') {
      try {
        const answersArray = JSON.parse(answers);
        setParsedAnswers(answersArray);
      } catch (error) {
        console.error('Failed to parse answers:', error);
      }
    }
  }, [answers]);

  useEffect(() => {
    if (parsedAnswers.length >= 3) {
      // 1번과 3번 답변을 합쳐서 줄글로 만들기
      const text = `${parsedAnswers[0]} ${parsedAnswers[2]}`;
      setCombinedText(text);
    }
  }, [parsedAnswers]);

  const handleBack = () => {
    // 3번 질문으로 돌아가면서 기존 답변들을 유지
    router.push({
      pathname: '/questions',
      query: { 
        nickname,
        userId,
        answers: JSON.stringify(parsedAnswers),
        currentQuestion: 2 // 3번 질문 (0-based index)
      }
    });
  };

  const handleComplete = () => {
    // 편지 페이지로 이동
    router.push({
      pathname: '/letter',
      query: { 
        nickname,
        userId,
        answersId
      }
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.textDisplay}>
          {combinedText}
        </div>
        
        <div className={styles.buttonContainer}>
          <button 
            onClick={handleBack}
            className={styles.backButton}
          >
            이전
          </button>
          <button 
            onClick={handleComplete}
            className={styles.completeButton}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;