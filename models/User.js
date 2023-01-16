const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  email: {
    type: String,
    trim: true,
    required: true
  },
  country: {
    type: String,
    trim: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  cards: {
    type: Array,
    required: true,
    default: []
  },
  messages: {
    type: Object,
    default: {
      sent: [],
      received: []
    }
  },
  rating: {
    type: Number,
    required: true,
    default: 0
  },
  subscribedDate: {
    type: Date,
    required: true,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
