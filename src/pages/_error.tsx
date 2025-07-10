import React from 'react';
import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, err }: ErrorProps) {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      fontFamily: 'DungGeunMo, monospace',
      color: '#ffffff',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1>
        {statusCode
          ? `서버에서 ${statusCode} 오류가 발생했습니다`
          : '클라이언트에서 오류가 발생했습니다'}
      </h1>
      <p>페이지를 새로고침하거나 다시 시도해주세요.</p>
      {err && (
        <details style={{ marginTop: '20px' }}>
          <summary>에러 상세 정보</summary>
          <pre style={{ textAlign: 'left', padding: '10px', backgroundColor: '#2a2a2a' }}>
            {err.message}
          </pre>
        </details>
      )}
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;