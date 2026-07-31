import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // We will use a mock URI if process.env.MONGODB_URI is undefined for initial setup
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/walletstack', {
      serverSelectionTimeoutMS: 5000 // fail fast if mongodb is not running
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
