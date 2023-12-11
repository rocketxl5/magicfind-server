const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  artist: {
    type: String,
    default: ''
  },
  artist_ids: {
    type: Array
  },
  booster: {
    type: Boolean,
    default: false
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
  flavor_text: {
    type: String
  },
  foil: {
    type: Boolean
  },
  frame: {
    type: String,
    default: ''
  },
  full_art: {
    type: Boolean
  },
  highres_image: {
    type: Boolean
  },
  id: {
    type: String,
    required: true
  },
  illustration_id: {
    type: String
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
  layout: {
    type: String
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
  nonfoil: {
    type: Boolean
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
  promo: {
    type: Boolean,
    default: false
  },
  purchase_uris: {
    type: Object
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
  reprint: {
    type: Boolean
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
  set_search_uri: {
    type: String
  },
  set_uri: {
    type: String
  },
  set_type: {
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
  _owners: {
    type: Array,
    default: []
  },
  _price: {
    type: Number
  },
  _quantity: {
    type: Number,
  },
  _condition: {
    type: String,
    default: ''
  },
  _comment: {
    type: String,
    default: ''
  },
  _is_published: {
    type: Boolean,
    default: false
  },
  _date_published: {
    type: Date,
    default: undefined
  }
});


module.exports = mongoose.model('Card', cardSchema);
