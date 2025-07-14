import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Result.module.css';

const Result: React.FC = () => {
  const router = useRouter();
  const { answers, nickname, userId, answersId } = router.query;
  const [parsedAnswers, setParsedAnswers] = useState<string[]>([]);
  const [strengthContent, setStrengthContent] = useState('');
  const [strengthTagContents, setStrengthTagContents] = useState<{tag: string, content: string}[]>([]);
  const [concernKeyword, setConcernKeyword] = useState('');

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
    if (parsedAnswers.length >= 4) {
      // 2번 답변(강점) 파싱
      if (parsedAnswers[1]) {
        const strengthAnswer = parsedAnswers[1];
        
        // [태그명] 패턴으로 태그와 내용을 분리
        const parts = strengthAnswer.split(/\[([^\]]+)\]/);
        const tagContents: {tag: string, content: string}[] = [];
        let generalContent = '';
        
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            // 일반 텍스트 부분
            if (parts[i].trim() && i === 0) {
              generalContent = parts[i].trim();
            }
          } else {
            // 태그 부분
            const tag = parts[i];
            const content = (parts[i + 1] || '').trim();
            if (tag && content) {
              tagContents.push({ tag, content });
            }
          }
        }
        
        setStrengthContent(generalContent);
        setStrengthTagContents(tagContents);
      }
      
      // 3번 답변에서 고민 키워드 추출
      if (parsedAnswers[2]) {
        // 첫 번째 키워드 또는 전체 태그를 사용
        const concernAnswer = parsedAnswers[2];
        const firstKeyword = concernAnswer.split(',')[0].trim();
        setConcernKeyword(firstKeyword);
      }
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
        {/* 1. 자기 소개 섹션 */}
        {parsedAnswers[0] && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>👋 자기 소개</h2>
            <div className={styles.sectionContent}>
              {parsedAnswers[0]}
            </div>
          </div>
        )}
        
        {/* 2. 나의 강점 섹션 */}
        {(strengthContent || strengthTagContents.length > 0) && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🌟 나의 강점</h2>
            <div className={styles.sectionContent}>
              {strengthContent && (
                <div className={styles.strengthGeneral}>
                  {strengthContent}
                </div>
              )}
              {strengthTagContents.length > 0 && (
                <div className={styles.strengthTags}>
                  {strengthTagContents.map((item, index) => (
                    <div key={index} className={styles.strengthTagItem}>
                      <span className={styles.strengthTag}>{item.tag}</span>
                      <span className={styles.strengthTagContent}>{item.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 3. 나의 고민 섹션 */}
        {parsedAnswers[3] && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              💭 나의 고민: {concernKeyword}
            </h2>
            <div className={styles.sectionContent}>
              {parsedAnswers[3]}
            </div>
          </div>
        )}
        
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