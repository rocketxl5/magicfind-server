const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        maxLenght: 25,
        required: true
    },
    email: {
        type: String,
        trim: true,
        maxLenght: 255,
        required: true
    },
    country: {
        type: String,
        trim: true,
        maxLength: 50,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    cards: {
        type: Array,
        default: []
    },
    // Card collection
    decks: {
        type: Array,
        default: [
            {
                name: '',
                format: '',
                cards: []
            }
        ]
    },
    store: {
        type: Array,
        default: []
    },
    mail: {
        type: Object,
        default: {
            sent: [],
            received: []
        }
    },
    purchases: {
        type: Array,
        default: []
    },
    sales: {
        type: Array,
        default: []
    }, 
    cart: {
        type: Array,
        default: []
    },
    wishlist: {
        type: Array,
        default: []
    },
    rating: {
        type: Number,
        default: 3
    },
    avatar: {
        type: Object,
        default: {
            src: '',
            color: '',
            letter: ''
        }
    },
    joined: {
        type: Date,
        required: true,
        default: Date.now()
    }
})

module.exports = mongoose.model('User', userSchema)