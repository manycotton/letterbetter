import React, { useState, useEffect } from 'react';
import styles from '../styles/QuestionBlock.module.css';

interface StrengthTag {
  name: string;
  description: string;
}

interface QuestionBlockProps {
  question: string;
  placeholder?: string;
  type?: 'text' | 'tag' | 'strengthTags';
  tags?: string[];
  strengthTags?: StrengthTag[];
  onSubmit: (answer: string) => void;
  onBack?: () => void;
  isLast?: boolean;
  initialAnswer?: string;
  skipTyping?: boolean;
  questionNumber?: number;
  guideText?: string;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  question,
  placeholder = "답변을 입력하세요.",
  type = 'text',
  tags = [],
  strengthTags = [],
  onSubmit,
  onBack,
  isLast = false,
  initialAnswer = '',
  skipTyping = false,
  questionNumber = 0,
  guideText
}) => {
  const [answer, setAnswer] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStrengthTags, setSelectedStrengthTags] = useState<string[]>([]);
  const [selectedStrengthItems, setSelectedStrengthItems] = useState<{tag: string, content: string}[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [typingInterval, setTypingInterval] = useState<NodeJS.Timeout | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [shuffledTags, setShuffledTags] = useState<StrengthTag[]>([]);
  const [visibleTagsCount, setVisibleTagsCount] = useState(5);

  // 질문이 바뀔 때마다 상태 초기화 및 초기 답변 설정
  useEffect(() => {
    // 먼저 상태 초기화
    setAnswer('');
    setSelectedTags([]);
    setSelectedStrengthTags([]);
    setSelectedStrengthItems([]);
    setCustomTag('');
    
    // 초기 답변이 있는 경우에만 설정 (이전 단계로 돌아간 경우)
    if (initialAnswer && initialAnswer.trim()) {
      if (type === 'text') {
        setAnswer(initialAnswer);
      } else if (type === 'strengthTags') {
        // 강점 타입인 경우 일반 텍스트와 [태그] 부분을 분리
        const strengthAnswer = initialAnswer;
        
        // [태그명] 패턴으로 태그와 내용을 분리
        const parts = strengthAnswer.split(/\[([^\]]+)\]/);
        const tagItems: {tag: string, content: string}[] = [];
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
              tagItems.push({ tag, content });
            }
          }
        }
        
        setAnswer(generalContent);
        setSelectedStrengthItems(tagItems);
        setSelectedStrengthTags(tagItems.map(item => item.tag));
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

  // 강점 태그 섞기
  useEffect(() => {
    if (type === 'strengthTags' && strengthTags.length > 0) {
      const shuffled = [...strengthTags].sort(() => Math.random() - 0.5);
      setShuffledTags(shuffled);
      setVisibleTagsCount(5);
    }
  }, [type, strengthTags]);

  // 복원된 강점 아이템들의 textarea 높이 조정
  useEffect(() => {
    if (selectedStrengthItems.length > 0) {
      setTimeout(() => {
        selectedStrengthItems.forEach((item) => {
          const textarea = document.querySelector(`textarea[data-tag="${item.tag}"]`) as HTMLTextAreaElement;
          if (textarea && item.content) {
            adjustTextareaHeight(textarea);
          }
        });
      }, 100);
    }
  }, [selectedStrengthItems]);

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
    } else if (type === 'strengthTags') {
      // 일반 답변과 강점 아이템들을 결합
      let finalAnswer = answer.trim();
      
      selectedStrengthItems.forEach(item => {
        if (item.content.trim()) {
          finalAnswer += `\n[${item.tag}] ${item.content.trim()}`;
        }
      });
      
      if (finalAnswer) {
        onSubmit(finalAnswer);
        setAnswer('');
        setSelectedStrengthTags([]);
        setSelectedStrengthItems([]);
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

  const handleStrengthTagClick = (tagName: string) => {
    const existingItemIndex = selectedStrengthItems.findIndex(item => item.tag === tagName);
    
    if (existingItemIndex >= 0) {
      // 이미 선택된 태그인 경우 - 제거하지 않고 무시 (아이템에서 x 버튼으로만 제거 가능)
      return;
    } else {
      // 새로운 태그 선택 - strengthItem 추가
      const newItem = { tag: tagName, content: '' };
      setSelectedStrengthItems([...selectedStrengthItems, newItem]);
      setSelectedStrengthTags([...selectedStrengthTags, tagName]);
    }
  };

  const showMoreTags = () => {
    setVisibleTagsCount(prev => Math.min(prev + 5, shuffledTags.length));
  };

  const handleStrengthItemContentChange = (tagName: string, content: string) => {
    setSelectedStrengthItems(prev => 
      prev.map(item => 
        item.tag === tagName 
          ? { ...item, content }
          : item
      )
    );
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px';
  };

  const removeStrengthItem = (tagName: string) => {
    setSelectedStrengthItems(prev => prev.filter(item => item.tag !== tagName));
    setSelectedStrengthTags(prev => prev.filter(tag => tag !== tagName));
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

  // 질문 번호에 따른 CSS 클래스 결정 (0번=1번질문, 1번=2번질문, 3번=4번질문)
  const questionBlockClass = (questionNumber === 0 || questionNumber === 1 || questionNumber === 3) 
    ? `${styles.questionBlock} ${styles.questionBlockWide}` 
    : styles.questionBlock;

  return (
    <div className={questionBlockClass}>
      <h2 className={styles.question}>
        {displayedQuestion}
        {isTyping && <span className={styles.cursor}>|</span>}
      </h2>
      
      {!isTyping && guideText && (
        <div className={styles.guideBox}>
          {guideText}
        </div>
      )}
      
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
          
          {(type === 'text' || type === 'strengthTags') && (
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
          
          {type === 'strengthTags' && selectedStrengthItems.length > 0 && (
            <div className={styles.selectedStrengthItems}>
              {selectedStrengthItems.map((item, index) => (
                <div key={index} className={styles.strengthTagItem}>
                  <div className={styles.strengthTagHeader}>
                    <span className={styles.strengthTag}>{item.tag}</span>
                    <button
                      type="button"
                      onClick={() => removeStrengthItem(item.tag)}
                      className={styles.removeItemButton}
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    value={item.content}
                    onChange={(e) => {
                      handleStrengthItemContentChange(item.tag, e.target.value);
                      adjustTextareaHeight(e.target);
                    }}
                    placeholder={`${item.tag}에 대해 더 자세히 설명해주세요...`}
                    className={styles.strengthTagTextarea}
                    rows={2}
                    data-tag={item.tag}
                    ref={(el) => {
                      if (el && item.content) {
                        setTimeout(() => adjustTextareaHeight(el), 0);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          
          {type === 'strengthTags' && (
            <div className={styles.strengthTagsContainer}>
              <div className={styles.strengthTagsGuide}>
                💡 아래의 강점들도 살펴보세요!
              </div>
              <div className={styles.strengthTagsGrid}>
                {shuffledTags.slice(0, visibleTagsCount).map((tag) => (
                  <div 
                    key={tag.name} 
                    className={styles.strengthTagWrapper}
                    onMouseEnter={() => setHoveredTag(tag.name)}
                    onMouseLeave={() => setHoveredTag(null)}
                  >
                    <button
                      type="button"
                      onClick={() => handleStrengthTagClick(tag.name)}
                      className={`${styles.strengthTagButton} ${
                        selectedStrengthTags.includes(tag.name) ? styles.strengthTagSelected : ''
                      }`}
                    >
                      {tag.name}
                    </button>
                    {hoveredTag === tag.name && (
                      <div className={styles.strengthTagTooltip}>
                        {tag.description}
                      </div>
                    )}
                  </div>
                ))}
                {visibleTagsCount < shuffledTags.length && (
                  <button
                    type="button"
                    onClick={showMoreTags}
                    className={styles.showMoreButton}
                  >
                    더보기
                  </button>
                )}
              </div>
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
              disabled={
                (type === 'strengthTags' && !answer.trim() && selectedStrengthItems.length === 0) ||
                (type === 'tag' && !answer.trim() && selectedTags.length === 0) ||
                (type === 'text' && !answer.trim())
              }
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