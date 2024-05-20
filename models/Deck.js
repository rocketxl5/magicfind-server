const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
    id: {
        type: String,
        default: function () {
            return ObjectId(this._id).toString()
        }
    },
    format: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        default: ''
    },
    cards: {
        type: Array,
        default: []
    }
});


module.exports = mongoose.model('Item', deckSchema);
