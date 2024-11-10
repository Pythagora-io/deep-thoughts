document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('create-chatroom-form');
  const agentList = document.getElementById('agent-list');
  const isAuthenticatedElement = document.getElementById('isAuthenticated');
  const isAuthenticated = isAuthenticatedElement ? isAuthenticatedElement.value === 'true' : false;
  const sentenceCountField = document.getElementById('sentenceCount');
  const maxAgentMessagesField = document.getElementById('maxAgentMessages');
  const submitButton = form.querySelector('button[type="submit"]');

  // Disable fields and buttons for non-logged in users
  if (!isAuthenticated) {
    if (sentenceCountField) sentenceCountField.disabled = true;
    if (maxAgentMessagesField) maxAgentMessagesField.disabled = true;
    if (submitButton) submitButton.disabled = true;
  }

  // Fetch all LLM agents
  fetch('/api/llmagents')
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(agents => {
      console.log('Received agents:', agents);
      agents.forEach(agent => {
        const agentDiv = document.createElement('div');
        agentDiv.className = 'form-check mb-2';
        agentDiv.innerHTML = `
          <input class="form-check-input" type="checkbox" value="${agent._id}" id="agent-${agent._id}">
          <label class="form-check-label" for="agent-${agent._id}">
            ${agent.name} (${agent.provider} - ${agent.model})
          </label>
          <button type="button" class="btn btn-sm btn-info ms-2" data-bs-toggle="modal" data-bs-target="#agentModal-${agent._id}">
            Preview
          </button>
          <div class="modal fade" id="agentModal-${agent._id}" tabindex="-1" aria-labelledby="agentModalLabel-${agent._id}" aria-hidden="true">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="agentModalLabel-${agent._id}">${agent.name}</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p><strong>Provider:</strong> ${agent.provider}</p>
                  <p><strong>Model:</strong> ${agent.model}</p>
                  <p><strong>Personality:</strong> ${agent.personality}</p>
                </div>
              </div>
            </div>
          </div>
        `;
        agentList.appendChild(agentDiv);
      });
    })
    .catch(error => {
      console.error('Error fetching agents:', error);
    });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedAgents = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const chatRoomData = {
      name: document.getElementById('name').value,
      topic: document.getElementById('topic').value,
      timeBetweenMessages: document.getElementById('timeBetweenMessages').value,
      sentenceCount: document.getElementById('sentenceCount').value,
      maxAgentMessages: document.getElementById('maxAgentMessages').value,
      agents: selectedAgents
    };

    fetch('/api/chatrooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatRoomData),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      window.location.href = '/chatroom/list';
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  });
});