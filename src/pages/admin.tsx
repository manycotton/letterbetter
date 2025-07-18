import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Admin.module.css';

interface User {
  id: string;
  nickname: string;
  password: string;
  createdAt: string;
}

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUserDetail = (userId: string) => {
    router.push(`/admin/user/${userId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <div className={styles.stats}>
          <span className={styles.statItem}>Total Users: {users.length}</span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nickname</th>
                <th>Password</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.nickname}>{user.nickname}</td>
                  <td className={styles.password}>{user.password}</td>
                  <td className={styles.date}>{formatDate(user.createdAt)}</td>
                  <td>
                    <button
                      className={styles.detailButton}
                      onClick={() => handleUserDetail(user.id)}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className={styles.empty}>
            <p>No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}