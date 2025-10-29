import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/case-management';

export let isMongoDBAvailable = false;

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    isMongoDBAvailable = true;
    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
  } catch (error) {
    isMongoDBAvailable = false;
    console.log('⚠️  MongoDB not available - using IN-MEMORY storage (data will be lost on restart)');
    console.log('💡 For persistent storage:');
    console.log('   - Local: Install and run MongoDB Compass at localhost:27017');
    console.log('   - Production: Set MONGODB_URI environment variable with your MongoDB connection string');
    console.log('');
  }
}

mongoose.connection.on('disconnected', () => {
  if (isMongoDBAvailable) {
    console.log('⚠️  MongoDB disconnected');
  }
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error);
});
