const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  messages: {
    type: Array,
    required: true,
    default: []
  }
});

module.exports = mongoose.model('Thread', threadSchema);
