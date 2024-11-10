const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');
const { isAuthenticated } = require('./middleware/authMiddleware');

console.log('Registering API key routes');

router.get('/api/keys', isAuthenticated, async (req, res) => {
  console.log('API key retrieval request received');
  console.log('User ID from session:', req.session.userId);
  try {
    const apiKeys = await ApiKey.findOne({ userId: req.session.userId });
    console.log('Fetched API keys:', apiKeys ? { id: apiKeys._id, userId: apiKeys.userId } : 'Not found');
    res.json(apiKeys || { openaiKey: '', anthropicKey: '' });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ message: 'Error fetching API keys' });
  }
});

router.post('/api/keys', isAuthenticated, async (req, res) => {
  console.log('API key update request received');
  console.log('Request body:', req.body);
  console.log('User ID from session:', req.session.userId);
  try {
    const { openaiKey, anthropicKey } = req.body;
    console.log('Request body:', { openaiKey: !!openaiKey, anthropicKey: !!anthropicKey });
    console.log('User ID from session:', req.session.userId);

    let apiKeys = await ApiKey.findOne({ userId: req.session.userId });
    console.log('Existing API keys found:', !!apiKeys);

    if (apiKeys) {
      apiKeys.openaiKey = openaiKey;
      apiKeys.anthropicKey = anthropicKey;
      console.log('Updating existing API keys');
    } else {
      apiKeys = new ApiKey({
        userId: req.session.userId,
        openaiKey,
        anthropicKey
      });
      console.log('Creating new API keys document');
    }

    const savedApiKeys = await apiKeys.save();
    console.log('API keys saved successfully:', { id: savedApiKeys._id, userId: savedApiKeys.userId });

    res.json({ message: 'API keys updated successfully' });
  } catch (error) {
    console.error('Error updating API keys:', error);
    res.status(500).json({ message: 'Error updating API keys' });
  }
});

module.exports = router;