const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    for (const name of ['events', 'announcements', 'users']) {
      const doc = await db.collection(name).findOne({});
      if (doc) {
        console.log(`Collection [${name}]:`);
        console.log('  sample id:', doc._id);
        console.log('  typeof sample id:', typeof doc._id);
        console.log('  is ObjectId:', doc._id instanceof mongoose.Types.ObjectId);
      } else {
        console.log(`Collection [${name}] is empty.`);
      }
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

run();
