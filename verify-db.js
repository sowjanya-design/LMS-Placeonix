const mongoose = require('./backend/node_modules/mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://sowjanya_db_user:rSJR880Io98ZVFmx@placeonix.ubtidzc.mongodb.net');
  const db = mongoose.connection.useDb('test'); // It's probably 'test' or whatever the default is
  
  // Try to find placeonix-hub if it exists
  const dbs = await db.db.admin().command({ listDatabases: 1 });
  console.log("Databases:", dbs.databases.map(d => d.name));
  
  const targetDb = mongoose.connection.useDb('test');
  const users = await targetDb.collection('users').find({ email: 'admin@placeonix.in' }).toArray();
  console.log("Users in test:", users);
  
  process.exit(0);
}

check().catch(console.error);
