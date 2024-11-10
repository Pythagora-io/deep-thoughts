const mongoose = require('mongoose');

const llmAgentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  provider: {
    type: String,
    required: true,
    enum: ['OpenAI', 'Anthropic']
  },
  model: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        if (this.provider === 'OpenAI') {
          return ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'].includes(v);
        } else if (this.provider === 'Anthropic') {
          return ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'].includes(v);
        }
        return false;
      },
      message: props => `${props.value} is not a valid model for the selected provider!`
    }
  },
  personality: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LLMAgent', llmAgentSchema);