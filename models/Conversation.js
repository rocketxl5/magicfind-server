const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  messages: {
    type: Array,
    default: []
  }

  // senderID: {
  //   type: String,
  //   required: true
  // },
  // recipientID: {
  //   type: String,
  //   required: true
  // },
  // subject: {
  //   type: String,
  //   required: true
  // },
  // text: {
  //   type: String,
  //   required: true
  // },
  // sentDate: {
  //   type: Date,
  //   required: true,
  //   default: Date.now
  // }
});

module.exports = mongoose.model('Conversation', ConversationSchema);
