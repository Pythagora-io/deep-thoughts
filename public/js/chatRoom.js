const socket = io();
let hasJoinedRoom = false;
let isConversationStopped = false;
let countdownInterval;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Chat room client-side script initialized');
  const messagesDiv = document.getElementById('messages');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const stopButton = document.getElementById('stop-button');
  const resumeButton = document.getElementById('resume-button');
  const roomId = window.location.pathname.split('/').pop();
  const username = document.getElementById('username').value;
  const userId = document.getElementById('userId').value;
  const chatRoomStatus = document.getElementById('chatRoomStatus').value;
  const isAuthenticated = document.getElementById('isAuthenticated').value === 'true';
  const userRole = document.getElementById('userRole').value;
  const chatRoomCreator = document.getElementById('chatRoomCreator').value;
  const canInteract = userRole === 'admin' || userId === chatRoomCreator;

  console.log('User data:', {
    isAuthenticated,
    username,
    userId,
    userRole,
    chatRoomCreator,
    canInteract
  });

  if (!canInteract) {
    if (messageForm) messageForm.style.display = 'none';
    if (stopButton) stopButton.style.display = 'none';
    if (resumeButton) resumeButton.style.display = 'none';
    if (messageInput) messageInput.disabled = true;
  }

  socket.on('connect', () => {
    console.log('Connected to the chat server');
    if (!hasJoinedRoom) {
      socket.emit('join room', { roomId, username, userId });
      console.log('Emitted join room event:', { roomId, username, userId });
      hasJoinedRoom = true;
    }
  });

  // Initialize conversation state
  isConversationStopped = chatRoomStatus === 'stopped';

  if (canInteract) {
    if (resumeButton) {
      console.log('Adding event listener to resume button');
      resumeButton.addEventListener('click', function() {
        console.log('Resume button clicked');
        if (isConversationStopped) {
          console.log('Attempting to resume conversation');
          socket.emit('resume conversation', { roomId });
          isConversationStopped = false;
        } else {
          console.log('Conversation is already active');
        }
      });
    }

    if (stopButton) {
      console.log('Adding event listener to stop button');
      stopButton.addEventListener('click', () => {
        console.log('Stop button clicked');
        socket.emit('stop conversation', { roomId });
        console.log(`Emitted stop conversation event for room ${roomId}`);
      });
    }
  }

  // Load existing messages
  const existingMessages = document.querySelectorAll('#messages div');
  if (existingMessages.length === 0) {
    console.log('No existing messages');
  } else {
    console.log(`Loaded ${existingMessages.length} existing messages`);
  }

  // Error handling for message sending
  if (canInteract) {
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (messageInput.value) {
        try {
          socket.emit('chat message', { roomId, message: messageInput.value, userId });
          console.log(`Sent message to room ${roomId}: ${messageInput.value}`);
          messageInput.value = '';
        } catch (error) {
          console.error('Error sending message:', error);
          console.error(error.stack);
        }
      }
    });
  }

  function addMessage(msg) {
    console.log(`Adding message to chat:`, msg);
    const messageElement = document.createElement('div');
    messageElement.className = "message";
    const timestamp = new Date(msg.timestamp).toLocaleString();
    messageElement.innerHTML = `<strong>${msg.sender}</strong> <span class="timestamp">${timestamp}</span><p>${msg.content}</p>`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function addLoadingIndicator(agentName) {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading-indicator';
    loadingElement.innerHTML = `<em>${agentName} is typing...</em>`;
    messagesDiv.appendChild(loadingElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function removeLoadingIndicator() {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  function disableChat() {
    messageInput.disabled = true;
    messageInput.style.backgroundColor = '#f0f0f0';
    document.querySelector('#message-form button').disabled = true;
  }

  function enableChat() {
    messageInput.disabled = false;
    messageInput.style.backgroundColor = '';
    document.querySelector('#message-form button').disabled = false;
  }

  socket.on('conversation stopped', () => {
    console.log('Received conversation stopped event');
    removeLoadingIndicator();
    const stoppedElement = document.createElement('div');
    stoppedElement.innerHTML = '<strong>System:</strong> <em>The conversation has been stopped by an admin.</em>';
    messagesDiv.appendChild(stoppedElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    if (stopButton) {
      console.log('Hiding stop button');
      stopButton.style.display = 'none';
    }
    disableChat();
    if (resumeButton) {
      console.log('Showing resume button');
      resumeButton.style.display = 'inline-block';
    }
    isConversationStopped = true;
  });

  socket.on('conversation resumed', () => {
    console.log('Received conversation resumed event');
    const resumedElement = document.createElement('div');
    resumedElement.innerHTML = '<strong>System:</strong> <em>The conversation has been resumed by an admin.</em>';
    messagesDiv.appendChild(resumedElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    if (stopButton) {
      stopButton.style.display = 'inline-block';
    }
    enableChat();
    if (resumeButton) {
      resumeButton.style.display = 'none';
    }
    isConversationStopped = false;
  });

  if (chatRoomStatus === 'stopped') {
    disableChat();
    if (stopButton) {
      stopButton.style.display = 'none';
    }
    if (resumeButton) {
      resumeButton.style.display = 'inline-block';
    }
  }

  socket.on('chat message', (msg) => {
    console.log(`Received chat message in client:`, msg);
    removeLoadingIndicator();
    addMessage(msg);

    if (msg.sender === 'System' && msg.content === "The conversation has reached the maximum number of agent messages.") {
      disableChat();
      if (stopButton) {
        stopButton.style.display = 'none';
      }
      if (resumeButton) {
        resumeButton.style.display = 'none';
      }
    }
  });

  socket.on('agent typing', (agentName) => {
    console.log(`Agent typing: ${agentName}`);
    removeLoadingIndicator();
    addLoadingIndicator(agentName);
  });

  socket.on('next message time', (nextMessageTime) => {
    updateCountdown(nextMessageTime);
  });

  function updateCountdown(nextMessageTime) {
    clearInterval(countdownInterval);

    function updateTimer() {
      const now = new Date().getTime();
      const distance = nextMessageTime - now;

      if (distance < 0) {
        clearInterval(countdownInterval);
        document.getElementById('timer').textContent = 'Any moment now...';
      } else {
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById('timer').textContent = `${seconds} seconds`;
      }
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }

  socket.emit('get next message time', { roomId });
});