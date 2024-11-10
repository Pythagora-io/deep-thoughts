document.addEventListener('DOMContentLoaded', () => {
  const chatRoomList = document.getElementById('chatRoomList');
  const chatRoomForm = document.getElementById('chatRoomForm');
  const chatRoomManagementError = document.getElementById('chatRoomManagementError');

  // Fetch all chat rooms
  const fetchChatRooms = async () => {
    try {
      const response = await fetch('/api/chatrooms');
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      const chatRooms = await response.json();
      renderChatRooms(chatRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      chatRoomManagementError.textContent = 'Error fetching chat rooms. Please try again.';
      chatRoomManagementError.style.display = 'block';
    }
  };

  // Render chat rooms in the admin panel
  const renderChatRooms = (chatRooms) => {
    chatRoomList.innerHTML = '';
    chatRooms.forEach(chatRoom => {
      const chatRoomElement = document.createElement('div');
      chatRoomElement.className = 'chat-room-item mb-3';
      chatRoomElement.innerHTML = `
        <h3>${chatRoom.name}</h3>
        <p>Topic: ${chatRoom.topic}</p>
        <p>Time Between Messages: ${chatRoom.timeBetweenMessages} seconds</p>
        <p>Sentence Count: ${chatRoom.sentenceCount !== null ? chatRoom.sentenceCount : 'Not set'}</p>
        <p>Agents: ${chatRoom.agents.map(agent => agent.name).join(', ')}</p>
        <p>Max Agent Messages: ${chatRoom.maxAgentMessages || 'Unlimited'}</p>
        <button class="btn btn-sm btn-primary edit-chat-room" data-id="${chatRoom._id}">Edit</button>
        <button class="btn btn-sm btn-danger delete-chat-room" data-id="${chatRoom._id}">Delete</button>
        <button class="btn btn-sm btn-info duplicate-chat-room" data-id="${chatRoom._id}">Duplicate</button>
      `;
      chatRoomList.appendChild(chatRoomElement);
      console.log('Rendering chat room:', chatRoom);
    });
  };

  // Create or update a chat room
  const saveChatRoom = async (event) => {
    event.preventDefault();
    const chatRoomId = document.getElementById('chatRoomId').value;
    const chatRoomData = {
      name: document.getElementById('chatRoomName').value,
      topic: document.getElementById('chatRoomTopic').value,
      timeBetweenMessages: document.getElementById('chatRoomTimeBetweenMessages').value,
      sentenceCount: document.getElementById('sentenceCount').value || null,
      agents: Array.from(document.getElementById('chatRoomAgents').selectedOptions).map(option => option.value),
      maxAgentMessages: document.getElementById('chatRoomMaxAgentMessages').value || null
    };

    // Log the chat room form data
    console.log('Chat room form data:', chatRoomData);

    try {
      const url = chatRoomId ? `/api/chatrooms/${chatRoomId}` : '/api/chatrooms';
      const method = chatRoomId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRoomData),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat room');
      }

      chatRoomForm.reset();
      document.getElementById('chatRoomId').value = '';
      await fetchChatRooms();
    } catch (error) {
      console.error('Error saving chat room:', error);
      chatRoomManagementError.textContent = 'Error saving chat room. Please try again.';
      chatRoomManagementError.style.display = 'block';
    }
  };

  // Delete a chat room
  const deleteChatRoom = async (chatRoomId) => {
    try {
      const response = await fetch(`/api/chatrooms/${chatRoomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat room');
      }

      await fetchChatRooms();
    } catch (error) {
      console.error('Error deleting chat room:', error);
      chatRoomManagementError.textContent = 'Error deleting chat room. Please try again.';
      chatRoomManagementError.style.display = 'block';
    }
  };

  // Duplicate a chat room
  const duplicateChatRoom = async (chatRoomId) => {
    try {
      const response = await fetch(`/api/chatrooms/${chatRoomId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate chat room');
      }

      await fetchChatRooms();
    } catch (error) {
      console.error('Error duplicating chat room:', error);
      chatRoomManagementError.textContent = 'Error duplicating chat room. Please try again.';
      chatRoomManagementError.style.display = 'block';
    }
  };

  // Event listeners
  chatRoomForm.addEventListener('submit', saveChatRoom);

  chatRoomList.addEventListener('click', (event) => {
    if (event.target.classList.contains('edit-chat-room')) {
      const chatRoomId = event.target.dataset.id;
      const chatRoomElement = event.target.closest('.chat-room-item');
      document.getElementById('chatRoomId').value = chatRoomId;
      document.getElementById('chatRoomName').value = chatRoomElement.querySelector('h3').textContent;
      document.getElementById('chatRoomTopic').value = chatRoomElement.querySelector('p').textContent;
      document.getElementById('chatRoomTimeBetweenMessages').value = chatRoomElement.querySelector('p:nth-child(3)').textContent.split(' ')[3];
      document.getElementById('sentenceCount').value = chatRoomElement.querySelector('p:nth-child(4)').textContent.split(': ')[1] !== 'Not set' ? chatRoomElement.querySelector('p:nth-child(4)').textContent.split(': ')[1] : '';
      document.getElementById('chatRoomMaxAgentMessages').value = chatRoomElement.querySelector('p:nth-child(5)').textContent.split(': ')[1] !== 'Unlimited' ? chatRoomElement.querySelector('p:nth-child(5)').textContent.split(': ')[1] : '';
    } else if (event.target.classList.contains('delete-chat-room')) {
      const chatRoomId = event.target.dataset.id;
      if (confirm('Are you sure you want to delete this chat room?')) {
        deleteChatRoom(chatRoomId);
      }
    } else if (event.target.classList.contains('duplicate-chat-room')) {
      const chatRoomId = event.target.dataset.id;
      if (confirm('Are you sure you want to duplicate this chat room?')) {
        duplicateChatRoom(chatRoomId);
      }
    }
  });

  // Initial fetch of chat rooms
  fetchChatRooms();

  // Add sentence count input field to the chat room form
  const sentenceCountField = document.createElement('div');
  sentenceCountField.className = 'mb-3';
  sentenceCountField.innerHTML = `
    <label for="sentenceCount" class="form-label">Sentence Count</label>
    <input type="number" class="form-control" id="sentenceCount" min="0">
  `;
  chatRoomForm.insertBefore(sentenceCountField, chatRoomForm.lastElementChild);
});