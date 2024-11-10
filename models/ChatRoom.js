const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, unique: true },
  topic: { type: String, required: true },
  timeBetweenMessages: { type: Number, required: true, default: 60 },
  agents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LLMAgent' }],
  messages: [{
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    sender: { type: String, default: 'Anonymous' }
  }],
  status: { type: String, enum: ['active', 'stopped'], default: 'active' },
  isGeneratingResponse: { type: Boolean, default: false },
  sentenceCount: { type: Number, default: null },
  nextMessageTime: { type: Date, default: Date.now },
  maxAgentMessages: { type: Number, default: null },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

chatRoomSchema.pre('validate', function(next) {
  if (!this.chatId) {
    this.chatId = this._id.toString();
  }
  next();
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);