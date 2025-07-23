import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Admin.module.css';

interface User {
  userId: string;
  nickname: string;
  password: string;
  createdAt: string;
}

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchUsers();
    // Admin 페이지 body 배경 설정
    document.body.classList.add('admin-body');
    return () => {
      document.body.classList.remove('admin-body');
    };
  }, []);

  // 자동 새로고침 기능
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchUsers();
    }, 10000); // 10초마다 새로고침

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUserDetail = (userId: string) => {
    router.push(`/admin/user-detail?userId=${userId}`);
  };

  const handleDeleteUser = async (userId: string, nickname: string) => {
    const confirmed = window.confirm(`정말로 사용자 "${nickname}"의 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    
    if (!confirmed) return;

    setDeletingUserId(userId);
    try {
      const response = await fetch('/api/admin/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // 사용자 목록에서 삭제된 사용자 제거
        setUsers(users.filter(user => user.userId !== userId));
        alert('사용자 데이터가 성공적으로 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`삭제 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('사용자 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className={`${styles.container} admin-page`}>
        <div className={styles.loading}>사용자 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} admin-page`}>
        <div className={styles.error}>오류: {error}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} admin-page`}>
      <div className={styles.header}>
        <h1 className={styles.title}>관리자 대시보드</h1>
        <div className={styles.headerControls}>
          <div className={styles.stats}>
            <span className={styles.statItem}>총 사용자: {users.length}명</span>
            <span className={styles.statItem}>
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          </div>
          <div className={styles.controls}>
            <button
              className={styles.refreshButton}
              onClick={() => fetchUsers()}
              disabled={loading}
            >
              {loading ? '새로고침 중...' : '🔄 새로고침'}
            </button>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              자동 새로고침 (10초)
            </label>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>닉네임</th>
                <th>비밀번호</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td className={styles.nickname}>{user.nickname}</td>
                  <td className={styles.password}>{user.password}</td>
                  <td className={styles.date}>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.detailButton}
                        onClick={() => handleUserDetail(user.userId)}
                      >
                        상세보기
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteUser(user.userId, user.nickname)}
                        disabled={deletingUserId === user.userId}
                      >
                        {deletingUserId === user.userId ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className={styles.empty}>
            <p>등록된 사용자가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}