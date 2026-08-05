// Throwaway helper for the audit session — spins up an in-memory MongoDB
// and prints the connection URI so the real server can run against it
// without needing a real Atlas/local Mongo install. Not part of the app.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27117 } });
  console.log('MONGO_URI=' + mongod.getUri());
  process.stdin.resume(); // keep process alive
})();
