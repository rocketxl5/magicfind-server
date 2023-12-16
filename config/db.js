const mongoose = require('mongoose');
// const MongoClient = require('mongodb').MongoClient;
require('dotenv').config('../.env');

let dbConnection

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('Successfully connected to database');
  } catch (error) {
    console.error(error);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;

// Mongodb Alternatve
// module.exports = {
//   connectToDb: (callback) => {
//     MongoClient.connect(process.env.ATLAS_URI)
//       .then((client) => {
//         dbConnection = client.db();
//         return callback();
//       })
//       .catch(error => {
//         console.log(error)
//         return callback(error);
//       })
//   }
//     getDb: () => dbConnection;
// }