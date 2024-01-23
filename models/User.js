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
    avatar: {
        type: Object,
        default: {
            src: '',
            color: '',
            letter: ''
        }
    },
    cards: {
        type: Array,
        default: []
    },
    messages: {
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
    joined: {
        type: Date,
        required: true,
        default: Date.now()
    }
})

module.exports = mongoose.model('User', userSchema)