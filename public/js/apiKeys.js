console.log('apiKeys.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('apiKeys.js execution started');
  const userDataElement = document.getElementById('user-data');
  if (userDataElement) {
    const userData = JSON.parse(userDataElement.dataset.user);
    console.log('User data:', userData);
  }

  const apiKeyForm = document.getElementById('api-key-form');
  console.log('API key form found:', !!apiKeyForm);
  if (apiKeyForm) {
    console.log('Adding event listener to API key form');
    apiKeyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('API key form submitted');
      const openaiKey = document.getElementById('openaiKey').value;
      const anthropicKey = document.getElementById('anthropicKey').value;
      console.log('Submitting API keys:', { openaiKey: !!openaiKey, anthropicKey: !!anthropicKey });
      try {
        const response = await fetch('/api/keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ openaiKey, anthropicKey }),
        });
        console.log('API keys update response:', response.status);
        const responseData = await response.json();
        console.log('API keys update response data:', responseData);
        if (response.ok) {
          alert('API keys updated successfully');
        } else {
          alert('Failed to update API keys: ' + responseData.message);
        }
      } catch (error) {
        console.error('Error updating API keys:', error);
        alert('Error updating API keys');
      }
    });
  } else {
    console.log('API key form not found');
  }
});