const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://sowjanya_db_user:rSJR880Io98ZVFmx@placeonix.ubtidzc.mongodb.net');
  const db = mongoose.connection.useDb('test'); // It's probably 'test' by default or placeonix-hub
  const collections = await db.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  
  const users = await db.collection('users').find({}).toArray();
  console.log("Users:", users.length);
  console.log("Emails:", users.map(u => u.email));
  process.exit(0);
}

check().catch(console.error);
