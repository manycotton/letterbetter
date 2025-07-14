import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AdminToss.module.css';

interface User {
  id: string;
  nickname: string;
  createdAt: string;
  sessionCount: number;
  reflectionCount: number;
  completedReflectionCount: number;
  lastActivity: string;
  questionAnswersCount: number;
}

interface QuestionAnswers {
  id: string;
  userId: string;
  answers: string[];
  createdAt: string;
  updatedAt: string;
  hasGeneratedLetter: boolean;
  hasSessions: boolean;
  sessionCount: number;
  completedReflections: number;
}

interface QuestionAnswersDetail {
  questionAnswers: QuestionAnswers;
  generatedLetter?: {
    id: string;
    characterName: string;
    age: number;
    occupation: string;
    letterContent: string[];
    usedStrengths: string[];
    createdAt: string;
  };
  sessions: Array<{
    id: string;
    currentStep: number;
    highlightedItems: Array<{
      id: string;
      text: string;
      color: string;
      userExplanation?: string;
      problemReason?: string;
      emotionInference?: string;
    }>;
    strengthItems?: Array<{
      id: string;
      text: string;
      color: string;
      strengthDescription?: string;
      strengthApplication?: string;
    }>;
    reflectionItems: Array<{
      id: string;
      content: string;
      keywords?: string[];
      selectedTags?: Array<{tag: string, type: 'keyword' | 'factor'}>;
      inspectionStep?: number;
      emotionCheckResult?: any;
      blameCheckResult?: any;
      solutionContent?: string;
      solutionCompleted?: boolean;
    }>;
    reflectionHints?: {
      characterName: string;
      generatedHints: string[];
    };
    createdAt: string;
    updatedAt: string;
  }>;
  userBehaviorAnalysis: {
    totalHighlights: number;
    totalReflections: number;
    completionRate: number;
    averageReflectionLength: number;
    mostUsedColors: Array<{color: string, count: number}>;
    keywordUsage: Array<{keyword: string, count: number}>;
    emotionCheckPassed: number;
    blameCheckPassed: number;
  };
}

