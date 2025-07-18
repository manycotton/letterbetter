import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../../styles/Admin.module.css';

interface User {
  id: string;
  nickname: string;
  password: string;
  createdAt: string;
}

interface UserData {
  user: User;
  questionAnswers: any[];
  generatedLetters: any[];
  writingLogs: any;
  responseLetters: any[];
}

type TabType = 'intro' | 'letter' | 'writing' | 'response';

export default function UserDetail() {
  const router = useRouter();
  const { userId } = router.query;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('intro');

  useEffect(() => {
    if (userId) {
      fetchUserData(userId as string);
    }
  }, [userId]);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      setUserData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className={styles.userDetailContainer}>
        <div className={styles.loading}>Loading user data...</div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className={styles.userDetailContainer}>
        <div className={styles.error}>Error: {error || 'User not found'}</div>
      </div>
    );
  }

  const renderIntroTab = () => (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>자기 소개</h2>
      {userData.questionAnswers.map((qa, index) => (
        <div key={qa.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>질문 {index + 1}</h3>
          <div className={styles.dataGrid}>
            {qa.answers.map((answer: string, answerIndex: number) => (
              <div key={answerIndex} className={styles.dataItem}>
                <div className={styles.dataLabel}>답변 {answerIndex + 1}</div>
                <div className={styles.dataValue}>{answer}</div>
              </div>
            ))}
          </div>
          <div className={styles.dataItem}>
            <div className={styles.dataLabel}>작성일</div>
            <div className={styles.dataValue}>{formatDate(qa.createdAt)}</div>
          </div>
        </div>
      ))}
      {userData.questionAnswers.length === 0 && (
        <div className={styles.noData}>질문 답변이 없습니다.</div>
      )}
    </div>
  );

  const renderLetterTab = () => (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>편지</h2>
      {userData.generatedLetters.map((letter, index) => (
        <div key={letter.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>편지 {index + 1}</h3>
          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>캐릭터</div>
              <div className={styles.dataValue}>{letter.characterName} ({letter.age}세, {letter.occupation})</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>편지 내용</div>
              <div className={styles.codeBlock}>
                {Array.isArray(letter.letterContent) 
                  ? letter.letterContent.join('\n\n') 
                  : letter.letterContent}
              </div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>사용된 강점</div>
              <div className={styles.tagList}>
                {letter.usedStrengths.map((strength: string, idx: number) => (
                  <span key={idx} className={styles.tag}>{strength}</span>
                ))}
              </div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>생성일</div>
              <div className={styles.dataValue}>{formatDate(letter.createdAt)}</div>
            </div>
          </div>
        </div>
      ))}
      {userData.generatedLetters.length === 0 && (
        <div className={styles.noData}>생성된 편지가 없습니다.</div>
      )}
    </div>
  );

  const renderWritingTab = () => (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>편지 작성하기</h2>
      
      {/* Understanding Step */}
      {userData.writingLogs.understandingStep && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>이해하기 단계</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>하이라이트된 항목들</div>
              <div className={styles.stepTimestamp}>
                {formatDate(userData.writingLogs.understandingStep.completedAt)}
              </div>
            </div>
            {userData.writingLogs.understandingStep.highlightedItems.map((item: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>하이라이트 {idx + 1}</div>
                <div className={styles.dataValue}>{item.text}</div>
                {item.userExplanation && (
                  <div className={styles.dataValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                    설명: {item.userExplanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strength Finding Step */}
      {userData.writingLogs.strengthStep && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>강점찾기 단계</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>강점 항목들</div>
              <div className={styles.stepTimestamp}>
                {formatDate(userData.writingLogs.strengthStep.completedAt)}
              </div>
            </div>
            {userData.writingLogs.strengthStep.highlightedItems.map((item: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>강점 {idx + 1}</div>
                <div className={styles.dataValue}>{item.text}</div>
                {item.strengthDescription && (
                  <div className={styles.dataValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                    설명: {item.strengthDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reflection Step */}
      {userData.writingLogs.reflectionStep && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>고민 정리 단계</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>고민 정리</div>
              <div className={styles.stepTimestamp}>
                {formatDate(userData.writingLogs.reflectionStep.completedAt)}
              </div>
            </div>
            {userData.writingLogs.reflectionStep.reflectionItems.map((item: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>고민 {idx + 1}</div>
                <div className={styles.dataValue}>{item.content}</div>
                {item.selectedHints && item.selectedHints.length > 0 && (
                  <div className={styles.tagList} style={{ marginTop: '8px' }}>
                    {item.selectedHints.map((hint: string, hintIdx: number) => (
                      <span key={hintIdx} className={styles.tag}>{hint}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Magic Mix Interactions */}
      {userData.writingLogs.magicMixData && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Magic Mix 상호작용</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>
                총 {userData.writingLogs.magicMixData.totalMixCount}회 실행, 
                {userData.writingLogs.magicMixData.totalSolutionsAdded}개 솔루션 추가
              </div>
            </div>
            {userData.writingLogs.magicMixData.interactions.map((interaction: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>상호작용 {idx + 1}</div>
                <div className={styles.dataValue}>
                  선택된 강점: {interaction.selectedStrengthTags.join(', ')}
                </div>
                <div className={styles.dataValue}>
                  선택된 솔루션 카테고리: {interaction.selectedSolutionCategories.join(', ')}
                </div>
                <div className={styles.dataValue}>
                  필드 추가 여부: {interaction.addedToSolutionField ? '예' : '아니오'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!userData.writingLogs.understandingStep && !userData.writingLogs.strengthStep && 
       !userData.writingLogs.reflectionStep && !userData.writingLogs.magicMixData && (
        <div className={styles.noData}>편지 작성 로그가 없습니다.</div>
      )}
    </div>
  );

  const renderResponseTab = () => (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>답장 쓰기</h2>
      {userData.responseLetters.map((response, index) => (
        <div key={response.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>답장 {index + 1}</h3>
          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>수신자</div>
              <div className={styles.dataValue}>{response.characterName}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>AI 생성 원본</div>
              <div className={styles.codeBlock}>{response.originalGeneratedLetter}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>사용자 수정 최종본</div>
              <div className={styles.codeBlock}>{response.finalEditedLetter}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>생성일</div>
              <div className={styles.dataValue}>{formatDate(response.generatedAt)}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>완료일</div>
              <div className={styles.dataValue}>{formatDate(response.finalizedAt)}</div>
            </div>
          </div>
        </div>
      ))}
      {userData.responseLetters.length === 0 && (
        <div className={styles.noData}>답장이 없습니다.</div>
      )}
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'intro':
        return renderIntroTab();
      case 'letter':
        return renderLetterTab();
      case 'writing':
        return renderWritingTab();
      case 'response':
        return renderResponseTab();
      default:
        return renderIntroTab();
    }
  };

  return (
    <div className={styles.userDetailContainer}>
      <div className={styles.userDetailHeader}>
        <h1 className={styles.userDetailTitle}>
          {userData.user.nickname} 상세 정보
        </h1>
        <Link href="/admin" className={styles.backButton}>
          ← Back to Admin
        </Link>
      </div>

      <div className={styles.tabContainer}>
        <div className={styles.sidebar}>
          <ul className={styles.tabList}>
            <li className={styles.tabItem}>
              <button
                className={`${styles.tabButton} ${activeTab === 'intro' ? styles.active : ''}`}
                onClick={() => setActiveTab('intro')}
              >
                자기 소개
              </button>
            </li>
            <li className={styles.tabItem}>
              <button
                className={`${styles.tabButton} ${activeTab === 'letter' ? styles.active : ''}`}
                onClick={() => setActiveTab('letter')}
              >
                편지
              </button>
            </li>
            <li className={styles.tabItem}>
              <button
                className={`${styles.tabButton} ${activeTab === 'writing' ? styles.active : ''}`}
                onClick={() => setActiveTab('writing')}
              >
                편지 작성하기
              </button>
            </li>
            <li className={styles.tabItem}>
              <button
                className={`${styles.tabButton} ${activeTab === 'response' ? styles.active : ''}`}
                onClick={() => setActiveTab('response')}
              >
                답장 쓰기
              </button>
            </li>
          </ul>
        </div>

        {renderActiveTab()}
      </div>
    </div>
  );
}