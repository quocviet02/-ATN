const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task_manager');
  console.log('MongoDB connected');
}

module.exports = connectDB;
