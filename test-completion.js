const testCompletion = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/writing-step/save-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: '1753318358243:rwvftnjg9',
        reflectionId: '1753318356171',
        action: 'inspection_refreshed'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testCompletion();