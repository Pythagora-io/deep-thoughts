const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const { isAuthenticated } = require('./middleware/authMiddleware');

// Create a new chat room
router.post('/', isAuthenticated, async (req, res) => {
  console.log('Received request to create chat room:', req.body);
  console.log('Agents received:', req.body.agents);

  const chatRoom = new ChatRoom({
    name: req.body.name,
    topic: req.body.topic,
    timeBetweenMessages: req.body.timeBetweenMessages,
    agents: req.body.agents,
    status: 'active',
    sentenceCount: req.body.sentenceCount ? parseInt(req.body.sentenceCount) : null,
    maxAgentMessages: req.body.maxAgentMessages ? parseInt(req.body.maxAgentMessages) : null,
    creator: req.session.userId
  });

  console.log('ChatRoom object before saving:', chatRoom);

  try {
    const newChatRoom = await chatRoom.save();
    console.log('Created new chat room:', newChatRoom);
    console.log('Agents in new chat room:', newChatRoom.agents);
    res.status(201).json(newChatRoom);
  } catch (error) {
    console.error('Error creating chat room:', error);
    console.error(error.stack);
    if (error.code === 11000) {
      res.status(400).json({ message: 'A chat room with this ID already exists. Please try again.' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Update the chat room list route
router.get('/list', async (req, res) => {
  console.log('Entering /list route');
  try {
    console.log('Attempting to fetch chat rooms');
    const allChatRooms = await ChatRoom.find().populate('agents');
    console.log('Fetched chat rooms:', allChatRooms);
    let userChatRooms = [];
    console.log('Current user ID:', req.session.userId);

    if (req.session && req.session.userId) {
      console.log('User is logged in, filtering user chat rooms');
      userChatRooms = allChatRooms.filter(room => room.creator && room.creator.toString() === req.session.userId);
      console.log('User chat rooms:', userChatRooms);
    }

    console.log('Rendering chatRoomList view');
    res.render('chatRoomList', {
      allChatRooms,
      userChatRooms,
      session: req.session,
      isCreator: req.session && (req.session.userRole === 'creator' || req.session.userRole === 'admin')
    });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    console.error(error.stack);
    res.status(500).render('error', { message: 'Error fetching chat rooms' });
  }
});

// Add a new route for the chat room creation page
router.get('/create', isAuthenticated, (req, res) => {
  console.log('Rendering create chat room page');
  res.render('createChatRoom');
});

router.get('/:id', isAuthenticated, async (req, res) => {
  console.log(`Attempting to join chat room with ID: ${req.params.id}`);
  console.log(`User session:`, req.session);
  try {
    const chatRoom = await ChatRoom.findById(req.params.id).populate('agents').populate('creator');
    console.log(`Chat room found:`, chatRoom);
    if (!chatRoom) {
      console.log(`Chat room not found for ID: ${req.params.id}`);
      return res.status(404).render('error', { message: 'Chat room not found' });
    }
    const isCreator = req.session.userId && chatRoom.creator &&
                      (typeof chatRoom.creator === 'string' ?
                       chatRoom.creator === req.session.userId :
                       chatRoom.creator._id.toString() === req.session.userId);
    const canInteract = req.session.userRole === 'admin' || isCreator;
    console.log(`User ${req.session.userId} can interact: ${canInteract}, isCreator: ${isCreator}`);
    res.render('chatRoom', {
      chatRoom,
      messages: chatRoom.messages,
      isAuthenticated: !!req.session.userId,
      username: req.session.username,
      userRole: req.session.userRole,
      userId: req.session.userId,
      chatRoomCreator: chatRoom.creator ? chatRoom.creator._id : 'System',
      canInteract: canInteract
    });
    console.log('Chat room page rendered');
  } catch (error) {
    console.error('Error fetching chat room:', error);
    console.error(error.stack);
    res.status(500).render('error', { message: 'Error fetching chat room' });
  }
});

module.exports = router;