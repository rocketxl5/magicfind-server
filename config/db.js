const mongoose = require('mongoose');
// const MongoClient = require('mongodb').MongoClient;

require('dotenv').config('../.env');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    // const db = mongoose.connection;
    // db.once('open', () => {
    //   console.log('Successfully connected to database');
    // });
    console.log('Successfully connected to database');
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
