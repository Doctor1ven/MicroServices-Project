const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.trim() === '') {
    throw new Error('MONGO_URI is required. Add your MongoDB Atlas connection string to the root .env file.');
  }

  await mongoose.connect(mongoUri);
  logger.info('MongoDB connected');
};

module.exports = connectDB;
