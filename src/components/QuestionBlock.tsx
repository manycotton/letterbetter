import React, { useState, useEffect } from 'react';
import styles from '../styles/QuestionBlock.module.css';

interface QuestionBlockProps {
  question: string;
  placeholder?: string;
  type?: 'text' | 'tag';
  tags?: string[];
  onSubmit: (answer: string) => void;
  onBack?: () => void;
  isLast?: boolean;
  initialAnswer?: string;
  skipTyping?: boolean;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  question,
  placeholder = "답변을 입력하세요.",
  type = 'text',
  tags = [],
  onSubmit,
  onBack,
  isLast = false,
  initialAnswer = '',
  skipTyping = false
}) => {
  const [answer, setAnswer] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [typingInterval, setTypingInterval] = useState<NodeJS.Timeout | null>(null);

  // 질문이 바뀔 때마다 상태 초기화 및 초기 답변 설정
  useEffect(() => {
    // 먼저 상태 초기화
    setAnswer('');
    setSelectedTags([]);
    setCustomTag('');
    
    // 초기 답변이 있는 경우에만 설정 (이전 단계로 돌아간 경우)
    if (initialAnswer && initialAnswer.trim()) {
      if (type === 'text') {
        setAnswer(initialAnswer);
      } else if (type === 'tag') {
        // 태그 타입인 경우 선택된 태그들과 추가 텍스트 분리
        const parts = initialAnswer.split(' - ');
        if (parts.length > 1) {
          const tagParts = parts[0].split(', ');
          setSelectedTags(tagParts);
          setAnswer(parts[1]);
        } else {
          const tagParts = initialAnswer.split(', ');
          setSelectedTags(tagParts);
        }
      }
    }
  }, [question, initialAnswer, type]);

  // Enter 키로 타이핑 건너뛰기 기능
  const skipTypingAnimation = () => {
    if (typingInterval) {
      clearInterval(typingInterval);
      setTypingInterval(null);
    }
    setDisplayedQuestion(question);
    setIsTyping(false);
  };

  useEffect(() => {
    if (skipTyping) {
      setDisplayedQuestion(question);
      setIsTyping(false);
      return;
    }

    setDisplayedQuestion('');
    setIsTyping(true);
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < question.length) {
        setDisplayedQuestion(question.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
        setTypingInterval(null);
      }
    }, 100);

    setTypingInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [question, skipTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'text') {
      if (answer.trim()) {
        onSubmit(answer.trim());
        setAnswer('');
      }
    } else if (type === 'tag') {
      const combinedAnswer = selectedTags.length > 0 
        ? `${selectedTags.join(', ')}${answer.trim() ? ` - ${answer.trim()}` : ''}`
        : answer.trim();
      
      if (combinedAnswer) {
        onSubmit(combinedAnswer);
        setAnswer('');
        setSelectedTags([]);
      }
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCustomTagAdd = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleCustomTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomTagAdd();
    }
  };

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isTyping) {
        e.preventDefault();
        skipTypingAnimation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, question, skipTypingAnimation]);

  return (
    <div className={styles.questionBlock}>
      <h2 className={styles.question}>
        {displayedQuestion}
        {isTyping && <span className={styles.cursor}>|</span>}
      </h2>
      
      {!isTyping && (
        <form onSubmit={handleSubmit} className={styles.form}>
          {type === 'tag' && (
            <div className={styles.tagContainer}>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className={`${styles.tagButton} ${
                    selectedTags.includes(tag) ? styles.tagButtonSelected : ''
                  }`}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.filter(tag => !tags.includes(tag)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className={`${styles.tagButton} ${styles.tagButtonSelected} ${styles.customTag}`}
                >
                  {tag}
                </button>
              ))}
              <div className={styles.customTagInput}>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={handleCustomTagKeyPress}
                  placeholder="직접 입력..."
                  className={styles.customInput}
                />
                <button
                  type="button"
                  onClick={handleCustomTagAdd}
                  className={styles.addButton}
                  disabled={!customTag.trim()}
                >
                  추가
                </button>
              </div>
            </div>
          )}
          
          {type === 'text' && (
            <div className={styles.inputContainer}>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={placeholder}
                className={styles.textArea}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                ref={(el) => {
                  if (el && initialAnswer) {
                    // 초기 답변이 있을 때 높이 자동 조정
                    setTimeout(() => {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }, 0);
                  }
                }}
              />
            </div>
          )}
          
          <div className={styles.buttonContainer}>
            {onBack && (
              <button 
                type="button" 
                onClick={onBack}
                className={styles.backButton}
              >
                이전
              </button>
            )}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={!answer.trim() && selectedTags.length === 0}
            >
              {isLast ? '제출' : '완료'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default QuestionBlock;