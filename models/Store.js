const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    id: {
        type: String,
        default: function () {
            return ObjectId(this._id).toString()
        }
    },
    products: {
        type: Array,
        defalut: []
    }
});


module.exports = mongoose.model('Item', storeSchema);
