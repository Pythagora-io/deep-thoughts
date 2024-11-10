const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { checkRole } = require('./middleware/roleMiddleware');
const LLMAgent = require('../models/LLMAgent'); // Add this at the top of the file

// Route to render the admin panel
router.get('/admin', isAuthenticated, checkRole(['admin']), async (req, res) => {
  try {
    const llmAgents = await LLMAgent.find();
    console.log('Fetched LLM agents:', llmAgents);
    console.log('Rendering admin panel');
    res.render('adminPanel', { llmAgents });
  } catch (error) {
    console.error('Error fetching LLM agents:', error);
    res.status(500).render('error', { message: 'Error loading admin panel' });
  }
});

module.exports = router;