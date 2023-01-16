const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  cartItems: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model('Cart', CartSchema);
