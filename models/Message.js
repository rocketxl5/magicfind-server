const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false
  },
  isTrash: {
    type: Boolean,
    required: true,
    default: false
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false
  },
  isSent: {
    type: Boolean,
    required: true,
    default: false
  },
  isReply: {
    type: Boolean,
    required: true,
    default: false
  },
  repliesTo: {
    type: String,
    default: ''
  },
  sentDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
