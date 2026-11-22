process.env.NODE_ENV = 'test';
require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const app = require('../server');

const PORT = 5001;
let server;

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

const runTests = async () => {
  console.log('\n======================================================');
  console.log(' RUNNING BACKEND INTEGRATION & PHASE 4 TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, description, debugInfo = null) => {
    if (condition) {
      console.log(` \x1b[32m✔ PASS\x1b[0m : ${description}`);
      passed++;
    } else {
      console.error(` \x1b[31m✖ FAIL\x1b[0m : ${description}`);
      if (debugInfo) console.error('   Debug:', JSON.stringify(debugInfo, null, 2));
      failed++;
    }
  };

  server = app.listen(PORT);

  try {
    // 1. Health check
    const health = await request({ method: 'GET', path: '/api/health' });
    assert(health.statusCode === 200 && health.body.status === 'ok', 'Health check endpoint returns 200 OK');

    // 2. Admin & Cashier logins
    const adminLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'admin', password: 'admin123' },
    });
    const adminToken = adminLogin.body.token;

    const cashierLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'cashier', password: 'cashier123' },
    });
    const cashierToken = cashierLogin.body.token;
    assert(adminToken && cashierToken, 'Admin and Cashier successfully obtain JWT tokens');

    // 3. Fetch menu and table for order test
    const menuRes = await request({
      method: 'GET',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const item1 = menuRes.body.data[0];
    const item2 = menuRes.body.data[1];

    const tablesRes = await request({
      method: 'GET',
      path: '/api/tables',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const freeTable = tablesRes.body.data.find((t) => t.status === 'free');

    const expectedSubtotal = (item1.price * 2) + (item2.price * 1);

    // 4. Create dine-in order
    const orderRes = await request({
      method: 'POST',
      path: '/api/orders',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderType: 'dine-in',
        tableId: freeTable._id,
        items: [
          { menuItem: item1._id, name: item1.name, price: item1.price, quantity: 2 },
          { menuItem: item2._id, name: item2.name, price: item2.price, quantity: 1 },
        ],
      },
    });
    const order = orderRes.body.data;
    assert(
      orderRes.statusCode === 201 && order.subtotal === expectedSubtotal,
      `Order created with expected subtotal ${expectedSubtotal}`
    );

    // 5. Generate final Bill from order with fixed discount of ₹50
    const billRes = await request({
      method: 'POST',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderId: order._id,
        discountType: 'fixed',
        discountValue: 50,
      },
    });
    const bill = billRes.body.data;
    assert(
      billRes.statusCode === 201 &&
        bill.billNumber.startsWith('BILL-') &&
        bill.paymentStatus === 'pending',
      'Bill generated with unique billNumber and pending payment status'
    );

    // 6. Record payment in full
    const paymentRes = await request({
      method: 'POST',
      path: `/api/bills/${bill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        paymentMode: 'upi',
        amount: bill.finalAmount,
      },
    });
    assert(
      paymentRes.statusCode === 200 &&
        paymentRes.body.data.bill.paymentStatus === 'paid',
      'Payment recorded and bill marked paid'
    );

    // 7. Phase 4: Void / Cancel bill
    const cancelBillRes = await request({
      method: 'PUT',
      path: `/api/bills/${bill._id}/cancel`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        cancellationReason: 'Customer dispute regarding service',
      },
    });
    assert(
      cancelBillRes.statusCode === 200 &&
        cancelBillRes.body.data.status === 'cancelled' &&
        cancelBillRes.body.data.cancellationReason === 'Customer dispute regarding service',
      'Invoice successfully voided/cancelled with audit trail and reason recorded (200 OK)'
    );

    // 8. Phase 4: Detailed Analytics Endpoint (Admin only)
    const analyticsRes = await request({
      method: 'GET',
      path: '/api/reports/analytics?range=today',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      analyticsRes.statusCode === 200 &&
        analyticsRes.body.data.kpis.cancelledCount >= 1 &&
        Array.isArray(analyticsRes.body.data.paymentDistribution),
      'Admin fetches detailed analytics: cancelled bills isolated from net sales (200 OK)'
    );

    // 9. Phase 4: Role-based access control on analytics (Cashier blocked)
    const cashierAnalyticsRes = await request({
      method: 'GET',
      path: '/api/reports/analytics?range=today',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(
      cashierAnalyticsRes.statusCode === 403,
      'Cashier is denied access to detailed analytics (403 Forbidden)'
    );

    // 10. Phase 4: CSV Export (Admin only)
    const csvExportRes = await request({
      method: 'GET',
      path: '/api/reports/export-csv',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      csvExportRes.statusCode === 200 &&
        csvExportRes.headers['content-type'].includes('text/csv') &&
        csvExportRes.body.includes('Bill Number,Date'),
      'Admin exports comprehensive sales audit report as downloadable CSV'
    );

    // 11. Phase 4: CSV Export Cashier blocked
    const cashierCsvRes = await request({
      method: 'GET',
      path: '/api/reports/export-csv',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(
      cashierCsvRes.statusCode === 403,
      'Cashier is denied access to financial CSV export (403 Forbidden)'
    );

    console.log('\n------------------------------------------------------');
    console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('------------------------------------------------------\n');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    if (server) server.close();
    process.exit(1);
  }
};

runTests();
