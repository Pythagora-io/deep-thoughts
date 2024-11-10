(function() {
  function initAdminFunctions() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel) {
      console.log('Not on admin page, skipping admin functions');
      return;
    }

    const llmAgentList = document.getElementById('llmAgentList');
    const llmAgentForm = document.getElementById('llmAgentForm');
    const llmAgentManagementError = document.getElementById('llmAgentManagementError');

    const providerModelMap = {
      OpenAI: ['gpt-3.5-turbo', 'gpt-4'],
      Anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229']
    };

    document.getElementById('llmAgentProvider').addEventListener('change', function() {
      const modelSelect = document.getElementById('llmAgentModel');
      const selectedProvider = this.value;
      modelSelect.innerHTML = '';
      providerModelMap[selectedProvider].forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
    });

    // Trigger the change event on page load to populate the initial options
    document.getElementById('llmAgentProvider').dispatchEvent(new Event('change'));

    const fetchLLMAgents = async () => {
      try {
        const response = await fetch('/api/llmagents');
        if (!response.ok) {
          throw new Error('Failed to fetch LLM agents');
        }
        const llmAgents = await response.json();
        renderLLMAgents(llmAgents);
      } catch (error) {
        console.error('Error fetching LLM agents:', error);
        llmAgentManagementError.textContent = 'Error fetching LLM agents. Please try again.';
        llmAgentManagementError.style.display = 'block';
      }
    };

    const renderLLMAgents = (llmAgents) => {
      llmAgentList.innerHTML = '';
      llmAgents.forEach(llmAgent => {
        const llmAgentElement = document.createElement('div');
        llmAgentElement.className = 'llm-agent-item mb-3';
        llmAgentElement.innerHTML = `
          <h3>${llmAgent.name}</h3>
          <p>Provider: ${llmAgent.provider}</p>
          <p>Model: ${llmAgent.model}</p>
          <p>Personality: ${llmAgent.personality}</p>
          <button class="btn btn-sm btn-primary edit-llm-agent" data-id="${llmAgent._id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-llm-agent" data-id="${llmAgent._id}">Delete</button>
          <button class="btn btn-sm btn-info duplicate-llm-agent" data-id="${llmAgent._id}">Duplicate</button>
        `;
        llmAgentList.appendChild(llmAgentElement);
      });
    };

    let isSubmitting = false;

    const saveLLMAgent = async (event) => {
      console.log('saveLLMAgent function called');
      event.preventDefault();

      if (isSubmitting) {
        console.log('Form submission in progress, please wait.');
        return;
      }

      isSubmitting = true;

      const llmAgentId = document.getElementById('llmAgentId').value;
      const llmAgentData = {
        name: document.getElementById('llmAgentName').value,
        provider: document.getElementById('llmAgentProvider').value,
        model: document.getElementById('llmAgentModel').value,
        personality: document.getElementById('llmAgentPersonality').value
      };
      console.log('LLM Agent data:', llmAgentData);

      try {
        const url = llmAgentId ? `/api/llmagents/${llmAgentId}` : '/api/llmagents';
        const method = llmAgentId ? 'PUT' : 'POST';
        console.log('Sending request to:', url, 'Method:', method);
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(llmAgentData),
        });

        console.log('Response received:', response);

        if (!response.ok) {
          const errorMessage = await response.json();
          throw new Error(errorMessage.message || 'Failed to save LLM agent');
        }

        console.log('LLM Agent saved successfully');
        llmAgentForm.reset();
        document.getElementById('llmAgentId').value = '';
        await fetchLLMAgents();
      } catch (error) {
        console.error('Error saving LLM agent:', error);
        llmAgentManagementError.textContent = error.message || 'Error saving LLM agent. Please try again.';
        llmAgentManagementError.style.display = 'block';
      } finally {
        isSubmitting = false;
      }
    };

    const deleteLLMAgent = async (llmAgentId) => {
      console.log('deleteLLMAgent function called with ID:', llmAgentId);

      if (!confirm('Are you sure you want to delete this LLM agent?')) {
        console.log('Deletion cancelled by user');
        return;
      }
      console.log('User confirmed deletion');

      try {
        const response = await fetch(`/api/llmagents/${llmAgentId}`, {
          method: 'DELETE',
        });
        console.log('Delete response status:', response.status);

        if (!response.ok) {
          throw new Error('Failed to delete LLM agent');
        }

        console.log('LLM agent deleted successfully');
        await fetchLLMAgents();
      } catch (error) {
        console.error('Error deleting LLM agent:', error);
        llmAgentManagementError.textContent = 'Error deleting LLM agent. Please try again.';
        llmAgentManagementError.style.display = 'block';
      }
    };

    const duplicateLLMAgent = async (agentId) => {
      try {
        const response = await fetch(`/api/llmagents/${agentId}/duplicate`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to duplicate LLM agent');
        }

        await fetchLLMAgents();
      } catch (error) {
        console.error('Error duplicating LLM agent:', error);
        llmAgentManagementError.textContent = 'Error duplicating LLM agent. Please try again.';
        llmAgentManagementError.style.display = 'block';
      }
    };

    let listenerAttached = false;

    const attachListeners = () => {
      if (!listenerAttached) {
        llmAgentList.addEventListener('click', (event) => {
          console.log('Click event on llmAgentList, target:', event.target);
          if (event.target.classList.contains('edit-llm-agent')) {
            console.log('Edit button clicked for agent ID:', event.target.dataset.id);
            const agentId = event.target.dataset.id;
            console.log('Attempting to fetch agent details for ID:', agentId);
            const agentElement = event.target.closest('.llm-agent-item');
            document.getElementById('llmAgentId').value = agentId;
            document.getElementById('llmAgentName').value = agentElement.querySelector('h3').textContent;
            document.getElementById('llmAgentProvider').value = agentElement.querySelector('p:nth-child(2)').textContent.split(': ')[1];
            document.getElementById('llmAgentModel').value = agentElement.querySelector('p:nth-child(3)').textContent.split(': ')[1];
            document.getElementById('llmAgentPersonality').value = agentElement.querySelector('p:nth-child(4)').textContent.split(': ')[1];
          } else if (event.target.classList.contains('delete-llm-agent')) {
            console.log('Delete button clicked for agent ID:', event.target.dataset.id);
            deleteLLMAgent(event.target.dataset.id);
          } else if (event.target.classList.contains('duplicate-llm-agent')) {
            const agentId = event.target.dataset.id;
            if (confirm('Are you sure you want to duplicate this LLM agent?')) {
              duplicateLLMAgent(agentId);
            }
          }
        });
        listenerAttached = true;
      }
    };

    const attachFormListener = () => {
      if (llmAgentForm && !llmAgentForm.hasAttribute('data-listener-attached')) {
        llmAgentForm.addEventListener('submit', saveLLMAgent);
        llmAgentForm.setAttribute('data-listener-attached', 'true');
        console.log('Form listener attached');
      }
    };

    attachFormListener();
    fetchLLMAgents();
    attachListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminFunctions);
  } else {
    initAdminFunctions();
  }
})();