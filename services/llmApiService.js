const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const ApiKey = require('../models/ApiKey');

async function getUserApiKeys(userId) {
  const apiKeys = await ApiKey.findOne({ userId });
  return apiKeys || { openaiKey: '', anthropicKey: '' };
}

async function generateOpenAIResponse(model, systemMessage, messages, sentenceCount, userId) {
  const { openaiKey } = await getUserApiKeys(userId);
  if (!openaiKey) {
    throw new Error('OpenAI API key not set for this user');
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const sentenceInstruction = sentenceCount ? `Respond in exactly ${sentenceCount} sentences.` : '';
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: `${systemMessage} ${sentenceInstruction}` },
        ...messages.map(msg => ({ role: msg.sender === 'assistant' ? 'assistant' : 'user', content: msg.content }))
      ]
    });
    console.log('OpenAI response generated successfully:', response);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    console.error(error.stack);
    throw error;
  }
}

async function generateAnthropicResponse(model, systemMessage, messages, sentenceCount, userId) {
  const { anthropicKey } = await getUserApiKeys(userId);
  if (!anthropicKey) {
    throw new Error('Anthropic API key not set for this user');
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  try {
    const sentenceInstruction = sentenceCount ? `Respond in exactly ${sentenceCount} sentences.` : '';

    // Summarize the latest 10 messages
    const latestMessages = messages.slice(-10);
    const summary = latestMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');

    // Combine system message and summary
    const contextMessage = `Your Background: ${systemMessage}\n\nConversation context:\n${summary}\n\n${sentenceInstruction}`;

    // Prepare the messages for Anthropic
    const anthropicMessages = [
      { role: 'user', content: contextMessage },
      // Add any subsequent messages as 'assistant' roles if needed
    ];

    console.log('Final request payload for Anthropic:', JSON.stringify({
      model: model,
      messages: anthropicMessages,
      max_tokens: 1000
    }, null, 2));

    const response = await anthropic.messages.create({
      model: model,
      messages: anthropicMessages,
      max_tokens: 1000
    });

    console.log('Anthropic response generated successfully:', response);

    if (response.content && response.content.length > 0) {
      return response.content[0].text.trim();
    } else {
      console.error('Unexpected empty or invalid content from Anthropic API:', response);
      throw new Error('Received empty or invalid content from Anthropic API');
    }
  } catch (error) {
    console.error('Error generating Anthropic response:', error);
    console.error(error.stack);
    throw error;
  }
}

module.exports = {
  generateOpenAIResponse,
  generateAnthropicResponse
};