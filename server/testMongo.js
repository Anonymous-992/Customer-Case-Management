import mongoose from 'mongoose';

const uri = "mongodb+srv://support_db:tP6bAOfxe5krajQa@cluster0.isodkiq.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("✅ Connected successfully to MongoDB Atlas");
    mongoose.disconnect();
  })
  .catch(err => console.error("❌ Connection failed:", err));
