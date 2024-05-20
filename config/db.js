const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.connect(process.env.ATLAS_URI);
    console.log('Successfully connected to database');
  } catch (error) {
    console.error(error);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;