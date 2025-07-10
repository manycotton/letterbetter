import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Admin.module.css';

interface User {
  id: string;
  nickname: string;
  createdAt: string;
  sessionCount: number;
  reflectionCount: number;
  completedReflectionCount: number;
  lastActivity: string;
}

interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  totalReflections: number;
  completedReflections: number;
  completionRate: string;
  emotionCheckStats: {
    passed: number;
    failed: number;
  };
  blameCheckStats: {
    passed: number;
    failed: number;
  };
  users: User[];
}

interface UserDetail {
  user: {
    id: string;
    nickname: string;
    createdAt: string;
  };
  stats: {
    totalSessions: number;
    totalReflections: number;
    completedReflections: number;
    completionRate: string;
    emotionChecks: {
      passed: number;
      failed: number;
    };
    blameChecks: {
      passed: number;
      failed: number;
    };
    totalAnswers: number;
  };
  sessions: any[];
  answers: any[];
}

const Admin: React.FC = () => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const fetchUserDetail = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
        setCurrentTab('user-detail');
      }
    } catch (error) {
      console.error('Error fetching user detail:', error);
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

  const renderDashboard = () => (
    <div>
      {loading ? (
        <div className={styles.loading}>통계를 불러오는 중...</div>
      ) : stats ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.totalUsers}</h3>
              <p className={styles.statLabel}>총 사용자</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.totalSessions}</h3>
              <p className={styles.statLabel}>총 세션</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.totalReflections}</h3>
              <p className={styles.statLabel}>총 고민 정리</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.completedReflections}</h3>
              <p className={styles.statLabel}>완료된 고민</p>
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
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statValue}>{stats.blameCheckStats.passed}</h3>
              <p className={styles.statLabel}>비난 검사 통과</p>
              <p className={styles.statDetail}>
                실패: {stats.blameCheckStats.failed}건
              </p>
            </div>
          </div>

          <div className={styles.userList}>
            <div className={styles.userListHeader}>
              <div>최근 사용자</div>
              <div>세션</div>
              <div>고민</div>
              <div>완료</div>
              <div>최근 활동</div>
            </div>
            {stats.users.map(user => (
              <div 
                key={user.id} 
                className={styles.userRow}
                onClick={() => fetchUserDetail(user.id)}
              >
                <div className={styles.userNickname}>{user.nickname}</div>
                <div className={styles.userStats}>{user.sessionCount}</div>
                <div className={styles.userStats}>{user.reflectionCount}</div>
                <div className={styles.userStats}>{user.completedReflectionCount}</div>
                <div className={styles.userDate}>{formatDate(user.lastActivity)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.loading}>데이터를 불러올 수 없습니다.</div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div>
      <div className={styles.searchContainer}>
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
        <div className={styles.loading}>사용자 목록을 불러오는 중...</div>
      ) : (
        <>
          <div className={styles.userList}>
            <div className={styles.userListHeader}>
              <div>닉네임</div>
              <div>세션</div>
              <div>고민</div>
              <div>완료</div>
              <div>최근 활동</div>
            </div>
            {users.map(user => (
              <div 
                key={user.id} 
                className={styles.userRow}
                onClick={() => fetchUserDetail(user.id)}
              >
                <div className={styles.userNickname}>{user.nickname}</div>
                <div className={styles.userStats}>{user.sessionCount}</div>
                <div className={styles.userStats}>{user.reflectionCount}</div>
                <div className={styles.userStats}>{user.completedReflectionCount}</div>
                <div className={styles.userDate}>{formatDate(user.lastActivity)}</div>
              </div>
            ))}
          </div>
          
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
  );

  const renderUserDetail = () => (
    <div>
      {selectedUser && (
        <>
          <div className={styles.userDetail}>
            <div className={styles.userDetailHeader}>
              <h2 className={styles.userDetailName}>{selectedUser.user.nickname}</h2>
              <div className={styles.userDetailDate}>
                가입일: {formatDate(selectedUser.user.createdAt)}
              </div>
            </div>
            
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedUser.stats.totalSessions}</h3>
                <p className={styles.statLabel}>총 세션</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedUser.stats.totalReflections}</h3>
                <p className={styles.statLabel}>총 고민 정리</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedUser.stats.completedReflections}</h3>
                <p className={styles.statLabel}>완료된 고민</p>
                <p className={styles.statDetail}>완료율: {selectedUser.stats.completionRate}%</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statValue}>{selectedUser.stats.totalAnswers}</h3>
                <p className={styles.statLabel}>질문 답변</p>
              </div>
            </div>
          </div>
          
          <div className={styles.sessionList}>
            <h3 style={{ color: '#ffd100', marginBottom: '20px' }}>세션 상세</h3>
            {selectedUser.sessions.map(session => (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionHeader}>
                  <div className={styles.sessionId}>세션 ID: {session.id}</div>
                  <div className={styles.sessionDate}>
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
                
                <div className={styles.sessionStats}>
                  <div className={styles.sessionStat}>
                    <div className={styles.sessionStatValue}>{session.highlightCount}</div>
                    <div className={styles.sessionStatLabel}>하이라이트</div>
                  </div>
                  <div className={styles.sessionStat}>
                    <div className={styles.sessionStatValue}>{session.reflectionCount}</div>
                    <div className={styles.sessionStatLabel}>고민 정리</div>
                  </div>
                  <div className={styles.sessionStat}>
                    <div className={styles.sessionStatValue}>{session.completedReflectionCount}</div>
                    <div className={styles.sessionStatLabel}>완료</div>
                  </div>
                  <div className={styles.sessionStat}>
                    <div className={styles.sessionStatValue}>{session.currentStep || 1}</div>
                    <div className={styles.sessionStatLabel}>현재 단계</div>
                  </div>
                </div>
                
                {session.reflectionItems && session.reflectionItems.length > 0 && (
                  <div className={styles.reflectionItems}>
                    {session.reflectionItems.map((item: any, index: number) => (
                      <div key={item.id} className={styles.reflectionItem}>
                        <div className={styles.reflectionContent}>
                          {item.content || '내용 없음'}
                        </div>
                        <div className={styles.reflectionMeta}>
                          <div className={`${styles.reflectionStep} ${styles[`step${item.inspectionStep || 0}`]}`}>
                            {getStepLabel(item.inspectionStep || 0)}
                          </div>
                          <div className={styles.inspectionResults}>
                            {item.emotionCheckResult && (
                              <div className={`${styles.inspectionResult} ${styles[item.emotionCheckResult.hasEmotion ? 'emotion-pass' : 'emotion-fail']}`}>
                                감정: {item.emotionCheckResult.hasEmotion ? '통과' : '실패'}
                              </div>
                            )}
                            {item.blameCheckResult && (
                              <div className={`${styles.inspectionResult} ${styles[item.blameCheckResult.hasBlamePattern ? 'blame-fail' : 'blame-pass']}`}>
                                비난: {item.blameCheckResult.hasBlamePattern ? '발견' : '통과'}
                              </div>
                            )}
                          </div>
                        </div>
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
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <button 
          onClick={() => router.push('/')}
          className={styles.backButton}
        >
          메인으로 돌아가기
        </button>
      </div>
      
      <div className={styles.nav}>
        <button 
          className={`${styles.navButton} ${currentTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          대시보드
        </button>
        <button 
          className={`${styles.navButton} ${currentTab === 'users' ? styles.active : ''}`}
          onClick={() => setCurrentTab('users')}
        >
          사용자 관리
        </button>
        {currentTab === 'user-detail' && (
          <button 
            className={`${styles.navButton} ${styles.active}`}
            onClick={() => setCurrentTab('users')}
          >
            ← 사용자 상세
          </button>
        )}
      </div>
      
      <div className={styles.content}>
        {currentTab === 'dashboard' && renderDashboard()}
        {currentTab === 'users' && renderUsers()}
        {currentTab === 'user-detail' && renderUserDetail()}
      </div>
    </div>
  );
};

export default Admin;