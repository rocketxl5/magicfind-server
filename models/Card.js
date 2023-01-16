const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  skryfallID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type_line: {
    type: String,
    required: true
  },
  set_name: {
    type: String,
    required: true
  },
  rarity: {
    type: String,
    required: true
  },
  image_uris: {
    type: Object,
    required: true
  },
  artist: {
    type: String,
    default: ''
  },
  frame: {
    type: String,
    default: ''
  },
  condition: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  negotiable: {
    type: Boolean,
    default: true
  },
  foil: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  price: {
    type: Number,
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  userName: {
    type: String,
    default: ''
  },
  userCountry: {
    type: String,
    default: ''
  },
  userID: {
    type: String,
    required: true,
    default: ''
  }
});

module.exports = mongoose.model('Card', cardSchema);
