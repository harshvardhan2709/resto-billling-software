process.env.NODE_ENV = 'test';
require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const app = require('../server');
const mongoose = require('mongoose');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

const PORT = 5002;
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

const runBatch4Tests = async () => {
  console.log('\n======================================================');
  console.log(' BATCH 4: COMPREHENSIVE END-TO-END VERIFICATION');
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
    // -------------------------------------------------------------------
    // 1. AUTHENTICATION & TOKENS
    // -------------------------------------------------------------------
    console.log('\n--- 1. Testing Authentication & Role Tokens ---');

    const adminLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'admin', password: 'admin123' },
    });
    assert(adminLogin.statusCode === 200 && adminLogin.body.user.role === 'admin', 'Admin login succeeds with role admin');
    const adminToken = adminLogin.body.token;

    const cashierLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'cashier', password: 'cashier123' },
    });
    assert(cashierLogin.statusCode === 200 && cashierLogin.body.user.role === 'cashier', 'Cashier login succeeds with role cashier');
    const cashierToken = cashierLogin.body.token;

    // Verify /api/auth/me for both roles
    const adminMe = await request({ method: 'GET', path: '/api/auth/me', headers: { Authorization: `Bearer ${adminToken}` } });
    assert(adminMe.statusCode === 200 && adminMe.body.data.role === 'admin', 'GET /api/auth/me returns admin profile');

    const cashierMe = await request({ method: 'GET', path: '/api/auth/me', headers: { Authorization: `Bearer ${cashierToken}` } });
    assert(cashierMe.statusCode === 200 && cashierMe.body.data.role === 'cashier', 'GET /api/auth/me returns cashier profile');

    // -------------------------------------------------------------------
    // 2. BACKEND ROLE PERMISSION ENFORCEMENT
    // -------------------------------------------------------------------
    console.log('\n--- 2. Testing Role-Based Permission Enforcement ---');

    // Cashier blocked from creating menu item
    const cashierCreateMenu = await request({
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { name: 'Illegal Item', category: 'Starters', price: 100, foodType: 'veg' },
    });
    assert(cashierCreateMenu.statusCode === 403, 'Cashier blocked from POST /api/menu (403)');

    // Cashier blocked from reports
    const cashierDash = await request({ method: 'GET', path: '/api/reports/dashboard', headers: { Authorization: `Bearer ${cashierToken}` } });
    assert(cashierDash.statusCode === 403, 'Cashier blocked from GET /api/reports/dashboard (403)');

    const cashierAnalytics = await request({ method: 'GET', path: '/api/reports/analytics?range=today', headers: { Authorization: `Bearer ${cashierToken}` } });
    assert(cashierAnalytics.statusCode === 403, 'Cashier blocked from GET /api/reports/analytics (403)');

    const cashierExport = await request({ method: 'GET', path: '/api/reports/export-csv', headers: { Authorization: `Bearer ${cashierToken}` } });
    assert(cashierExport.statusCode === 403, 'Cashier blocked from GET /api/reports/export-csv (403)');

    // Admin allowed on reports
    const adminDash = await request({ method: 'GET', path: '/api/reports/dashboard', headers: { Authorization: `Bearer ${adminToken}` } });
    assert(adminDash.statusCode === 200 && adminDash.body.data.todaySales !== undefined, 'Admin allowed on GET /api/reports/dashboard (200)');

    // -------------------------------------------------------------------
    // 3. MENU CRUD & MANAGEMENT
    // -------------------------------------------------------------------
    console.log('\n--- 3. Testing Menu Management (Admin Only) ---');

    // Admin creates item
    const testItemPayload = { name: 'Automated Test Tikka', category: 'Starters', price: 299, foodType: 'veg' };
    const createMenuRes = await request({
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: testItemPayload,
    });
    assert(createMenuRes.statusCode === 201 && createMenuRes.body.data.name === 'Automated Test Tikka', 'Admin creates new menu item (201)');
    const createdItemId = createMenuRes.body.data._id;

    // Admin updates item
    const updateMenuRes = await request({
      method: 'PUT',
      path: `/api/menu/${createdItemId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Automated Test Tikka Special', price: 349 },
    });
    assert(updateMenuRes.statusCode === 200 && updateMenuRes.body.data.price === 349, 'Admin updates menu item price to 349 (200)');

    // Admin toggles availability
    const toggleRes = await request({
      method: 'PATCH',
      path: `/api/menu/${createdItemId}/toggle-availability`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(toggleRes.statusCode === 200 && toggleRes.body.data.isAvailable === false, 'Admin toggles menu item availability to false (200)');

    // Admin deletes test item
    const deleteRes = await request({
      method: 'DELETE',
      path: `/api/menu/${createdItemId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteRes.statusCode === 200, 'Admin deletes menu item (200)');

    // -------------------------------------------------------------------
    // 4. WORKFLOW 1: CASH PAYMENT WITH CHANGE RETURN
    // -------------------------------------------------------------------
    console.log('\n--- 4. Testing Workflow 1: Cash Payment & Change Calculation ---');

    // Get active menu item with price ₹340 (Classic Butter Chicken) and free table
    const menuList = await request({ method: 'GET', path: '/api/menu', headers: { Authorization: `Bearer ${cashierToken}` } });
    const dishA = menuList.body.data[0];
    const dishB = menuList.body.data[1];
    const dish340 = menuList.body.data.find((d) => d.price === 340);
    assert(!!dish340, `Found menu item "${dish340?.name}" with price ₹340 for standard calculation`);

    const tablesList = await request({ method: 'GET', path: '/api/tables', headers: { Authorization: `Bearer ${cashierToken}` } });
    const freeTable1 = tablesList.body.data.find((t) => t.status === 'free');
    assert(!!freeTable1, `Found available table ${freeTable1?.tableNumber} for Cash order`);

    // Cashier places order on table: 1 portion of Butter Chicken (₹340)
    const order1Items = [
      { menuItem: dish340._id, name: dish340.name, price: dish340.price, quantity: 1 },
    ];
    const expectedSubtotal1 = 340;

    const order1Res = await request({
      method: 'POST',
      path: '/api/orders',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderType: 'dine-in',
        tableId: freeTable1._id,
        items: order1Items,
      },
    });
    assert(order1Res.statusCode === 201 && order1Res.body.data.subtotal === expectedSubtotal1, `Order 1 created with subtotal ₹${expectedSubtotal1}`);
    const order1 = order1Res.body.data;

    // Verify table is now running
    const tableCheck1 = await request({ method: 'GET', path: '/api/tables', headers: { Authorization: `Bearer ${cashierToken}` } });
    const updatedTable1 = tableCheck1.body.data.find((t) => t._id === freeTable1._id);
    assert(updatedTable1.status === 'running', `Table ${freeTable1.tableNumber} status successfully updated to 'running'`);

    // Cashier bills order 1 with a 10% discount
    const bill1Res = await request({
      method: 'POST',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderId: order1._id,
        discountType: 'percentage',
        discountValue: 10,
      },
    });
    assert(bill1Res.statusCode === 201, 'Bill 1 created with 10% discount');
    const bill1 = bill1Res.body.data;

    // Exact financial verification:
    // Subtotal: ₹340.00
    // Discount 10%: ₹34.00
    // Taxable amount: ₹306.00
    // CGST (2.5%): ₹7.65
    // SGST (2.5%): ₹7.65
    // Grand Total before round-off: ₹321.30
    // Round-off adjustment: -₹0.30
    // Final payable amount: ₹321.00
    assert(bill1.subtotal === 340, `Subtotal is ₹${bill1.subtotal}`);
    assert(bill1.discountAmount === 34, `Discount (10%) is ₹${bill1.discountAmount}`);
    assert(bill1.taxableAmount === 306, `Taxable amount is ₹${bill1.taxableAmount}`);
    assert(bill1.cgst === 7.65, `CGST (2.5%) is ₹${bill1.cgst}`);
    assert(bill1.sgst === 7.65, `SGST (2.5%) is ₹${bill1.sgst}`);
    assert(bill1.grandTotal === 321.3, `Grand total before round-off is ₹${bill1.grandTotal}`);
    assert(bill1.roundOff === -0.3, `Round-off adjustment is ₹${bill1.roundOff}`);
    assert(bill1.finalAmount === 321, `Final payable amount is exactly ₹${bill1.finalAmount}`);

    // Table should now be marked free automatically
    const tableAfterBill1 = await request({ method: 'GET', path: '/api/tables', headers: { Authorization: `Bearer ${cashierToken}` } });
    const freeAgain1 = tableAfterBill1.body.data.find((t) => t._id === freeTable1._id);
    assert(freeAgain1.status === 'free', `Table ${freeTable1.tableNumber} status released to 'free' upon bill creation`);

    // Pay with Cash: customer tenders ₹1,000 note
    const tendered = 1000;
    const payment1Res = await request({
      method: 'POST',
      path: `/api/bills/${bill1._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        paymentMode: 'cash',
        amount: bill1.finalAmount, // Payable: ₹321
        tenderedAmount: tendered,  // Cash received: ₹1,000
      },
    });
    assert(payment1Res.statusCode === 200, 'Cash payment processed successfully (HTTP 200 OK)');
    assert(
      payment1Res.body.data.newPayments[0].amount === 321,
      `Payment record amount is ₹${payment1Res.body.data.newPayments[0].amount} (verified ₹321, NOT ₹1,000)`
    );

    // Verify directly in MongoDB Payment collection
    const savedPaymentInDb = await Payment.findOne({ bill: bill1._id });
    assert(
      savedPaymentInDb && savedPaymentInDb.amount === 321,
      `MongoDB Payment collection confirms recorded payment amount is ₹${savedPaymentInDb?.amount}`
    );

    const expectedChange = tendered - bill1.finalAmount; // 1000 - 321 = 679
    assert(
      payment1Res.body.data.changeDue === 679,
      `Change returned (₹${payment1Res.body.data.changeDue}) matches ₹${tendered} - ₹${bill1.finalAmount} = ₹${expectedChange}`
    );
    assert(payment1Res.body.data.balanceDue === 0, 'Remaining balance due is ₹0.00');
    assert(payment1Res.body.data.bill.paymentStatus === 'paid', 'Bill paymentStatus is "paid"');

    // -------------------------------------------------------------------
    // 5. WORKFLOW 2: SPLIT PAYMENT (CASH + UPI)
    // -------------------------------------------------------------------
    console.log('\n--- 5. Testing Workflow 2: Split Payment (Cash + UPI) ---');

    const freeTable2 = tablesList.body.data.find((t) => t.status === 'free' && t._id !== freeTable1._id);
    assert(!!freeTable2, `Found available table ${freeTable2?.tableNumber} for Split order`);

    const order2Res = await request({
      method: 'POST',
      path: '/api/orders',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderType: 'dine-in',
        tableId: freeTable2._id,
        items: [{ menuItem: dishA._id, name: dishA.name, price: dishA.price, quantity: 3 }],
      },
    });
    const order2 = order2Res.body.data;

    const bill2Res = await request({
      method: 'POST',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { orderId: order2._id, discountType: 'fixed', discountValue: 0 },
    });
    const bill2 = bill2Res.body.data;

    // Split: half cash, half UPI
    const splitAmount1 = Math.floor(bill2.finalAmount / 2);
    const splitAmount2 = bill2.finalAmount - splitAmount1;

    const splitPaymentRes = await request({
      method: 'POST',
      path: `/api/bills/${bill2._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        payments: [
          { paymentMode: 'cash', amount: splitAmount1 },
          { paymentMode: 'upi', amount: splitAmount2 },
        ],
      },
    });
    assert(splitPaymentRes.statusCode === 200, 'Split payment (Cash + UPI) recorded (200)');
    assert(splitPaymentRes.body.data.bill.paymentStatus === 'paid', 'Split bill marked fully "paid"');
    assert(splitPaymentRes.body.data.totalPaid === bill2.finalAmount, `Total paid equals bill total ₹${bill2.finalAmount}`);

    // -------------------------------------------------------------------
    // 6. WORKFLOW 3: TAKEAWAY ORDER WITH CARD PAYMENT
    // -------------------------------------------------------------------
    console.log('\n--- 6. Testing Workflow 3: Takeaway Order & Card Payment ---');

    const takeawayRes = await request({
      method: 'POST',
      path: '/api/orders',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderType: 'takeaway',
        tableId: null,
        items: [{ menuItem: dishB._id, name: dishB.name, price: dishB.price, quantity: 2 }],
      },
    });
    assert(takeawayRes.statusCode === 201 && takeawayRes.body.data.orderType === 'takeaway', 'Takeaway order punched without table');
    const takeawayOrder = takeawayRes.body.data;

    const takeawayBillRes = await request({
      method: 'POST',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { orderId: takeawayOrder._id },
    });
    assert(takeawayBillRes.statusCode === 201 && takeawayBillRes.body.data.tableNumber === 'Takeaway', 'Takeaway bill generated');
    const takeawayBill = takeawayBillRes.body.data;

    const cardPayRes = await request({
      method: 'POST',
      path: `/api/bills/${takeawayBill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { paymentMode: 'card', amount: takeawayBill.finalAmount },
    });
    assert(cardPayRes.statusCode === 200 && cardPayRes.body.data.bill.paymentStatus === 'paid', 'Takeaway bill settled via Card');

    // -------------------------------------------------------------------
    // 7. FINANCIAL VALIDATION & SAFETY GUARDS
    // -------------------------------------------------------------------
    console.log('\n--- 7. Testing Financial Safeguards & Constraints ---');

    // Create a bill to test validation guards
    const guardOrderRes = await request({
      method: 'POST',
      path: '/api/orders',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: {
        orderType: 'takeaway',
        items: [{ menuItem: dishA._id, name: dishA.name, price: dishA.price, quantity: 1 }],
      },
    });
    const guardBillRes = await request({
      method: 'POST',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { orderId: guardOrderRes.body.data._id },
    });
    const guardBill = guardBillRes.body.data;

    // Reject Overpayment
    const overpayRes = await request({
      method: 'POST',
      path: `/api/bills/${guardBill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { paymentMode: 'cash', amount: guardBill.finalAmount + 500 },
    });
    assert(overpayRes.statusCode === 400 && overpayRes.body.message.includes('Overpayment'), 'Overpayment rejected with 400 Bad Request');

    // Reject Negative/Zero payment
    const negPayRes = await request({
      method: 'POST',
      path: `/api/bills/${guardBill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { paymentMode: 'cash', amount: -50 },
    });
    assert(negPayRes.statusCode === 400, 'Negative payment rejected with 400 Bad Request');

    // Reject Invalid payment mode
    const badModeRes = await request({
      method: 'POST',
      path: `/api/bills/${guardBill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { paymentMode: 'bitcoin', amount: guardBill.finalAmount },
    });
    assert(badModeRes.statusCode === 400, 'Invalid payment mode rejected with 400 Bad Request');

    // Reject Billing an already billed order
    const reBillRes = await request({
      method: 'POST',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { orderId: guardOrderRes.body.data._id },
    });
    assert(reBillRes.statusCode === 400, 'Double billing of same order rejected with 400 Bad Request');

    // Pay guard bill partially then check 'partial' status
    const partialPayRes = await request({
      method: 'POST',
      path: `/api/bills/${guardBill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { paymentMode: 'cash', amount: 50 },
    });
    assert(partialPayRes.statusCode === 200 && partialPayRes.body.data.bill.paymentStatus === 'partial', 'Partial payment correctly marks bill as "partial"');

    // -------------------------------------------------------------------
    // 8. BILL CANCELLATION & AUDIT INTEGRITY
    // -------------------------------------------------------------------
    console.log('\n--- 8. Testing Bill Cancellation & Role Authorization ---');

    // Cashier blocked from cancelling bill
    const cashierCancelRes = await request({
      method: 'PUT',
      path: `/api/bills/${guardBill._id}/cancel`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { cancellationReason: 'Cashier attempt' },
    });
    assert(cashierCancelRes.statusCode === 403, 'Cashier blocked from cancelling bill (403 Forbidden)');

    // Admin cancels bill
    const adminCancelRes = await request({
      method: 'PUT',
      path: `/api/bills/${guardBill._id}/cancel`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { cancellationReason: 'Test order cancellation' },
    });
    assert(adminCancelRes.statusCode === 200 && adminCancelRes.body.data.status === 'cancelled', 'Admin successfully cancels/voids bill (200 OK)');

    // Reject payment on cancelled bill
    const payCancelledRes = await request({
      method: 'POST',
      path: `/api/bills/${guardBill._id}/payments`,
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: { paymentMode: 'cash', amount: 100 },
    });
    assert(payCancelledRes.statusCode === 400, 'Payment on cancelled bill rejected with 400 Bad Request');

    // -------------------------------------------------------------------
    // 9. CONCURRENT BILL CREATION (NO DUPLICATE BILL NUMBERS)
    // -------------------------------------------------------------------
    console.log('\n--- 9. Testing Concurrent Bill Creation (Uniqueness) ---');

    // Create 10 takeaway orders
    const concurrentOrders = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request({
          method: 'POST',
          path: '/api/orders',
          headers: { Authorization: `Bearer ${cashierToken}` },
          body: {
            orderType: 'takeaway',
            items: [{ menuItem: dishA._id, name: dishA.name, price: dishA.price, quantity: 1 }],
          },
        })
      )
    );

    // Bill all 10 orders concurrently
    const concurrentBills = await Promise.all(
      concurrentOrders.map((o) =>
        request({
          method: 'POST',
          path: '/api/bills',
          headers: { Authorization: `Bearer ${cashierToken}` },
          body: { orderId: o.body.data._id },
        })
      )
    );

    const billNumbers = concurrentBills.map((b) => b.body.data?.billNumber).filter(Boolean);
    const uniqueNumbers = new Set(billNumbers);

    assert(
      billNumbers.length === 10 && uniqueNumbers.size === 10,
      `10 concurrent bills created with 10 unique bill numbers (no collisions: ${uniqueNumbers.size}/10)`
    );

    // -------------------------------------------------------------------
    // 10. BILL HISTORY RETRIEVAL & FILTERING
    // -------------------------------------------------------------------
    console.log('\n--- 10. Testing Bill History Retrieval & Filtering ---');

    const historyRes = await request({
      method: 'GET',
      path: '/api/bills',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(historyRes.statusCode === 200 && Array.isArray(historyRes.body.data), 'Cashier retrieves bill history registry');

    const filterPaidRes = await request({
      method: 'GET',
      path: '/api/bills?paymentStatus=paid',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(filterPaidRes.statusCode === 200 && filterPaidRes.body.data.every((b) => b.paymentStatus === 'paid'), 'Filter by paymentStatus=paid works correctly');

    const filterCancelledRes = await request({
      method: 'GET',
      path: '/api/bills?status=cancelled',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(filterCancelledRes.statusCode === 200 && filterCancelledRes.body.data.every((b) => b.status === 'cancelled'), 'Filter by status=cancelled works correctly');

    // -------------------------------------------------------------------
    // 11. REPORTS, ANALYTICS & CSV EXPORT AUDIT
    // -------------------------------------------------------------------
    console.log('\n--- 11. Testing Reports & Financial Analytics Integrity ---');

    // Fetch reports as admin
    const analyticsRes = await request({
      method: 'GET',
      path: '/api/reports/analytics?range=today',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(analyticsRes.statusCode === 200, 'Admin fetches detailed analytics (200 OK)');
    const reportData = analyticsRes.body.data;

    // Direct database validation
    const dbActiveBills = await Bill.find({ status: 'active' });
    const dbCancelledBills = await Bill.find({ status: 'cancelled' });
    const expectedActiveRev = dbActiveBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);
    const expectedCancelledRev = dbCancelledBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);

    assert(
      reportData.kpis.netRevenue === expectedActiveRev,
      `Report netRevenue (₹${reportData.kpis.netRevenue}) matches database active bills sum (₹${expectedActiveRev})`
    );

    assert(
      reportData.kpis.cancelledCount === dbCancelledBills.length,
      `Report cancelledCount (${reportData.kpis.cancelledCount}) strictly equals DB cancelled bills (${dbCancelledBills.length})`
    );

    assert(
      reportData.kpis.cancelledRevenue === expectedCancelledRev,
      `Report cancelledRevenue (₹${reportData.kpis.cancelledRevenue}) correctly tracked and excluded from active netRevenue`
    );

    assert(
      Array.isArray(reportData.paymentDistribution) && reportData.paymentDistribution.length === 3,
      'Report includes 3 payment modes (Cash, UPI / QR, Card)'
    );

    assert(
      Array.isArray(reportData.topSellingItems) && reportData.topSellingItems.length > 0,
      'Report includes top-selling items ranking'
    );

    // Test CSV Export
    const csvRes = await request({
      method: 'GET',
      path: '/api/reports/export-csv',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(csvRes.statusCode === 200, 'Admin exports CSV report (200 OK)');
    assert(
      typeof csvRes.body === 'string' && csvRes.body.includes('Bill Number,Date,Time,Order Type,Table'),
      'CSV contains required standard billing headers'
    );

    // -------------------------------------------------------------------
    // FINAL REPORT
    // -------------------------------------------------------------------
    console.log('\n======================================================');
    console.log(` BATCH 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    if (server) server.close();
    process.exit(1);
  }
};

runBatch4Tests();
