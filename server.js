require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require('./routes/adminRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const chatRoomRoutes = require('./routes/chatRoomRoutes');
const llmAgentRoutes = require('./routes/llmAgentRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const { isAuthenticated, isAdmin } = require('./routes/middleware/authMiddleware');
const { checkRole } = require('./routes/middleware/roleMiddleware');
const http = require('http');
const socketIo = require('socket.io');
const ChatRoom = require('./models/ChatRoom');
const { triggerMultipleAgentResponses } = require('./services/llmAgentService');
const ApiKey = require('./models/ApiKey');
const User = require('./models/User');

console.log('Starting server...');

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('Connected to database');
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
  });

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  }),
);

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

app.use((req, res, next) => {
  const sess = req.session;
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  next();
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join room', ({ roomId, username, userId }) => {
    socket.join(roomId);
    console.log(`User ${username} joined room ${roomId}`);
    socket.username = username;
    socket.userId = userId; // Store userId in the socket
  });

  socket.on('get next message time', async ({ roomId }) => {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      if (chatRoom && chatRoom.nextMessageTime) {
        socket.emit('next message time', chatRoom.nextMessageTime.getTime());
      }
    } catch (error) {
      console.error('Error fetching next message time:', error);
      console.error(error.stack);
    }
  });

  socket.on('chat message', async ({ roomId, message }) => {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      const user = await User.findById(socket.userId);
      console.log(`Received chat message. Room ID: ${roomId}, User ID: ${socket.userId}, User Role: ${user.role}, Chat Room Creator: ${chatRoom.creator}`);
      if (chatRoom && (user.role === 'admin' || chatRoom.creator.toString() === socket.userId)) {
        console.log(`User ${socket.userId} is authorized to send messages in room ${roomId}`);
        console.log(`Received message for room ${roomId}: ${message}`);
        console.log(`Current socket username: ${socket.username}`);
        console.log(`Chat room ${roomId} status: ${chatRoom.status}`);
        console.log(`Number of agents in room: ${chatRoom.agents.length}`);

        if (chatRoom.status === 'stopped') {
          console.log(`Chat room ${roomId} is stopped. Ignoring message.`);
          return;
        }

        const newMessage = { content: message, sender: socket.username || 'Anonymous', timestamp: new Date() };
        chatRoom.messages.push(newMessage);
        await chatRoom.save();
        io.to(roomId).emit('chat message', newMessage);
        console.log(`Emitted message to room ${roomId}:`, newMessage);

        // Only trigger agent responses if not already generating
        if (!chatRoom.isGeneratingResponse) {
          console.log(`Triggering agent responses for room ${roomId}`);
          triggerMultipleAgentResponses(io, roomId, newMessage, socket.userId);
        } else {
          console.log(`Agent responses already being generated for room ${roomId}`);
        }
      } else {
        console.log(`User ${socket.userId} is not authorized to send messages in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error handling chat message:', error);
      console.error(error.stack);
    }
  });

  socket.on('stop conversation', async ({ roomId }) => {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      const user = await User.findById(socket.userId);
      if (chatRoom && (user.role === 'admin' || chatRoom.creator.toString() === socket.userId)) {
        chatRoom.status = 'stopped';
        chatRoom.isGeneratingResponse = false; // Resetting the flag
        await chatRoom.save();
        io.to(roomId).emit('conversation stopped');
        console.log(`Emitted conversation stopped event for room ${roomId}`);
      } else {
        console.log(`User ${socket.userId} is not authorized to stop conversation in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error stopping conversation:', error);
      console.error(error.stack);
    }
  });

  socket.on('resume conversation', async ({ roomId }) => {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      const user = await User.findById(socket.userId);
      if (chatRoom && (user.role === 'admin' || chatRoom.creator.toString() === socket.userId) && chatRoom.status === 'stopped' && !chatRoom.isGeneratingResponse) {
        chatRoom.status = 'active';
        await chatRoom.save();
        io.to(roomId).emit('conversation resumed');
        console.log(`Chat room ${roomId} status updated to active`);
        console.log(`Emitted conversation resumed event to room ${roomId}`);
        console.log(`Triggering agent responses after resuming conversation for room ${roomId}`);
        triggerMultipleAgentResponses(io, roomId, { content: 'Conversation resumed', sender: 'System' }, socket.userId);
      } else {
        console.log(`User ${socket.userId} is not authorized to resume conversation in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error resuming conversation:', error);
      console.error(error.stack);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.use(authRoutes);
app.use(adminRoutes);
app.use('/api', userManagementRoutes);
app.use('/api/chatrooms', chatRoomRoutes);
app.use('/api/llmagents', llmAgentRoutes);
app.use('/chatroom', chatRoomRoutes);
app.use(apiKeyRoutes);

app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.send('Admin panel');
});

app.get('/contributor', isAuthenticated, checkRole(['contributor', 'admin']), (req, res) => {
  res.send('Contributor area');
});

app.get('/viewer', isAuthenticated, checkRole(['viewer', 'contributor', 'admin']), (req, res) => {
  res.send('Viewer area');
});

app.get("/chatroom/:id", isAuthenticated, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id).populate('agents');
    if (!chatRoom) {
      return res.status(404).render('error', { message: 'Chat room not found' });
    }
    let apiKeys = { openaiKey: '', anthropicKey: '' };
    if (req.session.userId) {
      apiKeys = await ApiKey.findOne({ userId: req.session.userId }) || apiKeys;
    }
    res.render('chatRoom', {
      chatRoom,
      messages: chatRoom.messages,
      session: req.session,
      username: req.session.username || 'Anonymous',
      apiKeys, // Keep the apiKeys
      userId: req.session.userId // Add this line
    });
  } catch (error) {
    console.error('Error fetching chat room:', error);
    console.error(error.stack);
    res.status(500).render('error', { message: 'Error fetching chat room' });
  }
});

app.get("/", async (req, res) => {
  let apiKeys = { openaiKey: '', anthropicKey: '' };
  let userData = null;
  if (req.session.userId) {
    apiKeys = await ApiKey.findOne({ userId: req.session.userId }) || apiKeys;
    const user = await User.findById(req.session.userId);
    if (user) {
      userData = { id: user._id, username: user.username, role: user.role };
    }
  }
  console.log('Rendering index with user data:', userData);
  res.render("index", { user: userData, apiKeys });
});

app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});