import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AdminClean.module.css';

interface User {
  id: string;
  nickname: string;
  createdAt: string;
  sessionCount: number;
  reflectionCount: number;
  completedReflectionCount: number;
  lastActivity: string;
}

interface UserActivity {
  user: {
    id: string;
    nickname: string;
    createdAt: string;
  };
  timeline: TimelineItem[];
  analysis: any;
  sessions: any[];
  answers: any[];
}

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  data: any;
}

const AdminV2: React.FC = () => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null);
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
      const response = await fetch('/api/admin/stats');
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
      const response = await fetch(`/api/admin/users?page=${currentPage}&limit=20&search=${searchTerm}`);
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

  const fetchUserActivity = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/user-activity/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
        setCurrentTab('user-detail');
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: string = 'json', userId?: string) => {
    try {
      const url = userId ? 
        `/api/admin/export?format=${format}&userId=${userId}` : 
        `/api/admin/export?format=${format}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `user-data-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'signup': return '👤';
      case 'questionnaire': return '📝';
      case 'highlight': return '🎨';
      case 'reflection': return '💭';
      default: return '📊';
    }
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
        <p className={styles.subtitle}>Admin Dashboard</p>
      </div>
      
      <div className={styles.navMenu}>
        <button 
          className={`${styles.navItem} ${currentTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <span className={styles.navIcon}>📊</span>
          대시보드
        </button>
        
        <button 
          className={`${styles.navItem} ${currentTab === 'users' ? styles.active : ''}`}
          onClick={() => setCurrentTab('users')}
        >
          <span className={styles.navIcon}>👥</span>
          사용자 관리
        </button>
        
        {currentTab === 'user-detail' && (
          <button 
            className={`${styles.navItem} ${styles.active}`}
            onClick={() => setCurrentTab('users')}
          >
            <span className={styles.navIcon}>👤</span>
            사용자 상세
          </button>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div>
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          통계를 불러오는 중...
        </div>
      ) : stats ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.totalUsers}</h3>
              <p className={styles.statLabel}>총 사용자</p>
              <div className={styles.statTrend}>
                {stats.totalUsers > 0 ? '📈 활성' : '📊 대기'}
              </div>
            </div>
            
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.totalSessions}</h3>
              <p className={styles.statLabel}>총 세션</p>
              <p className={styles.statDetail}>
                사용자당 평균: {stats.totalUsers > 0 ? (stats.totalSessions / stats.totalUsers).toFixed(1) : 0}
              </p>
            </div>
            
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.totalReflections}</h3>
              <p className={styles.statLabel}>총 고민 정리</p>
              <p className={styles.statDetail}>
                세션당 평균: {stats.totalSessions > 0 ? (stats.totalReflections / stats.totalSessions).toFixed(1) : 0}
              </p>
            </div>
            
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.completedReflections}</h3>
              <p className={styles.statLabel}>완료된 고민</p>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${stats.completionRate}%` }}
                ></div>
              </div>
              <p className={styles.statDetail}>완료율: {stats.completionRate}%</p>
            </div>
          </div>
          
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.emotionCheckStats.passed}</h3>
              <p className={styles.statLabel}>감정 검사 통과</p>
              <p className={styles.statDetail}>
                실패: {stats.emotionCheckStats.failed}건
              </p>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ 
                    width: `${stats.emotionCheckStats.passed + stats.emotionCheckStats.failed > 0 ? 
                      (stats.emotionCheckStats.passed / (stats.emotionCheckStats.passed + stats.emotionCheckStats.failed)) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.blameCheckStats.passed}</h3>
              <p className={styles.statLabel}>비난 검사 통과</p>
              <p className={styles.statDetail}>
                실패: {stats.blameCheckStats.failed}건
              </p>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ 
                    width: `${stats.blameCheckStats.passed + stats.blameCheckStats.failed > 0 ? 
                      (stats.blameCheckStats.passed / (stats.blameCheckStats.passed + stats.blameCheckStats.failed)) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>최근 활동 사용자</h3>
            </div>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeadCell}>사용자</th>
                  <th className={styles.tableHeadCell}>세션</th>
                  <th className={styles.tableHeadCell}>고민</th>
                  <th className={styles.tableHeadCell}>완료</th>
                  <th className={styles.tableHeadCell}>완료율</th>
                  <th className={styles.tableHeadCell}>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.map((user: User) => (
                  <tr 
                    key={user.id} 
                    className={styles.tableRow}
                    onClick={() => fetchUserActivity(user.id)}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {user.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.userName}>{user.nickname}</div>
                          <div className={styles.userEmail}>{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${styles.info}`}>
                        {user.sessionCount}
                      </span>
                    </td>
                    <td className={styles.tableCell}>{user.reflectionCount}</td>
                    <td className={styles.tableCell}>{user.completedReflectionCount}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${
                        user.reflectionCount > 0 ? 
                          (user.completedReflectionCount / user.reflectionCount) >= 0.8 ? styles.success : 
                          (user.completedReflectionCount / user.reflectionCount) >= 0.5 ? styles.warning : styles.error
                        : styles.info
                      }`}>
                        {user.reflectionCount > 0 ? 
                          `${((user.completedReflectionCount / user.reflectionCount) * 100).toFixed(0)}%` : 
                          '0%'
                        }
                      </span>
                    </td>
                    <td className={styles.tableCell}>{formatDate(user.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className={styles.loading}>데이터를 불러올 수 없습니다.</div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div>
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
        ) : (
          <>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeadCell}>사용자</th>
                  <th className={styles.tableHeadCell}>세션</th>
                  <th className={styles.tableHeadCell}>고민</th>
                  <th className={styles.tableHeadCell}>완료</th>
                  <th className={styles.tableHeadCell}>완료율</th>
                  <th className={styles.tableHeadCell}>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr 
                    key={user.id} 
                    className={styles.tableRow}
                    onClick={() => fetchUserActivity(user.id)}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {user.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.userName}>{user.nickname}</div>
                          <div className={styles.userEmail}>{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${styles.info}`}>
                        {user.sessionCount}
                      </span>
                    </td>
                    <td className={styles.tableCell}>{user.reflectionCount}</td>
                    <td className={styles.tableCell}>{user.completedReflectionCount}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${
                        user.reflectionCount > 0 ? 
                          (user.completedReflectionCount / user.reflectionCount) >= 0.8 ? styles.success : 
                          (user.completedReflectionCount / user.reflectionCount) >= 0.5 ? styles.warning : styles.error
                        : styles.info
                      }`}>
                        {user.reflectionCount > 0 ? 
                          `${((user.completedReflectionCount / user.reflectionCount) * 100).toFixed(0)}%` : 
                          '0%'
                        }
                      </span>
                    </td>
                    <td className={styles.tableCell}>{formatDate(user.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button 
                  className={styles.paginationButton}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button 
                  className={styles.paginationButton}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderUserDetail = () => (
    <div>
      {selectedUser && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{selectedUser.analysis.totalSessions}</h3>
              <p className={styles.statLabel}>총 세션</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{selectedUser.analysis.totalReflections}</h3>
              <p className={styles.statLabel}>총 고민 정리</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{selectedUser.analysis.completedReflections}</h3>
              <p className={styles.statLabel}>완료된 고민</p>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${selectedUser.analysis.behaviorAnalysis.completionRate}%` }}
                ></div>
              </div>
              <p className={styles.statDetail}>완료율: {selectedUser.analysis.behaviorAnalysis.completionRate.toFixed(1)}%</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{selectedUser.analysis.textAnalysis.totalWordsInReflections}</h3>
              <p className={styles.statLabel}>총 단어 수</p>
              <p className={styles.statDetail}>
                평균: {selectedUser.analysis.textAnalysis.averageReflectionLength.toFixed(0)} 글자
              </p>
            </div>
          </div>
          
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>활동 타임라인</h3>
              <button 
                className={styles.exportButton}
                onClick={() => exportData('json', selectedUser.user.id)}
              >
                데이터 내보내기
              </button>
            </div>
            <div className={styles.timeline}>
              {selectedUser.timeline.map((item, index) => (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineIcon}>
                    {getTimelineIcon(item.type)}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <h4 className={styles.timelineTitle}>{item.title}</h4>
                      <span className={styles.timelineDate}>{formatDate(item.timestamp)}</span>
                    </div>
                    
                    <div className={styles.timelineData}>
                      {item.type === 'questionnaire' && (
                        <div className={styles.dataGrid}>
                          <div className={styles.dataItem}>
                            <div className={styles.dataLabel}>총 질문 수</div>
                            <div className={styles.dataValue}>{item.data.totalQuestions}</div>
                          </div>
                          <div className={styles.dataItem}>
                            <div className={styles.dataLabel}>완료 시간</div>
                            <div className={styles.dataValue}>
                              {item.data.completionTime ? formatDuration(item.data.completionTime) : '즉시'}
                            </div>
                          </div>
                          <div className={styles.dataItem}>
                            <div className={styles.dataLabel}>평균 답변 길이</div>
                            <div className={styles.dataValue}>
                              {(item.data.answers.reduce((acc: number, ans: any) => acc + ans.length, 0) / item.data.answers.length).toFixed(0)} 글자
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {item.type === 'highlight' && (
                        <div>
                          <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>하이라이트 텍스트</div>
                              <div className={styles.dataValue}>{item.data.highlightedText}</div>
                            </div>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>문단 위치</div>
                              <div className={styles.dataValue}>{item.data.paragraphIndex + 1}번째 문단</div>
                            </div>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>텍스트 길이</div>
                              <div className={styles.dataValue}>{item.data.textLength} 글자</div>
                            </div>
                          </div>
                          {item.data.userExplanation && (
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>사용자 설명</div>
                              <div className={`${styles.dataValue} ${styles.large}`}>{item.data.userExplanation}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {item.type === 'reflection' && (
                        <div>
                          <div className={styles.dataGrid}>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>단계</div>
                              <div className={styles.dataValue}>
                                <span className={`${styles.badge} ${
                                  item.data.inspectionStep === 3 ? styles.success : 
                                  item.data.inspectionStep === 2 ? styles.warning : 
                                  item.data.inspectionStep === 1 ? styles.info : styles.error
                                }`}>
                                  {getStepLabel(item.data.inspectionStep)}
                                </span>
                              </div>
                            </div>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>글자 수</div>
                              <div className={styles.dataValue}>{item.data.contentLength}</div>
                            </div>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>단어 수</div>
                              <div className={styles.dataValue}>{item.data.wordCount}</div>
                            </div>
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>문장 수</div>
                              <div className={styles.dataValue}>{item.data.sentenceCount}</div>
                            </div>
                          </div>
                          
                          <div className={styles.dataItem}>
                            <div className={styles.dataLabel}>고민 내용</div>
                            <div className={`${styles.dataValue} ${styles.large}`}>{item.data.reflectionContent}</div>
                          </div>
                          
                          {item.data.keywords.length > 0 && (
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>키워드</div>
                              <div className={styles.tagContainer}>
                                {item.data.keywords.map((keyword: string, i: number) => (
                                  <span key={i} className={`${styles.tag} ${styles.keyword}`}>
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {item.data.selectedTags.length > 0 && (
                            <div className={styles.dataItem}>
                              <div className={styles.dataLabel}>선택된 태그</div>
                              <div className={styles.tagContainer}>
                                {item.data.selectedTags.map((tag: any, i: number) => (
                                  <span key={i} className={`${styles.tag} ${tag.type === 'keyword' ? styles.keyword : styles.factor}`}>
                                    {tag.tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {(item.data.emotionCheck || item.data.blameCheck) && (
                            <div className={styles.inspectionResults}>
                              {item.data.emotionCheck && (
                                <div className={`${styles.inspectionCard} ${
                                  item.data.emotionCheck.hasEmotion ? styles.success : styles.warning
                                }`}>
                                  <h5 className={styles.inspectionTitle}>감정 검사</h5>
                                  <div className={styles.inspectionResult}>
                                    {item.data.emotionCheck.hasEmotion ? '✅ 통과' : '⚠️ 실패'}
                                  </div>
                                  {item.data.emotionCheck.suggestion && (
                                    <div className={styles.inspectionSuggestion}>
                                      {item.data.emotionCheck.suggestion}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {item.data.blameCheck && (
                                <div className={`${styles.inspectionCard} ${
                                  item.data.blameCheck.hasBlamePattern ? styles.error : styles.success
                                }`}>
                                  <h5 className={styles.inspectionTitle}>비난 패턴 검사</h5>
                                  <div className={styles.inspectionResult}>
                                    {item.data.blameCheck.hasBlamePattern ? '❌ 패턴 발견' : '✅ 통과'}
                                  </div>
                                  {item.data.blameCheck.warning && (
                                    <div className={styles.inspectionSuggestion}>
                                      {item.data.blameCheck.warning}
                                    </div>
                                  )}
                                  {item.data.blameCheck.environmentalFactors.length > 0 && (
                                    <div className={styles.tagContainer}>
                                      {item.data.blameCheck.environmentalFactors.map((factor: string, i: number) => (
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
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            {currentTab === 'dashboard' ? '대시보드' : 
             currentTab === 'users' ? '사용자 관리' : 
             selectedUser ? `${selectedUser.user.nickname} 상세 분석` : ''}
          </h1>
          <div className={styles.headerActions}>
            <button 
              className={styles.exportButton}
              onClick={() => exportData('csv')}
            >
              전체 데이터 내보내기
            </button>
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
          {currentTab === 'users' && renderUsers()}
          {currentTab === 'user-detail' && renderUserDetail()}
        </div>
      </div>
    </div>
  );
};

export default AdminV2;