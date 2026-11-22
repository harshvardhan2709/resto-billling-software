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
  console.log(' RUNNING BACKEND INTEGRATION & PHASE 3 TESTS');
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
      `Order created with expected subtotal ${expectedSubtotal}`,
      { orderSubtotal: order?.subtotal, expectedSubtotal }
    );

    // 5. Preview bill with 10% discount
    const previewRes = await request({
      method: 'POST',
      path: '/api/bills/preview',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderId: order._id,
        discountType: 'percentage',
        discountValue: 10,
      },
    });
    const preview = previewRes.body.data;
    const expectedDiscount = parseFloat(((expectedSubtotal * 10) / 100).toFixed(2));
    const expectedTaxable = parseFloat((expectedSubtotal - expectedDiscount).toFixed(2));
    const expectedCgst = parseFloat(((expectedTaxable * 2.5) / 100).toFixed(2));
    const expectedSgst = parseFloat(((expectedTaxable * 2.5) / 100).toFixed(2));
    const expectedFinal = Math.round(expectedTaxable + expectedCgst + expectedSgst);

    assert(
      previewRes.statusCode === 200 &&
        preview.discountAmount === expectedDiscount &&
        preview.taxableAmount === expectedTaxable &&
        preview.cgst === expectedCgst &&
        preview.sgst === expectedSgst &&
        preview.finalAmount === expectedFinal,
      'Bill preview correctly computes GST 5% (CGST 2.5% + SGST 2.5%) and nearest integer round-off',
      { preview, expected: { expectedDiscount, expectedTaxable, expectedCgst, expectedSgst, expectedFinal } }
    );

    // 6. Generate final Bill from order with fixed discount of ₹50
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
      'Bill generated with unique billNumber and pending payment status',
      { bill }
    );

    // 7. Verify Table is freed
    const checkTable = await request({
      method: 'GET',
      path: '/api/tables',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const updatedTable = checkTable.body.data.find((t) => t._id === freeTable._id);
    assert(
      updatedTable.status === 'free',
      'Generating bill automatically frees the dining table'
    );

    // 8. Record partial payment (Part 1: Cash ₹200)
    const partialPaymentRes = await request({
      method: 'POST',
      path: `/api/bills/${bill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        paymentMode: 'cash',
        amount: 200,
      },
    });
    assert(
      partialPaymentRes.statusCode === 200 &&
        partialPaymentRes.body.data.bill.paymentStatus === 'partial' &&
        partialPaymentRes.body.data.balanceDue === bill.finalAmount - 200,
      'Recording partial payment marks bill as "partial" with remaining balance calculated',
      { partialPayment: partialPaymentRes.body }
    );

    // 9. Record remaining payment (Part 2: UPI balance)
    const remainingAmount = bill.finalAmount - 200;
    const finalPaymentRes = await request({
      method: 'POST',
      path: `/api/bills/${bill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        paymentMode: 'upi',
        amount: remainingAmount,
      },
    });
    assert(
      finalPaymentRes.statusCode === 200 &&
        finalPaymentRes.body.data.bill.paymentStatus === 'paid' &&
        finalPaymentRes.body.data.balanceDue === 0,
      'Settling remaining balance transitions bill paymentStatus to "paid" (0 balance due)'
    );

    // 10. Fetch bill details with payment ledger
    const billDetailsRes = await request({
      method: 'GET',
      path: `/api/bills/${bill._id}`,
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(
      billDetailsRes.statusCode === 200 &&
        billDetailsRes.body.data.payments.length === 2 &&
        billDetailsRes.body.data.totalPaid === bill.finalAmount,
      'Bill ledger retrieves payment history (Cash + UPI) and cashier audit trail'
    );

    // 11. Historical integrity test: Alter menu item price, verify historical bill unaffected
    await request({
      method: 'PUT',
      path: `/api/menu/${item1._id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { price: 9999 },
    });

    const historicalBillCheck = await request({
      method: 'GET',
      path: `/api/bills/${bill._id}`,
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(
      historicalBillCheck.body.data.subtotal === bill.subtotal &&
        historicalBillCheck.body.data.finalAmount === bill.finalAmount,
      'Historical bill remains completely unchanged after modifying menu price (snapshot integrity)'
    );

    // Revert menu price back
    await request({
      method: 'PUT',
      path: `/api/menu/${item1._id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { price: item1.price },
    });

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
