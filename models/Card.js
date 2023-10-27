const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  artist: {
    type: String,
    default: ''
  },
  color: {
    type: Array,
    default: [],
    required: true
  },
  finish: {
    type: String,
    default: ''
  },
  frame: {
    type: String,
    default: ''
  },
  image_uris: {
    type: Object,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  rarity: {
    type: String,
    required: true
  },
  released: {
    type: String,
    required: true
  },
  set_name: {
    type: String,
    required: true
  },
  type_line: {
    type: String,
    required: true
  },
  condition: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en'
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
  isPublished: {
    type: Boolean,
    required: true,
    default: false
  },
  datePublished: {
    type: Date,
    default: ''
  },
  userID: {
    type: String,
    required: true,
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
});

module.exports = mongoose.model('Card', cardSchema);
