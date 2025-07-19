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
        body: JSON.stringify({ userId: userData.user.id }),
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
            {userData.writingLogs.understandingStep.highlightedItems.map((item: any, idx: number) => {
              // userAnswers에서 해당 아이템의 답변 찾기
              const userAnswer = userData.writingLogs.understandingStep.userAnswers?.find((answer: any) => answer.itemId === item.id);
              
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
            {userData.writingLogs.strengthStep.highlightedItems.map((item: any, idx: number) => {
              // userAnswers에서 해당 아이템의 답변 찾기
              const userAnswer = userData.writingLogs.strengthStep.userAnswers?.find((answer: any) => answer.itemId === item.id);
              
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

      {/* Reflection Step */}
      {userData.writingLogs.reflectionStep && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>고민 정리 단계</h3>
          
          {/* 전체 생성된 힌트 표시 */}
          {userData.writingLogs.reflectionStep.allGeneratedHints && userData.writingLogs.reflectionStep.allGeneratedHints.length > 0 && (
            <div className={styles.stepItem}>
              <div className={styles.stepHeader}>
                <div className={styles.stepTitle}>AI 생성 힌트 (reflectionHintsList)</div>
              </div>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>생성된 힌트 목록</div>
                <div className={styles.tagList}>
                  {userData.writingLogs.reflectionStep.allGeneratedHints.map((hint: string, hintIdx: number) => (
                    <span key={hintIdx} className={styles.tag} style={{ background: '#f0f8ff', color: '#0066cc' }}>
                      {hint}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 고민별 상세 정보 - 각 고민을 개별 섹션으로 표시 */}
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>고민 목록 및 상세</div>
              <div className={styles.stepTimestamp}>
                {formatDate(userData.writingLogs.reflectionStep.completedAt)}
              </div>
            </div>
            {userData.writingLogs.reflectionStep.reflectionItems.map((item: any, idx: number) => {
              // 해당 고민에 대한 선택된 힌트 찾기
              const selectedHints = userData.writingLogs.reflectionStep.selectedHintTags?.find(
                (hintTag: any) => hintTag.reflectionId === item.id
              );
              
              // 해당 고민에 대한 inspection 결과 찾기
              const inspectionResult = userData.writingLogs.inspectionData?.inspectionResults?.find(
                (inspection: any) => inspection.reflectionId === item.id
              );
              
              return (
                <div key={idx} className={styles.dataItem} style={{ 
                  marginBottom: '32px', 
                  border: '2px solid #e5e8eb', 
                  padding: '20px', 
                  borderRadius: '12px',
                  backgroundColor: '#fafbfc'
                }}>
                  <div className={styles.dataLabel} style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                    고민 {idx + 1}
                  </div>
                  <div className={styles.dataValue} style={{ 
                    marginBottom: '16px', 
                    fontSize: '15px',
                    padding: '12px',
                    backgroundColor: '#fff',
                    border: '1px solid #e1e5e9',
                    borderRadius: '8px'
                  }}>
                    {item.content}
                  </div>
                  
                  {/* 사용자가 선택한 힌트 표시 */}
                  {selectedHints && selectedHints.tags && selectedHints.tags.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className={styles.dataLabel} style={{ fontSize: '13px', marginBottom: '6px' }}>선택된 힌트</div>
                      <div className={styles.tagList}>
                        {selectedHints.tags.map((tag: string, tagIdx: number) => (
                          <span key={tagIdx} className={styles.tag} style={{ background: '#d1ecf1', color: '#0c5460' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 키워드 표시 */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className={styles.dataLabel} style={{ fontSize: '13px', marginBottom: '6px' }}>추출된 키워드</div>
                      <div className={styles.tagList}>
                        {item.keywords.map((keyword: string, keywordIdx: number) => (
                          <span key={keywordIdx} className={styles.tag} style={{ background: '#fff3cd', color: '#856404' }}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 선택된 태그 표시 */}
                  {item.selectedTags && item.selectedTags.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className={styles.dataLabel} style={{ fontSize: '13px', marginBottom: '6px' }}>선택된 태그</div>
                      <div className={styles.tagList}>
                        {item.selectedTags.map((tagItem: any, tagIdx: number) => (
                          <span key={tagIdx} className={styles.tag} style={{ 
                            background: tagItem.type === 'keyword' ? '#d4edda' : '#f8d7da',
                            color: tagItem.type === 'keyword' ? '#155724' : '#721c24'
                          }}>
                            {tagItem.tag} ({tagItem.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Inspection 결과 표시 */}
                  {inspectionResult && (
                    <div style={{ marginBottom: '16px', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                      <div className={styles.dataLabel} style={{ fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                        🔍 Inspection 결과
                      </div>
                      
                      {/* 감정 검사 결과 */}
                      {inspectionResult.emotionCheck && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className={styles.dataLabel} style={{ fontSize: '12px', marginBottom: '4px' }}>감정 검사</div>
                          <div className={styles.dataValue} style={{ fontSize: '14px' }}>
                            <strong>감정 포함:</strong> {inspectionResult.emotionCheck.hasEmotion ? '예' : '아니오'}
                          </div>
                          {inspectionResult.emotionCheck.suggestion && (
                            <div className={styles.dataValue} style={{ fontSize: '14px', marginTop: '4px' }}>
                              <strong>제안:</strong> {inspectionResult.emotionCheck.suggestion}
                            </div>
                          )}
                          {inspectionResult.emotionCheck.situationSummary && (
                            <div className={styles.dataValue} style={{ fontSize: '14px', marginTop: '4px' }}>
                              <strong>상황 요약:</strong> {inspectionResult.emotionCheck.situationSummary}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 비난 패턴 검사 결과 */}
                      {inspectionResult.blameCheck && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className={styles.dataLabel} style={{ fontSize: '12px', marginBottom: '4px' }}>관점 확장 제안</div>
                          <div className={styles.dataValue} style={{ fontSize: '14px' }}>
                            <strong>비난 패턴 감지:</strong> {inspectionResult.blameCheck.hasBlamePattern ? '예' : '아니오'}
                          </div>
                          {inspectionResult.blameCheck.warning && (
                            <div className={styles.dataValue} style={{ fontSize: '14px', marginTop: '4px', color: '#d73527' }}>
                              <strong>경고:</strong> {inspectionResult.blameCheck.warning}
                            </div>
                          )}
                          {inspectionResult.blameCheck.environmentalFactors && inspectionResult.blameCheck.environmentalFactors.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <div className={styles.dataLabel} style={{ fontSize: '12px', marginBottom: '4px' }}>환경적 요인 제안</div>
                              <div className={styles.tagList}>
                                {inspectionResult.blameCheck.environmentalFactors.map((factor: string, factorIdx: number) => (
                                  <span key={factorIdx} className={styles.tag} style={{ background: '#e2e3e5', color: '#383d41' }}>
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 기존 item에 저장된 inspection 결과도 표시 (fallback) */}
                  {!inspectionResult && (item.emotionCheckResult || item.blameCheckResult) && (
                    <div style={{ marginBottom: '16px', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                      <div className={styles.dataLabel} style={{ fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                        🔍 Inspection 결과 (레거시)
                      </div>
                      
                      {/* 감정 검사 결과 */}
                      {item.emotionCheckResult && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className={styles.dataLabel} style={{ fontSize: '12px', marginBottom: '4px' }}>감정 검사</div>
                          <div className={styles.dataValue} style={{ fontSize: '14px' }}>
                            <strong>감정 포함:</strong> {item.emotionCheckResult.hasEmotion ? '예' : '아니오'}
                          </div>
                          {item.emotionCheckResult.suggestion && (
                            <div className={styles.dataValue} style={{ fontSize: '14px', marginTop: '4px' }}>
                              <strong>제안:</strong> {item.emotionCheckResult.suggestion}
                            </div>
                          )}
                          {item.emotionCheckResult.situationSummary && (
                            <div className={styles.dataValue} style={{ fontSize: '14px', marginTop: '4px' }}>
                              <strong>상황 요약:</strong> {item.emotionCheckResult.situationSummary}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 비난 패턴 검사 결과 */}
                      {item.blameCheckResult && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className={styles.dataLabel} style={{ fontSize: '12px', marginBottom: '4px' }}>관점 확장 제안</div>
                          <div className={styles.dataValue} style={{ fontSize: '14px' }}>
                            <strong>비난 패턴 감지:</strong> {item.blameCheckResult.hasBlamePattern ? '예' : '아니오'}
                          </div>
                          {item.blameCheckResult.warning && (
                            <div className={styles.dataValue} style={{ fontSize: '14px', marginTop: '4px', color: '#d73527' }}>
                              <strong>경고:</strong> {item.blameCheckResult.warning}
                            </div>
                          )}
                          {item.blameCheckResult.environmentalFactors && item.blameCheckResult.environmentalFactors.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <div className={styles.dataLabel} style={{ fontSize: '12px', marginBottom: '4px' }}>환경적 요인 제안</div>
                              <div className={styles.tagList}>
                                {item.blameCheckResult.environmentalFactors.map((factor: string, factorIdx: number) => (
                                  <span key={factorIdx} className={styles.tag} style={{ background: '#e2e3e5', color: '#383d41' }}>
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 검사 단계 및 완료 정보 */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e8eb' }}>
                    <div className={styles.dataValue} style={{ fontSize: '12px', color: '#6b7684' }}>
                      검사 단계: {item.inspectionStep || 0}/3 | 
                      완료 여부: {item.completedAt ? '완료' : '진행 중'} |
                      작성일: {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Solution Exploration Data */}
      {userData.writingLogs.solutionExploration && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>솔루션 탐색 데이터</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>
                솔루션 탐색 완료 - {formatDate(userData.writingLogs.solutionExploration.completedAt)}
              </div>
            </div>
            {userData.writingLogs.solutionExploration.solutionsByReflection.map((reflectionSolution: any, idx: number) => (
              <div key={idx} className={styles.dataItem} style={{ marginBottom: '20px' }}>
                <div className={styles.dataLabel}>고민 {idx + 1} 솔루션</div>
                {reflectionSolution.userSolutions.map((solution: any, solutionIdx: number) => (
                  <div key={solutionIdx} className={styles.dataValue} style={{ 
                    marginBottom: '12px', 
                    padding: '12px', 
                    backgroundColor: solution.isAiGenerated ? '#f0f8ff' : '#f8f9fa',
                    border: '1px solid #e5e8eb',
                    borderRadius: '8px'
                  }}>
                    <div><strong>솔루션 {solutionIdx + 1}:</strong> {solution.content}</div>
                    <div style={{ fontSize: '12px', color: '#6b7684', marginTop: '4px' }}>
                      타입: {solution.isAiGenerated ? 'AI 생성' : '사용자 작성'} |
                      수정됨: {solution.isModified ? '예' : '아니오'} |
                      작성일: {formatDate(solution.createdAt)}
                    </div>
                    {solution.selectedTags && solution.selectedTags.length > 0 && (
                      <div className={styles.tagList} style={{ marginTop: '8px' }}>
                        {solution.selectedTags.map((tag: string, tagIdx: number) => (
                          <span key={tagIdx} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspection Data */}
      {userData.writingLogs.inspectionData && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>검사 데이터</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>
                검사 완료 - {formatDate(userData.writingLogs.inspectionData.completedAt)}
              </div>
            </div>
            {userData.writingLogs.inspectionData.inspectionResults.map((result: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>검사 결과 {idx + 1}</div>
                <div className={styles.dataValue}>
                  <strong>감정 검사:</strong> {result.emotionCheck.hasEmotion ? '감정 포함' : '감정 없음'}
                </div>
                {result.emotionCheck.suggestion && (
                  <div className={styles.dataValue}>
                    <strong>제안:</strong> {result.emotionCheck.suggestion}
                  </div>
                )}
                <div className={styles.dataValue}>
                  <strong>비난 패턴:</strong> {result.blameCheck.hasBlamePattern ? '감지됨' : '감지되지 않음'}
                </div>
                {result.blameCheck.warning && (
                  <div className={styles.dataValue} style={{ color: '#d73527' }}>
                    <strong>경고:</strong> {result.blameCheck.warning}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion Data */}
      {userData.writingLogs.suggestionData && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>제안 데이터</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>
                제안 완료 - {formatDate(userData.writingLogs.suggestionData.completedAt)}
              </div>
            </div>
            
            {/* 전체 생성된 환경적 요인 */}
            {userData.writingLogs.suggestionData.allGeneratedFactors && userData.writingLogs.suggestionData.allGeneratedFactors.length > 0 && (
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>전체 생성된 환경적 요인</div>
                <div className={styles.tagList}>
                  {userData.writingLogs.suggestionData.allGeneratedFactors.map((factor: string, factorIdx: number) => (
                    <span key={factorIdx} className={styles.tag} style={{ background: '#e2e3e5', color: '#383d41' }}>
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 각 고민별 제안 결과 */}
            {userData.writingLogs.suggestionData.suggestionResults.map((result: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>고민 {idx + 1} 제안</div>
                {result.warningText && (
                  <div className={styles.dataValue} style={{ color: '#d73527' }}>
                    <strong>경고:</strong> {result.warningText}
                  </div>
                )}
                {result.environmentalFactors && result.environmentalFactors.length > 0 && (
                  <div>
                    <div className={styles.dataLabel} style={{ fontSize: '12px', marginTop: '8px' }}>환경적 요인</div>
                    <div className={styles.tagList}>
                      {result.environmentalFactors.map((factor: string, factorIdx: number) => (
                        <span key={factorIdx} className={styles.tag} style={{ background: '#fff3cd', color: '#856404' }}>
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letter Content Data */}
      {userData.writingLogs.letterContentData && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>편지 내용 데이터</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>
                편지 내용 완료 - {formatDate(userData.writingLogs.letterContentData.completedAt)}
              </div>
            </div>
            <div className={styles.dataItem}>
              <div className={styles.dataLabel}>최종 편지 내용</div>
              <div className={styles.codeBlock}>
                {userData.writingLogs.letterContentData.letterContent}
              </div>
            </div>
            {userData.writingLogs.letterContentData.strengthKeywords && userData.writingLogs.letterContentData.strengthKeywords.length > 0 && (
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>강점 키워드</div>
                <div className={styles.tagList}>
                  {userData.writingLogs.letterContentData.strengthKeywords.map((keyword: string, keywordIdx: number) => (
                    <span key={keywordIdx} className={styles.tag} style={{ background: '#e7f3ff', color: '#3182f6' }}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Strength Tags Data */}
      {userData.writingLogs.aiStrengthTagsData && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>AI 강점 태그 데이터</h3>
          <div className={styles.stepItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitle}>
                AI 강점 태그 생성 - {formatDate(userData.writingLogs.aiStrengthTagsData.createdAt)}
              </div>
            </div>
            {userData.writingLogs.aiStrengthTagsData.strengthTagsByReflection.map((reflectionTags: any, idx: number) => (
              <div key={idx} className={styles.dataItem}>
                <div className={styles.dataLabel}>고민 {idx + 1} AI 강점 태그</div>
                <div className={styles.tagList}>
                  {reflectionTags.aiStrengthTags.map((tag: string, tagIdx: number) => (
                    <span key={tagIdx} className={styles.tag} style={{ background: '#f0f8ff', color: '#0066cc' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className={styles.dataValue} style={{ fontSize: '12px', color: '#6b7684', marginTop: '4px' }}>
                  생성일: {formatDate(reflectionTags.generatedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!userData.writingLogs.understandingStep && !userData.writingLogs.strengthStep && 
       !userData.writingLogs.reflectionStep && !userData.writingLogs.magicMixData && 
       !userData.writingLogs.solutionExploration && !userData.writingLogs.inspectionData && 
       !userData.writingLogs.suggestionData && !userData.writingLogs.letterContentData && 
       !userData.writingLogs.aiStrengthTagsData && (
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