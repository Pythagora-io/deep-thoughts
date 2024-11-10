const LLMAgent = require('../models/LLMAgent');
const ChatRoom = require('../models/ChatRoom');
const { generateOpenAIResponse, generateAnthropicResponse } = require('./llmApiService');

async function getRandomAgent(roomId, excludeAgent = null) {
  try {
    const chatRoom = await ChatRoom.findById(roomId).populate('agents');
    if (!chatRoom || chatRoom.agents.length === 0) {
      console.warn(`No agents found for roomId: ${roomId}`);
      return null;
    }
    const availableAgents = chatRoom.agents.filter(agent => agent._id.toString() !== excludeAgent);
    if (availableAgents.length === 0) {
      console.warn(`No available agents for roomId: ${roomId} excluding ${excludeAgent}`);
      return null;
    }
    const randomIndex = Math.floor(Math.random() * availableAgents.length);
    return availableAgents[randomIndex];
  } catch (error) {
    console.error('Error fetching agents for room:', error);
    console.error(error.stack);
    throw error;
  }
}

async function handleOpenAIResponse(chatRoom, agentName, response) {
  let content;

  if (response.choices && response.choices.length > 0) {
    content = response.choices[0].message?.content;
  } else if (response.content) {
    content = response.content;
  } else {
    console.warn(`Unexpected response structure from OpenAI for agent ${agentName}:`, response);
    content = "I'm having trouble formulating a response right now.";
  }

  if (!content || content.trim() === '') {
    console.warn(`Empty response received from OpenAI for agent ${agentName}`);
    return; // Skip saving empty messages
  }

  const newMessage = {
    sender: agentName,
    content: content,
    timestamp: new Date()
  };

  chatRoom.messages.push(newMessage);
  await chatRoom.save();

  return content; // Return the content for further processing if needed
}

async function handleAnthropicResponse(chatRoom, agentName, response) {
  const content = response.content;

  if (!content || content.trim() === '') {
    console.warn(`Empty response received from Anthropic for agent ${agentName}`);
    return; // Skip saving empty messages
  }

  const newMessage = {
    sender: agentName,
    content: content,
    timestamp: new Date()
  };

  chatRoom.messages.push(newMessage);
  await chatRoom.save();
}

async function generateAgentResponse(roomId, excludeAgent = null, userId) {
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    console.log(`Generating response for room ${roomId}, status: ${chatRoom.status}`);

    if (chatRoom.status === 'stopped') {
      console.log(`Conversation stopped for roomId: ${roomId}`);
      return null;
    }

    const agent = await getRandomAgent(roomId, excludeAgent);
    console.log(`Selected agent for response: ${agent ? agent.name : 'None'}`);

    if (!agent) {
      console.warn(`No agent available for roomId: ${roomId}`);
      return null;
    }

    const lastMessages = chatRoom.messages.slice(-30);
    console.log('Messages being sent to Anthropic:', JSON.stringify(lastMessages, null, 2));

    const systemMessage = `You are ${agent.name}, an AI with the following personality: ${agent.personality}.
    Respond to the conversation in character, considering the chat room topic: ${chatRoom.topic}`;

    let response;
    if (agent.provider === 'OpenAI') {
      response = await generateOpenAIResponse(agent.model, systemMessage, lastMessages, chatRoom.sentenceCount, userId);
      await handleOpenAIResponse(chatRoom, agent.name, response);
    } else if (agent.provider === 'Anthropic') {
      response = await generateAnthropicResponse(agent.model, systemMessage, lastMessages, chatRoom.sentenceCount, userId);
      await handleAnthropicResponse(chatRoom, agent.name, response);
    } else {
      throw new Error(`Unsupported provider: ${agent.provider}`);
    }

    console.log(`Generated response from agent ${agent.name}: ${response}`);
    return { content: response, sender: agent.name, agent: agent._id.toString(), timestamp: new Date() };
  } catch (error) {
    console.error('Error generating agent response:', error);
    console.error(error.stack);
    return { content: "I'm having trouble generating a response right now.", sender: "System", timestamp: new Date() };
  }
}

