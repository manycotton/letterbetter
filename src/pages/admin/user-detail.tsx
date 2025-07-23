import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/Admin.module.css';

interface User {
  userId: string;
  nickname: string;
  password: string;
  createdAt: string;
}

interface UserData {
  user: User;
  questionAnswers: any[];
  generatedLetters: any[];
  letterData: any[]; // 편지별로 정리된 데이터
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (userId) {
      fetchUserData(userId as string);
    }
    // Admin 페이지 body 배경 설정
    document.body.classList.add('admin-body');
    return () => {
      document.body.classList.remove('admin-body');
    };
  }, [userId]);

  // 자동 새로고침 기능
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      fetchUserData(userId as string);
    }, 15000); // 15초마다 새로고침 (상세 페이지는 조금 더 길게)

    return () => clearInterval(interval);
  }, [autoRefresh, userId]);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      setUserData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const handleDeleteUser = async () => {
    if (!userData) return;
    
    const confirmed = window.confirm(`정말로 사용자 "${userData.user.nickname}"의 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/admin/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userData.user.userId }),
      });

      if (response.ok) {
        alert('사용자 데이터가 성공적으로 삭제되었습니다.');
        router.push('/admin');
      } else {
        const errorData = await response.json();
        alert(`삭제 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('사용자 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.userDetailContainer} admin-page`}>
        <div className={styles.loading}>사용자 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className={`${styles.userDetailContainer} admin-page`}>
        <div className={styles.error}>오류: {error || '사용자를 찾을 수 없습니다.'}</div>
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
      {userData.letterData?.filter(ld => ld.letter).map((letterData) => (
        <div key={letterData.letter.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>편지 {letterData.letterNumber}</h3>
          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>캐릭터</div>
              <div className={styles.dataValue}>{letterData.letter.characterName} ({letterData.letter.age}세, {letterData.letter.occupation})</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>편지 내용</div>
              <div className={styles.codeBlock}>
                {Array.isArray(letterData.letter.letterContent) 
                  ? letterData.letter.letterContent.join('\n\n') 
                  : letterData.letter.letterContent}
              </div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>사용된 강점</div>
              <div className={styles.tagList}>
                {letterData.letter.usedStrengths.map((strength: string, idx: number) => (
                  <span key={idx} className={styles.tag}>{strength}</span>
                ))}
              </div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>생성일</div>
              <div className={styles.dataValue}>{formatDate(letterData.letter.createdAt)}</div>
            </div>
          </div>
        </div>
      )) || []}
      {userData.generatedLetters.length === 0 && (
        <div className={styles.noData}>생성된 편지가 없습니다.</div>
      )}
    </div>
  );

  const renderWritingTab = () => (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>편지 작성하기</h2>
      
      {/* 편지별로 로그 표시 */}
      {userData.letterData?.map((letterData) => {
        const writingLogs = letterData.writingLogs;
        
        // 로그가 없는 경우 스킵
        if (!writingLogs.understandingStep && !writingLogs.strengthStep && !writingLogs.reflectionStep && 
            !writingLogs.magicMixData && !writingLogs.solutionExploration && !writingLogs.suggestionData && 
            !writingLogs.letterContentData && !writingLogs.aiStrengthTagsData) {
          return null;
        }
        
        return (
          <div key={letterData.questionAnswers?.id || letterData.letter?.id} className={styles.section} style={{ marginBottom: '60px', border: '2px solid #e5e8eb', borderRadius: '12px', padding: '24px' }}>
            <h2 className={styles.sectionTitle} style={{ fontSize: '20px', marginBottom: '24px', color: '#1f2937' }}>
              편지 {letterData.letterNumber} - 작성 활동
              {letterData.letter && (
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7684', marginLeft: '12px' }}>
                  ({letterData.letter.characterName})
                </span>
              )}
            </h2>
            
            {/* Understanding Step */}
            {writingLogs.understandingStep && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>이해하기 단계</h3>
                <div className={styles.stepItem}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepTitle}>하이라이트된 항목들</div>
                    <div className={styles.stepTimestamp}>
                      {formatDate(writingLogs.understandingStep.completedAt)}
                    </div>
                  </div>
                  {writingLogs.understandingStep.highlightedItems.map((item: any, idx: number) => {
                    // userAnswers에서 해당 아이템의 답변 찾기
                    const userAnswer = writingLogs.understandingStep.userAnswers?.find((answer: any) => answer.itemId === item.id);
                    
                    return (
                      <div key={idx} className={styles.dataItem}>
                        <div className={styles.dataLabel}>하이라이트 {idx + 1}</div>
                        <div className={styles.dataValue}>{item.text}</div>
                        
                        {/* 3개의 질문에 대한 답변 표시 */}
                        {userAnswer?.answers && userAnswer.answers.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            {userAnswer.answers.map((qa: any, qaIdx: number) => (
                              qa.answer && (
                                <div key={qaIdx} className={styles.dataValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                                  <strong>
                                    {qa.question === 'problemReason' ? '고민 이유' : 
                                     qa.question === 'userExplanation' ? '사용자 설명' : 
                                     qa.question === 'emotionInference' ? '감정 추론' : qa.question}:
                                  </strong> {qa.answer}
                                </div>
                              )
                            ))}
                          </div>
                        )}
                        
                        {/* 기존 방식 fallback - userAnswers가 없는 경우 */}
                        {(!userAnswer || !userAnswer.answers) && item.userExplanation && (
                          <div className={styles.dataValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                            설명: {item.userExplanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strength Finding Step */}
            {writingLogs.strengthStep && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>강점찾기 단계</h3>
                <div className={styles.stepItem}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepTitle}>강점 항목들</div>
                    <div className={styles.stepTimestamp}>
                      {formatDate(writingLogs.strengthStep.completedAt)}
                    </div>
                  </div>
                  {writingLogs.strengthStep.highlightedItems.map((item: any, idx: number) => {
                    // userAnswers에서 해당 아이템의 답변 찾기
                    const userAnswer = writingLogs.strengthStep.userAnswers?.find((answer: any) => answer.itemId === item.id);
                    
                    return (
                      <div key={idx} className={styles.dataItem}>
                        <div className={styles.dataLabel}>강점 {idx + 1}</div>
                        <div className={styles.dataValue}>{item.text}</div>
                        
                        {/* 강점 관련 질문에 대한 답변 표시 */}
                        {userAnswer?.answers && userAnswer.answers.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            {userAnswer.answers.map((qa: any, qaIdx: number) => (
                              qa.answer && (
                                <div key={qaIdx} className={styles.dataValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                                  <strong>
                                    {qa.question === 'strengthDescription' ? '강점 설명' : 
                                     qa.question === 'strengthApplication' ? '강점 적용' : qa.question}:
                                  </strong> {qa.answer}
                                </div>
                              )
                            ))}
                          </div>
                        )}
                        
                        {/* 기존 방식 fallback - userAnswers가 없는 경우 */}
                        {(!userAnswer || !userAnswer.answers) && item.strengthDescription && (
                          <div className={styles.dataValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                            설명: {item.strengthDescription}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other sections continue... */}
            {/* 긴 코드이므로 일부 생략 */}
          </div>
        );
      }) || []}
      
      {/* 로그가 전혀 없는 경우 */}
      {(!userData.letterData || userData.letterData.every(ld => {
        const logs = ld.writingLogs;
        return !logs.understandingStep && !logs.strengthStep && !logs.reflectionStep && 
               !logs.magicMixData && !logs.solutionExploration && !logs.suggestionData && 
               !logs.letterContentData && !logs.aiStrengthTagsData;
      })) && (
        <div className={styles.noData}>편지 작성 로그가 없습니다.</div>
      )}
    </div>
  );

  const renderResponseTab = () => (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>답장 쓰기</h2>
      {userData.letterData?.filter(ld => ld.responseData).map((letterData) => (
        <div key={letterData.responseData.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>편지 {letterData.letterNumber} - 답장</h3>
          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>수신자</div>
              <div className={styles.dataValue}>{letterData.responseData.characterName}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>AI 생성 원본</div>
              <div className={styles.codeBlock}>{letterData.responseData.originalGeneratedLetter}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>사용자 수정 최종본</div>
              <div className={styles.codeBlock}>{letterData.responseData.finalEditedLetter}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>생성일</div>
              <div className={styles.dataValue}>{formatDate(letterData.responseData.generatedAt)}</div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>완료일</div>
              <div className={styles.dataValue}>{formatDate(letterData.responseData.finalizedAt)}</div>
            </div>
          </div>
        </div>
      )) || []}
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
    <div className={`${styles.userDetailContainer} admin-page`}>
      <div className={styles.userDetailHeader}>
        <h1 className={styles.userDetailTitle}>
          {userData.user.nickname} 상세 정보
        </h1>
        <div className={styles.headerActions}>
          <div className={styles.refreshInfo}>
            <span className={styles.lastUpdated}>
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
            <div className={styles.refreshControls}>
              <button
                className={styles.refreshButton}
                onClick={() => fetchUserData(userId as string)}
                disabled={loading}
              >
                {loading ? '새로고침 중...' : '🔄'}
              </button>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                자동 새로고침 (15초)
              </label>
            </div>
          </div>
          <div className={styles.actionButtons}>
            <button
              className={styles.deleteUserButton}
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '🗑️ 사용자 삭제'}
            </button>
            <Link href="/admin" className={styles.backButton}>
              ← 관리자 페이지로 돌아가기
            </Link>
          </div>
        </div>
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