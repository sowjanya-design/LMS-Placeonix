const https = require('https');

const data = JSON.stringify({
  email: 'sowjanya060504@gmail.com',
  password: 'Password123'
});

// Use the frontend URL but NO cookie!
const options = {
  hostname: 'lms-placeonix-me1m28vps-sowjanya-designs-projects.vercel.app',
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  res.on('data', d => process.stdout.write(d));
});
req.write(data);
req.end();