async function triggerMultipleAgentResponses(io, roomId, initialMessage, userId) {
  console.log(`Starting triggerMultipleAgentResponses for room ${roomId}`);
  const chatRoom = await ChatRoom.findById(roomId);
  console.log(`Chat room ${roomId} status: ${chatRoom.status}, isGeneratingResponse: ${chatRoom.isGeneratingResponse}`);
  if (chatRoom.isGeneratingResponse) {
    console.log(`Response generation already in progress for room ${roomId}`);
    return;
  }

  try {
    chatRoom.isGeneratingResponse = true;
    await chatRoom.save();
    console.log(`Set isGeneratingResponse to true for room ${roomId}`);

    const lastMessage = chatRoom.messages[chatRoom.messages.length - 1];
    if (lastMessage.content !== initialMessage.content || lastMessage.sender !== initialMessage.sender) {
      chatRoom.messages.push(initialMessage);
      await chatRoom.save();
      io.to(roomId).emit('chat message', initialMessage);
      console.log(`Emitted 'chat message' for ${initialMessage.sender} in room ${roomId}`);
    }

    let lastResponse = initialMessage;
    let lastAgent = null;
    let agentMessageCount = 0;

    const generateNextResponse = async () => {
      try {
        console.log(`Generating next response for room ${roomId}`);

        // Check if we've reached the maximum number of agent messages
        if (chatRoom.maxAgentMessages && agentMessageCount >= chatRoom.maxAgentMessages) {
          console.log(`Reached maximum number of agent messages (${chatRoom.maxAgentMessages}) for room ${roomId}`);
          const systemMessage = {
            content: "The conversation has reached the maximum number of agent messages.",
            sender: "System",
            timestamp: new Date()
          };
          chatRoom.messages.push(systemMessage);
          await chatRoom.save();
          io.to(roomId).emit('chat message', systemMessage);
          chatRoom.isGeneratingResponse = false;
          await chatRoom.save();
          return;
        }

        const agentResponse = await generateAgentResponse(roomId, lastAgent, userId);
        console.log(`Agent response generated for room ${roomId}:`, agentResponse);

        if (!agentResponse) {
          console.log(`No agent response generated for room ${roomId}`);
          return;
        }

        const updatedChatRoom = await ChatRoom.findById(roomId);
        console.log(`Chat room ${roomId} status: ${updatedChatRoom.status}`);
        if (updatedChatRoom.status === 'stopped') {
          console.log(`Chat room ${roomId} is stopped. Stopping agent responses.`);
          updatedChatRoom.isGeneratingResponse = false;
          await updatedChatRoom.save();
          return;
        }

        const nextMessageTime = new Date(Date.now() + updatedChatRoom.timeBetweenMessages * 1000);
        updatedChatRoom.nextMessageTime = nextMessageTime;
        await updatedChatRoom.save();

        io.to(roomId).emit('next message time', nextMessageTime.getTime());
        console.log(`Emitted 'next message time' for room ${roomId} at ${nextMessageTime}`);

        updatedChatRoom.messages.push(agentResponse);
        await updatedChatRoom.save();
        console.log(`Saved agent response to chat room ${roomId}`);

        io.to(roomId).emit('agent typing', agentResponse.sender);
        console.log(`Emitted 'agent typing' for ${agentResponse.sender} in room ${roomId}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        io.to(roomId).emit('chat message', agentResponse);
        console.log(`Emitted 'chat message' for ${agentResponse.sender} in room ${roomId}`);

        lastResponse = agentResponse;
        lastAgent = agentResponse.agent;
        agentMessageCount++;

        console.log(`Scheduling next response for room ${roomId} after ${updatedChatRoom.timeBetweenMessages} seconds`);
        setTimeout(() => generateNextResponse(), updatedChatRoom.timeBetweenMessages * 1000);
      } catch (error) {
        console.error(`Error generating response for room ${roomId}:`, error);
        console.error(error.stack);
      } finally {
        chatRoom.isGeneratingResponse = false;
        await chatRoom.save();
        console.log(`Reset isGeneratingResponse to false for room ${roomId}`);
      }
    };

    generateNextResponse();
  } catch (error) {
    console.error(`Error in triggerMultipleAgentResponses for room ${roomId}:`, error);
    console.error(error.stack);
    chatRoom.isGeneratingResponse = false;
    await chatRoom.save();
  }
}

module.exports = {
  generateAgentResponse,
  triggerMultipleAgentResponses
};