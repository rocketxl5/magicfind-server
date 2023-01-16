const mongoose = require('mongoose');

const catalogSchema = new mongoose.SchemaType({});

module.exports = mongoose.model('Catalog', catalogSchema);
