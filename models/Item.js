const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

// User collection item
const itemSchema = new mongoose.Schema({
    id: {
        type: String,
        default: function () {
            return ObjectId(this._id).toString()
        }
    },
    // array of with of numbers 0 - 5
    // 0 === mint 
    // 5 === damaged
    store: {
        type: Array,
        default: []
    },
    // array of ids of decks where card is in
    deck: {
        type: Array,
        default: []
    }
});


module.exports = mongoose.model('Item', itemSchema);
