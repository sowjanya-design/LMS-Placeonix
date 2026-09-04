const AppError = require('./src/utils/AppError');
const { errorHandler } = require('./src/middleware/errorHandler');

process.env.NODE_ENV = 'production';

const err = new AppError('Invalid credentials', 401);
const req = { method: 'POST', originalUrl: '/test' };
const res = {
  status: (code) => { console.log('Status:', code); return res; },
  json: (data) => { console.log('JSON:', data); }
};

errorHandler(err, req, res, () => {});
