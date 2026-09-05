const mongoose = require('mongoose');
mongoose.connect('mongodb://sowjanya_db_user:rSJR880Io98ZVFmx@ac-vxhabhn-shard-00-00.ubtidzc.mongodb.net:27017,ac-vxhabhn-shard-00-01.ubtidzc.mongodb.net:27017,ac-vxhabhn-shard-00-02.ubtidzc.mongodb.net:27017/placeonix-hub?ssl=true&replicaSet=atlas-zfmtg3-shard-0&authSource=admin&retryWrites=true&w=majority')
  .then(async () => {
    const authController = require('./src/controllers/authController');
    const req = {
      body: { email: 'sowjanya060504@gmail.com', password: 'Password123' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test' }
    };
    const res = {
      cookie: () => {},
      status: (code) => { console.log('Status:', code); return res; },
      json: (data) => { console.log('JSON:', data); process.exit(0); }
    };
    const next = (err) => { console.log('Next error:', err); process.exit(1); };
    
    // Simulate login
    await authController.login(req, res, next);
  })
  .catch(e => {
    console.log('Error:', e);
    process.exit(1);
  });
