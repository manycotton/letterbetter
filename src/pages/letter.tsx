import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Letter.module.css';

const Letter: React.FC = () => {
  const router = useRouter();
  const { nickname, userId, answersId } = router.query;
  const [isShaking, setIsShaking] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [showLetterContent, setShowLetterContent] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState('');
  const [modalTypingComplete, setModalTypingComplete] = useState(false);
  const [lastEnterTime, setLastEnterTime] = useState(0);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);

  const letterParagraphs = [
    "안녕하세요. 저는 현재 직장에서 일하고 있는 양양입니다. 저는 ADHD를 가지고 있어요. 요즘 들어 직장에서 업무를 수행하는 데 많은 어려움을 겪고 있어, 조언을 구하고자 이렇게 편지를 쓰게 되었습니다.",
    "업무에 집중하기가 너무 힘듭니다. 작은 소리에도 쉽게 산만해지고, 한 가지 일에 꾸준히 몰두하기가 어렵습니다. 이로 인해 마감 기한을 놓치거나, 실수가 잦아지는 등 업무 효율이 떨어지고 있습니다. 해야 할 일이 많을 때는 어디서부터 시작해야 할지 막막하고, 우선순위를 정하는 것도 버겁게 느껴집니다.",
    "또한, 제 행동으로 인해 동료들에게 피해를 주는 것은 아닐까 하는 걱정이 큽니다. 중요한 회의 내용을 놓치거나, 다른 사람의 말을 도중에 끊는 경우도 종종 있어 난처할 때가 많습니다. 이러한 상황들이 반복되면서 자신감도 떨어지고, 스스로에게 실망하는 날들이 늘어나고 있습니다.",
    "ADHD 증상으로 인해 직장 생활에 어려움을 겪는 것이 저만의 문제는 아니라는 것을 알고 있습니다. 하지만 매일같이 반복되는 이러한 상황들 속에서 어떻게 현명하게 대처해야 할지 막막하기만 합니다."
  ];

  useEffect(() => {
    if (!isTyping) return;

    let timeoutId: NodeJS.Timeout;
    let localCurrentParagraphIndex = currentParagraphIndex;
    let currentCharIndex = 0;
    let allText = '';

    const typeText = () => {
      if (localCurrentParagraphIndex >= letterParagraphs.length) {
        setTypingComplete(true);
        return;
      }

      const currentParagraph = letterParagraphs[localCurrentParagraphIndex];
      
      if (currentCharIndex <= currentParagraph.length) {
        const currentText = currentParagraph.substring(0, currentCharIndex);
        const previousParagraphs = letterParagraphs.slice(0, localCurrentParagraphIndex).join('\n\n');
        allText = previousParagraphs + (previousParagraphs ? '\n\n' : '') + currentText;
        
        setTypingText(allText);
        currentCharIndex++;
        
        timeoutId = setTimeout(typeText, 50);
      } else {
        // 현재 문단 완료
        localCurrentParagraphIndex++;
        setCurrentParagraphIndex(localCurrentParagraphIndex);
        currentCharIndex = 0;
        
        if (localCurrentParagraphIndex < letterParagraphs.length) {
          // 다음 문단 시작 전 1초 대기
          timeoutId = setTimeout(typeText, 1000);
        } else {
          setTypingComplete(true);
        }
      }
    };

    typeText();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isTyping, currentParagraphIndex]);

  // 한 문단씩 완성하는 함수
  const skipToParagraph = () => {
    if (currentParagraphIndex >= letterParagraphs.length) {
      // 이미 모든 문단이 완료된 경우
      const allText = letterParagraphs.join('\n\n');
      setTypingText(allText);
      setTypingComplete(true);
      setIsTyping(false);
      return;
    }

    // 현재 문단까지 완성된 텍스트 생성
    const completedParagraphs = letterParagraphs.slice(0, currentParagraphIndex + 1);
    const completedText = completedParagraphs.join('\n\n');
    setTypingText(completedText);
    
    // 다음 문단으로 이동
    const nextParagraphIndex = currentParagraphIndex + 1;
    setCurrentParagraphIndex(nextParagraphIndex);
    
    // 모든 문단이 완료된 경우
    if (nextParagraphIndex >= letterParagraphs.length) {
      setTypingComplete(true);
      setIsTyping(false);
    }
  };

  // 키보드 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && showLetterContent && !showModal) {
        const currentTime = Date.now();
        
        // 더블 엔터 체크 (500ms 이내)
        if (currentTime - lastEnterTime < 500) {
          // 타이핑 즉시 완료
          const allText = letterParagraphs.join('\n\n');
          setTypingText(allText);
          setTypingComplete(true);
          setIsTyping(false);
        } else {
          // 단일 엔터: 한 문단씩 완성
          skipToParagraph();
        }
        
        setLastEnterTime(currentTime);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLetterContent, showModal, lastEnterTime, letterParagraphs, currentParagraphIndex]);

  // 모달 메시지 설정
  useEffect(() => {
    if (!showModal) return;

    const characterName = "양양이"; // 캐릭터 이름 하드코딩
    const modalMessage = `${characterName}의 편지에 조언을 담아 답장해주세요. ${nickname}님의 마음이 담긴 조언이 큰 힘이 될거에요!`;
    setModalText(modalMessage);
    setModalTypingComplete(true);
  }, [showModal, nickname]);

  const handleEnterClick = () => {
    setShowModal(true);
  };

  const handleReplyClick = () => {
    router.push({
      pathname: '/writing',
      query: {
        nickname,
        userId,
        answersId
      }
    });
  };

  const handleReadLetter = () => {
    setIsShaking(true);
    
    // 3초 후 fadeout 시작
    setTimeout(() => {
      setIsFading(true);
      
      // fadeout 완료 후 편지 내용 표시
      setTimeout(() => {
        setShowLetterContent(true);
        setIsTyping(true);
        setCurrentParagraphIndex(0); // 문단 인덱스 초기화
      }, 1000); // fadeout 시간 1초
    }, 3000);
  };

  // 편지 내용 렌더링
  if (showLetterContent) {
    return (
      <div className={styles.container}>
        <button 
          onClick={() => router.back()}
          className={styles.backButton}
        >
          ← 뒤로
        </button>
        <div className={styles.letterContentContainer}>
          <div className={styles.characterInfo}>
            <img 
              src="/images/profile/sheep.png" 
              alt="양양이"
              className={styles.characterImage}
            />
            <div className={styles.characterDetails}>
              <h3 className={styles.characterName}>양양이</h3>
              <p className={styles.characterAge}>나이: 24</p>
              <p className={styles.characterJob}>직업: 프리랜서 디자이너</p>
            </div>
          </div>
          <div className={styles.letterTextContainer}>
            <div className={styles.letterWithButton}>
              <div className={styles.letterTextBox}>
                <div className={styles.letterTextContent}>
                  <div className={`${styles.letterText} ${styles.typingText}`}>
                    {typingText}
                    <span className={styles.cursor}></span>
                  </div>
                </div>
              </div>
              {typingComplete && (
                <div className={styles.enterMessage}>
                  <button onClick={handleEnterClick} className={styles.enterButton}>
                    편지를 다 읽으셨으면 여기를 눌러주세요
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalText}>
                {modalText}
              </div>
              {modalTypingComplete && (
                <button onClick={handleReplyClick} className={styles.replyButton}>
                  응! 내가 양양이 에게 답장을 적어줄게
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button 
        onClick={() => router.back()}
        className={styles.backButton}
      >
        ← 뒤로
      </button>
      <div className={styles.content}>
        {!isShaking && (
          <h1 className={styles.title}>
            {nickname}님께 편지가 도착했습니다.
          </h1>
        )}
        
        <div className={styles.letterContainer}>
          <img 
            src={isShaking ? "/images/letter-shake.gif" : "/images/letter.png"}
            alt="편지"
            className={`${styles.letter} ${isFading ? styles.fadeout : ''}`}
            onError={(e) => {
              console.log('이미지 로드 실패:', e.currentTarget.src);
              // 이미지 로드 실패 시 기본 스타일로 대체
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        {!isShaking && (
          <button 
            onClick={handleReadLetter}
            className={styles.readButton}
          >
            응, 편지를 읽어볼래
          </button>
        )}
      </div>
    </div>
  );
};

export default Letter;