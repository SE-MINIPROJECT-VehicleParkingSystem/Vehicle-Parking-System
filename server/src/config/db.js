const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  console.log('MongoDB URI loaded:', Boolean(uri));
  console.log('MongoDB URI scheme:', uri?.split(':')[0]);

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Configure server/.env.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = connectDB;