const express = require('express');
const router = express.Router();
const LLMAgent = require('../models/LLMAgent');
const { isAuthenticated } = require('./middleware/authMiddleware');
const { checkRole } = require('./middleware/roleMiddleware');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

// Get all LLM agents
router.get('/', isAuthenticated, checkRole(['creator', 'admin']), async (req, res) => {
  try {
    const llmAgents = await LLMAgent.find();
    console.log('Fetched all LLM agents:', llmAgents);
    res.json(llmAgents);
  } catch (error) {
    console.error('Error fetching LLM agents:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new LLM agent
router.post('/', isAuthenticated, checkRole(['admin']), async (req, res) => {
  console.log('Received request to create LLM agent:', req.body);

  const lockKey = req.body.name;

  try {
    await lock.acquire(lockKey, async () => {
      // Check if an agent with this name already exists
      const existingAgent = await LLMAgent.findOne({ name: req.body.name });
      if (existingAgent) {
        console.log('LLM agent with this name already exists');
        return res.status(409).json({ message: 'An LLM agent with this name already exists. Please choose a different name.' });
      }

      const llmAgent = new LLMAgent({
        name: req.body.name,
        provider: req.body.provider,
        model: req.body.model,
        personality: req.body.personality
      });

      console.log('Created LLMAgent instance:', llmAgent);

      console.log('Attempting to save LLM agent');
      const newLLMAgent = await llmAgent.save();
      console.log('LLM agent saved successfully:', newLLMAgent);
      res.status(201).json(newLLMAgent);
    }, { timeout: 5000 }); // 5 second timeout
  } catch (error) {
    console.error('Error creating LLM agent:', error);
    if (error.name === 'AsyncLockTimeout') {
      res.status(503).json({ message: 'Server is busy. Please try again later.' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Update an LLM agent
router.put('/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
  try {
    const updatedLLMAgent = await LLMAgent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('Updated LLM agent:', updatedLLMAgent);
    res.json(updatedLLMAgent);
  } catch (error) {
    console.error('Error updating LLM agent:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete an LLM agent
router.delete('/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
  console.log('Delete route called with ID:', req.params.id);
  try {
    const result = await LLMAgent.findByIdAndDelete(req.params.id);
    console.log('Delete operation result:', result);
    if (!result) {
      console.log('LLM agent not found for deletion');
      return res.status(404).json({ message: 'LLM agent not found' });
    }
    console.log('LLM agent deleted successfully');
    res.json({ message: 'LLM agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting LLM agent:', error);
    res.status(500).json({ message: 'Error deleting LLM agent' });
  }
});

// Duplicate an LLM agent
router.post('/:id/duplicate', isAuthenticated, checkRole(['admin']), async (req, res) => {
  try {
    const originalAgent = await LLMAgent.findById(req.params.id);
    if (!originalAgent) {
      return res.status(404).json({ message: 'LLM agent not found' });
    }

    const duplicatedAgent = new LLMAgent({
      name: `${originalAgent.name} (Copy)`,
      provider: originalAgent.provider,
      model: originalAgent.model,
      personality: originalAgent.personality
    });

    const newAgent = await duplicatedAgent.save();
    console.log(`Duplicated LLM agent ${originalAgent._id} to ${newAgent._id}`);
    res.status(201).json(newAgent);
  } catch (error) {
    console.error('Error duplicating LLM agent:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;