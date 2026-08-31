// Local-only convenience script — NOT used in production, NOT deployed.
// Runs a real mongod binary (downloaded once by mongodb-memory-server, then
// cached) against a persistent on-disk data directory instead of the
// library's default ephemeral temp folder — so data survives across restarts
// of this script, unlike a plain MongoMemoryServer.create() with no dbPath.
//
// Usage: npm run local-mongo (or: node src/scripts/local-mongo.js)
// Leave it running in its own terminal; stop with Ctrl+C.
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = 27417;
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'mongo-db');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: PORT, dbPath: DB_PATH, storageEngine: 'wiredTiger' },
  });
  console.log(`Local MongoDB running at ${mongod.getUri()}`);
  console.log(`Data persisted to: ${DB_PATH}`);
  console.log('Backend .env should have MONGO_URI=mongodb://127.0.0.1:' + PORT + '/placeonix-hub');
  console.log('Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('\nStopping...');
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
