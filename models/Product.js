const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

// User collection item
const productSchema = new mongoose.Schema({
    ref: {
        type: String,
    },
    name: {
        type: String,
    },
    price: {
        type: Number,
    },
    quantity: {
        type: Number,
    },
    condition: {
        type: String,
    },
    language: {
        type: String,
    },
    comment: {
        type: Text,
    },
    created: {
        type: Date,
        default: Date.now(),
    },
    updated: {
        type: Array,
        default: [{
            date: null,
            price: 0,
            quantity: 0,
            condition: '',
            language: '',
            isPublished: false
        }]
    },
    catalogId: {
        type: String,
    },
    isPublished: {
        type: Boolean,
        default: false
    }
});


module.exports = mongoose.model('Product', productSchema);
