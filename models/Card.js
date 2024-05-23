const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const cardSchema = new mongoose.Schema({
  artist: {
    type: String,
    default: ''
  },
  artist_ids: {
    type: Array
  },
  border_color: {
    type: String,
    default: ''
  },
  card_faces: {
    type: Array
  },
  cmc: {
    type: Number
  },
  collector_number: {
    type: String,
    default: ''
  },
  color_identity: {
    type: Array
  },
  colors: {
    type: Array,
    default: []
  },
  edhrec_rank: {
    type: Number
  },
  finishes: {
    type: Array,
    default: []
  },
  foil: {
    type: Boolean
  },
  frame: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  },
  image_uris: {
    type: Object,
    default: {}
  },
  keywords: {
    type: Array
  },
  lang: {
    type: String,
    default: ''
  },
  legalities: {
    type: Object,
    default: {}
  },
  mana_cost: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  oracle_id: {
    type: String
  },
  oracle_text: {
    type: String,
    default: ''
  },
  oversized: {
    type: Boolean,
    default: false
  },
  power: {
    type: String
  },
  prices: {
    type: Object,
    default: {}
  },
  prints_search_uri: {
    type: String
  },
  rarity: {
    type: String,
    default: ''
  },
  related_uris: {
    type: Object
  },
  released_at: {
    type: String,
    default: ''
  },
  set: {
    type: String
  },
  set_id: {
    type: String
  },
  set_name: {
    type: String,
    default: ''
  },
  toughness: {
    type: String
  },
  type_line: {
    type: String,
    default: ''
  },
  // card_id: {
  //   type: String,
  //   default: function () {
  //     return ObjectId(this._id).toString()
  //   }
  // },
  card_name: {
    type: String,
    default: function () {
      return this.name.replace(/[^\w\+]+/g, '-').toLowerCase();
    } 
  },
  owners: {
    type: Array,
    default: []
  },
  catalog: {
    type: Array,
    default: []
  },
});


module.exports = mongoose.model('Card', cardSchema);
