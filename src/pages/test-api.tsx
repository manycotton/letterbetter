import { useState } from 'react';

export default function TestAPI() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: 'test' + Date.now(),
          password: '12345'
        }),
      });

      const text = await response.text();
      console.log('Response text:', text);
      
      try {
        const data = JSON.parse(text);
        setResult(JSON.stringify(data, null, 2));
      } catch (e) {
        setResult('Response is not JSON: ' + text);
      }
    } catch (error) {
      setResult('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Test</h1>
      <button onClick={testConnection} disabled={loading}>
        {loading ? 'Testing...' : 'Test Register API'}
      </button>
      <pre style={{ 
        marginTop: '20px', 
        padding: '10px', 
        background: '#f5f5f5',
        whiteSpace: 'pre-wrap'
      }}>
        {result}
      </pre>
    </div>
  );
}