const http = require('http');
const https = require('https');

const data = JSON.stringify({
  email: 'admin@placeonix.in',
  password: 'Password123'
});

const options = {
  hostname: 'lms-placeonix-production.up.railway.app',
  port: 443,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => { console.log(`BODY: ${responseData}`); });
});

req.on('error', (e) => { console.error(`Problem with request: ${e.message}`); });
req.write(data);
req.end();
