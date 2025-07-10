import React, { useState } from 'react';
import styles from '../styles/NicknameModal.module.css';

interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nickname: string, password: string) => void;
  isLoading?: boolean;
  error?: string;
}

const NicknameModal: React.FC<NicknameModalProps> = ({ isOpen, onClose, onSubmit, isLoading = false, error = '' }) => {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && password.trim()) {
      onSubmit(nickname.trim(), password.trim());
      setNickname('');
      setPassword('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 숫자만 입력되고 5자리 이내로 제한
    if (/^\d{0,5}$/.test(value)) {
      setPassword(value);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.title}>닉네임과 비밀번호를 작성해 주세요.</h2>
        <p className={styles.subtitle}>기존 사용자: 로그인 | 신규 사용자: 자동 회원가입</p>
        
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              className={styles.input}
              autoFocus
              disabled={isLoading}
            />
          </div>
          <div className={styles.inputContainer}>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="5자리 이내 숫자 비밀번호"
              className={styles.input}
              maxLength={5}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={!nickname.trim() || !password.trim() || isLoading}
          >
            {isLoading ? '처리중...' : '제출하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NicknameModal;