const AdminV3: React.FC = () => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userQuestionAnswers, setUserQuestionAnswers] = useState<QuestionAnswers[]>([]);
  const [selectedQuestionAnswers, setSelectedQuestionAnswers] = useState<QuestionAnswersDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (currentTab === 'dashboard') {
      fetchStats();
    } else if (currentTab === 'users') {
      fetchUsers();
    }
  }, [currentTab, currentPage, searchTerm]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats-v3');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users-v3?page=${currentPage}&limit=20&search=${searchTerm}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserQuestionAnswers = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/user-question-answers/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserQuestionAnswers(data.questionAnswers);
        setSelectedUser(data.user);
        setCurrentTab('user-questions');
      }
    } catch (error) {
      console.error('Error fetching user question answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionAnswersDetail = async (answersId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/question-answers-detail/${answersId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedQuestionAnswers(data);
        setCurrentTab('answers-detail');
      }
    } catch (error) {
      console.error('Error fetching question answers detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 0: return '미시작';
      case 1: return '감정검사';
      case 2: return '비난검사';
      case 3: return '완료';
      default: return '알 수 없음';
    }
  };

  const renderSidebar = () => (
    <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <h1 className={styles.logo}>Letter Better</h1>
        <p className={styles.subtitle}>Admin Dashboard v3</p>
      </div>
      
      <div className={styles.navMenu}>
        <button 
          className={`${styles.navItem} ${currentTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <span className={styles.navIcon}>👥</span>
          사용자 관리
        </button>
        
        {currentTab === 'user-questions' && selectedUser && (
          <button 
            className={`${styles.navItem} ${styles.active}`}
            onClick={() => setCurrentTab('users')}
          >
            <span className={styles.navIcon}>📝</span>
            {selectedUser.nickname}의 질문답변
          </button>
        )}
        
        {currentTab === 'answers-detail' && selectedQuestionAnswers && (
          <button 
            className={`${styles.navItem} ${styles.active}`}
            onClick={() => setCurrentTab('user-questions')}
          >
            <span className={styles.navIcon}>📋</span>
            답변 상세 분석
          </button>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>사용자 목록</h3>
        <input
          type="text"
          placeholder="사용자 닉네임 검색..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          사용자 목록을 불러오는 중...
        </div>
      ) : stats ? (
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.tableHeadCell}>사용자</th>
              <th className={styles.tableHeadCell}>질문답변</th>
              <th className={styles.tableHeadCell}>AI편지</th>
              <th className={styles.tableHeadCell}>세션</th>
              <th className={styles.tableHeadCell}>고민완료</th>
              <th className={styles.tableHeadCell}>최근 활동</th>
            </tr>
          </thead>
          <tbody>
            {stats.users.map((user: User) => (
              <tr 
                key={user.id} 
                className={styles.tableRow}
                onClick={() => fetchUserQuestionAnswers(user.id)}
              >
                <td className={styles.tableCell}>
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {user.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.userName}>{user.nickname}</div>
                      <div className={styles.userEmail}>{user.id.slice(0, 20)}...</div>
                    </div>
                  </div>
                </td>
                <td className={styles.tableCell}>
                  <span className={`${styles.badge} ${styles.info}`}>
                    {user.questionAnswersCount}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <span className={`${styles.badge} ${user.sessionCount > 0 ? styles.success : styles.error}`}>
                    {user.sessionCount > 0 ? '생성' : '미생성'}
                  </span>
                </td>
                <td className={styles.tableCell}>{user.sessionCount}</td>
                <td className={styles.tableCell}>
                  <span className={`${styles.badge} ${
                    user.reflectionCount > 0 ? 
                      (user.completedReflectionCount / user.reflectionCount) >= 0.8 ? styles.success : 
                      (user.completedReflectionCount / user.reflectionCount) >= 0.5 ? styles.warning : styles.error
                    : styles.info
                  }`}>
                    {user.completedReflectionCount}/{user.reflectionCount}
                  </span>
                </td>
                <td className={styles.tableCell}>{formatDate(user.lastActivity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.loading}>데이터를 불러올 수 없습니다.</div>
      )}
    </div>
  );

  const renderUsers = () => renderDashboard();

  const renderUserQuestions = () => (
    <div>
      {selectedUser && (
        <>
          <div className={styles.userDetailHeader}>
            <h2 className={styles.userDetailName}>{selectedUser.nickname}의 질문 답변 목록</h2>
            <div className={styles.userDetailDate}>
              가입일: {formatDate(selectedUser.createdAt)}
            </div>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeadCell}>질문1 (신경다양성)</th>
                  <th className={styles.tableHeadCell}>질문2 (고민)</th>
                  <th className={styles.tableHeadCell}>AI편지</th>
                  <th className={styles.tableHeadCell}>세션수</th>
                  <th className={styles.tableHeadCell}>완료된 고민</th>
                  <th className={styles.tableHeadCell}>작성일</th>
                </tr>
              </thead>
              <tbody>
                {userQuestionAnswers.map(qa => (
                  <tr 
                    key={qa.id} 
                    className={styles.tableRow}
                    onClick={() => fetchQuestionAnswersDetail(qa.id)}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.answerPreview}>
                        {qa.answers[0]?.substring(0, 30)}...
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.answerPreview}>
                        {qa.answers[1]?.substring(0, 30)}...
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${qa.hasGeneratedLetter ? styles.success : styles.error}`}>
                        {qa.hasGeneratedLetter ? '생성됨' : '미생성'}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${styles.info}`}>
                        {qa.sessionCount}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${qa.completedReflections > 0 ? styles.success : styles.error}`}>
                        {qa.completedReflections}
                      </span>
                    </td>
                    <td className={styles.tableCell}>{formatDate(qa.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderAnswersDetail = () => (
    <div>
      {selectedQuestionAnswers && (
        <>
          <div className={styles.answerDetailContainer}>
            <h2 className={styles.sectionTitle}>질문 답변 상세</h2>
            <div className={styles.answerGrid}>
              <div className={styles.answerCard}>
                <h4>질문 1: 신경다양성 조건</h4>
                <p className={styles.answerContent}>{selectedQuestionAnswers.questionAnswers.answers[0]}</p>
              </div>
              <div className={styles.answerCard}>
                <h4>질문 2: 최근 고민</h4>
                <p className={styles.answerContent}>{selectedQuestionAnswers.questionAnswers.answers[1]}</p>
              </div>
              <div className={styles.answerCard}>
                <h4>질문 3: 추가 정보</h4>
                <p className={styles.answerContent}>{selectedQuestionAnswers.questionAnswers.answers[2] || '답변 없음'}</p>
              </div>
            </div>
          </div>

          {selectedQuestionAnswers.generatedLetter && (
            <div className={styles.letterContainer}>
              <h2 className={styles.sectionTitle}>AI 생성 편지</h2>
              <div className={styles.letterCard}>
                <div className={styles.letterHeader}>
                  <h3>{selectedQuestionAnswers.generatedLetter.characterName} ({selectedQuestionAnswers.generatedLetter.age}세)</h3>
                  <p>직업: {selectedQuestionAnswers.generatedLetter.occupation}</p>
                  <p>생성일: {formatDate(selectedQuestionAnswers.generatedLetter.createdAt)}</p>
                </div>
                <div className={styles.letterContent}>
                  {selectedQuestionAnswers.generatedLetter.letterContent.map((paragraph, index) => (
                    <p key={index} className={styles.letterParagraph}>{paragraph}</p>
                  ))}
                </div>
                <div className={styles.letterStrengths}>
                  <h4>사용된 강점들:</h4>
                  <div className={styles.tagContainer}>
                    {selectedQuestionAnswers.generatedLetter.usedStrengths.map((strength, index) => (
                      <span key={index} className={`${styles.tag} ${styles.strength}`}>
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.behaviorAnalysisContainer}>
            <h2 className={styles.sectionTitle}>사용자 행동 분석</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedQuestionAnswers.userBehaviorAnalysis.totalHighlights}</h3>
                <p className={styles.statLabel}>총 하이라이트</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedQuestionAnswers.userBehaviorAnalysis.totalReflections}</h3>
                <p className={styles.statLabel}>총 고민 정리</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedQuestionAnswers.userBehaviorAnalysis.completionRate.toFixed(1)}%</h3>
                <p className={styles.statLabel}>완료율</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedQuestionAnswers.userBehaviorAnalysis.averageReflectionLength.toFixed(0)}</h3>
                <p className={styles.statLabel}>평균 고민 길이 (글자)</p>
              </div>
            </div>

            {selectedQuestionAnswers.userBehaviorAnalysis.mostUsedColors.length > 0 && (
              <div className={styles.colorUsageContainer}>
                <h3>자주 사용한 하이라이트 색상</h3>
                <div className={styles.colorUsageGrid}>
                  {selectedQuestionAnswers.userBehaviorAnalysis.mostUsedColors.map((colorData, index) => (
                    <div key={index} className={styles.colorUsageItem}>
                      <div 
                        className={styles.colorSample} 
                        style={{ backgroundColor: colorData.color }}
                      ></div>
                      <span>{colorData.count}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedQuestionAnswers.userBehaviorAnalysis.keywordUsage.length > 0 && (
              <div className={styles.keywordUsageContainer}>
                <h3>자주 사용한 키워드</h3>
                <div className={styles.tagContainer}>
                  {selectedQuestionAnswers.userBehaviorAnalysis.keywordUsage.map((keywordData, index) => (
                    <span key={index} className={`${styles.tag} ${styles.keyword}`}>
                      {keywordData.keyword} ({keywordData.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.sessionsContainer}>
            <h2 className={styles.sectionTitle}>Writing 세션 상세</h2>
            {selectedQuestionAnswers.sessions.map((session, sessionIndex) => (
              <div key={session.id} className={styles.sessionCard}>
                <div className={styles.sessionHeader}>
                  <h3>세션 {sessionIndex + 1}</h3>
                  <div className={styles.sessionMeta}>
                    <span>단계: {session.currentStep}/3</span>
                    <span>생성일: {formatDate(session.createdAt)}</span>
                    <span>수정일: {formatDate(session.updatedAt)}</span>
                  </div>
                </div>

                {session.highlightedItems.length > 0 && (
                  <div className={styles.highlightsSection}>
                    <h4>1단계: 이해하기 하이라이트</h4>
                    {session.highlightedItems.map((highlight, index) => (
                      <div key={highlight.id} className={styles.highlightItem}>
                        <div 
                          className={styles.highlightText}
                          style={{ backgroundColor: highlight.color + '40' }}
                        >
                          {highlight.text}
                        </div>
                        {highlight.userExplanation && (
                          <div className={styles.highlightExplanation}>
                            <strong>사용자 설명:</strong> {highlight.userExplanation}
                          </div>
                        )}
                        {highlight.problemReason && (
                          <div className={styles.highlightReason}>
                            <strong>고민 이유:</strong> {highlight.problemReason}
                          </div>
                        )}
                        {highlight.emotionInference && (
                          <div className={styles.highlightEmotion}>
                            <strong>감정 추론:</strong> {highlight.emotionInference}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {session.strengthItems && session.strengthItems.length > 0 && (
                  <div className={styles.strengthsSection}>
                    <h4>2단계: 강점 하이라이트</h4>
                    {session.strengthItems.map((strength, index) => (
                      <div key={strength.id} className={styles.strengthItem}>
                        <div 
                          className={styles.strengthText}
                          style={{ backgroundColor: strength.color + '40' }}
                        >
                          {strength.text}
                        </div>
                        {strength.strengthDescription && (
                          <div className={styles.strengthDescription}>
                            <strong>강점 설명:</strong> {strength.strengthDescription}
                          </div>
                        )}
                        {strength.strengthApplication && (
                          <div className={styles.strengthApplication}>
                            <strong>강점 적용:</strong> {strength.strengthApplication}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {session.reflectionHints && (
                  <div className={styles.hintsSection}>
                    <h4>AI 생성 추천 키워드 ({session.reflectionHints.characterName})</h4>
                    <div className={styles.tagContainer}>
                      {session.reflectionHints.generatedHints.map((hint, index) => (
                        <span key={index} className={`${styles.tag} ${styles.hint}`}>
                          {hint}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {session.reflectionItems.length > 0 && (
                  <div className={styles.reflectionsSection}>
                    <h4>고민 정리</h4>
                    {session.reflectionItems.map((reflection, index) => (
                      <div key={reflection.id} className={styles.reflectionItem}>
                        <div className={styles.reflectionHeader}>
                          <span className={`${styles.badge} ${
                            reflection.inspectionStep === 3 ? styles.success : 
                            reflection.inspectionStep === 2 ? styles.warning : 
                            reflection.inspectionStep === 1 ? styles.info : styles.error
                          }`}>
                            {getStepLabel(reflection.inspectionStep || 0)}
                          </span>
                          {reflection.solutionCompleted && (
                            <span className={`${styles.badge} ${styles.success}`}>
                              해결방안 작성완료
                            </span>
                          )}
                        </div>
                        
                        <div className={styles.reflectionContent}>
                          <strong>고민 내용:</strong>
                          <p>{reflection.content}</p>
                        </div>

                        {reflection.keywords && reflection.keywords.length > 0 && (
                          <div className={styles.reflectionKeywords}>
                            <strong>키워드:</strong>
                            <div className={styles.tagContainer}>
                              {reflection.keywords.map((keyword, i) => (
                                <span key={i} className={`${styles.tag} ${styles.keyword}`}>
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {reflection.selectedTags && reflection.selectedTags.length > 0 && (
                          <div className={styles.reflectionTags}>
                            <strong>사용자 선택 태그:</strong>
                            <div className={styles.tagContainer}>
                              {reflection.selectedTags.map((tag, i) => (
                                <span key={i} className={`${styles.tag} ${tag.type === 'keyword' ? styles.keyword : styles.factor}`}>
                                  {tag.tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {reflection.solutionContent && (
                          <div className={styles.solutionContent}>
                            <strong>해결방안:</strong>
                            <p>{reflection.solutionContent}</p>
                          </div>
                        )}

                        {(reflection.emotionCheckResult || reflection.blameCheckResult) && (
                          <div className={styles.inspectionResults}>
                            {reflection.emotionCheckResult && (
                              <div className={`${styles.inspectionCard} ${
                                reflection.emotionCheckResult.hasEmotion ? styles.success : styles.warning
                              }`}>
                                <h5>감정 검사</h5>
                                <div className={styles.inspectionResult}>
                                  {reflection.emotionCheckResult.hasEmotion ? '✅ 통과' : '⚠️ 실패'}
                                </div>
                                {reflection.emotionCheckResult.suggestion && (
                                  <div className={styles.inspectionSuggestion}>
                                    {reflection.emotionCheckResult.suggestion}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {reflection.blameCheckResult && (
                              <div className={`${styles.inspectionCard} ${
                                reflection.blameCheckResult.hasBlamePattern ? styles.error : styles.success
                              }`}>
                                <h5>비난 패턴 검사</h5>
                                <div className={styles.inspectionResult}>
                                  {reflection.blameCheckResult.hasBlamePattern ? '❌ 패턴 발견' : '✅ 통과'}
                                </div>
                                {reflection.blameCheckResult.warning && (
                                  <div className={styles.inspectionSuggestion}>
                                    {reflection.blameCheckResult.warning}
                                  </div>
                                )}
                                {reflection.blameCheckResult.environmentalFactors && reflection.blameCheckResult.environmentalFactors.length > 0 && (
                                  <div className={styles.tagContainer}>
                                    {reflection.blameCheckResult.environmentalFactors.map((factor: string, i: number) => (
                                      <span key={i} className={`${styles.tag} ${styles.factor}`}>
                                        {factor}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      {renderSidebar()}
      
      <div className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            {currentTab === 'dashboard' ? '사용자 관리' : 
             currentTab === 'user-questions' ? `${selectedUser?.nickname}의 질문답변` :
             currentTab === 'answers-detail' ? '답변 상세 분석' : ''}
          </h1>
          <div className={styles.headerActions}>
            <button 
              className={styles.exportButton}
              onClick={() => router.push('/')}
            >
              메인으로
            </button>
          </div>
        </div>
        
        <div className={styles.content}>
          {currentTab === 'dashboard' && renderDashboard()}
          {currentTab === 'user-questions' && renderUserQuestions()}
          {currentTab === 'answers-detail' && renderAnswersDetail()}
        </div>
      </div>
    </div>
  );
};

export default AdminV3;