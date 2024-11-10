const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openaiKey: { type: String, default: '' },
  anthropicKey: { type: String, default: '' }
});

module.exports = mongoose.model('ApiKey', apiKeySchema);