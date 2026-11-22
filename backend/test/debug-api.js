process.env.NODE_ENV = 'test';
require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const app = require('../server');

const PORT = 5002;
let server = app.listen(PORT);

const request = ({ method, path, headers = {}, body = null }) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      ...(dataString && {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
      }),
    };

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch (e) {
            parsed = responseBody;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
};

const run = async () => {
  try {
    // 1. Admin login
    const adminLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'admin', password: 'admin123' },
    });
    console.log('Login Response:', adminLogin.body);
    const token = adminLogin.body.token;

    // 2. Dashboard metrics
    const dashRes = await request({
      method: 'GET',
      path: '/api/reports/dashboard',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Dashboard Data:', JSON.stringify(dashRes.body, null, 2));

    // 3. Tables
    const tablesRes = await request({
      method: 'GET',
      path: '/api/tables',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Tables Data sample:', tablesRes.body.data?.[0]);

    // 4. Orders
    const ordersRes = await request({
      method: 'GET',
      path: '/api/orders?status=open',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Orders Data count:', ordersRes.body.data?.length);

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    server.close();
    process.exit(1);
  }
};

run();
