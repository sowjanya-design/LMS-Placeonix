const https = require('https');

const data = JSON.stringify({
  email: 'sowjanya060504@gmail.com',
  password: 'Password123'
});

const options = {
  hostname: 'backend-pearl-seven-77.vercel.app',
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const start = Date.now();
const req = https.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  res.on('data', d => process.stdout.write(d));
  res.on('end', () => console.log(`\nTime taken: ${Date.now() - start}ms`));
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
