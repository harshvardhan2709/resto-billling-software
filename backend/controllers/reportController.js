const Bill = require('../models/Bill');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to aggregate bills into real 2-hour shift windows
const buildHourlyTrend = (bills) => {
  const buckets = [
    { key: '9 AM', label: '09:00 AM', minH: 9, maxH: 11, revenue: 0, orders: 0 },
    { key: '11 AM', label: '11:00 AM', minH: 11, maxH: 13, revenue: 0, orders: 0 },
    { key: '1 PM', label: '01:00 PM', minH: 13, maxH: 15, revenue: 0, orders: 0 },
    { key: '3 PM', label: '03:00 PM', minH: 15, maxH: 17, revenue: 0, orders: 0 },
    { key: '5 PM', label: '05:00 PM', minH: 17, maxH: 19, revenue: 0, orders: 0 },
    { key: '7 PM', label: '07:00 PM', minH: 19, maxH: 21, revenue: 0, orders: 0 },
    { key: '9 PM', label: '09:00 PM', minH: 21, maxH: 23, revenue: 0, orders: 0 },
    { key: '11 PM', label: '11:00 PM', minH: 23, maxH: 24, revenue: 0, orders: 0 },
  ];

  (bills || []).forEach((b) => {
    const h = new Date(b.createdAt).getHours();
    let bucket = buckets.find((bkt) => h >= bkt.minH && h < bkt.maxH);
    if (!bucket) {
      bucket = h < 9 ? buckets[0] : buckets[buckets.length - 1];
    }
    bucket.revenue += b.finalAmount || 0;
    bucket.orders += 1;
  });

  return buckets.map((b) => ({
    time: b.key,
    name: b.label,
    sales: b.revenue,
    revenue: b.revenue,
    orders: b.orders,
  }));
};

// GET /api/reports/dashboard (Real-time operational summary)
const getDashboardMetrics = async (req, res, next) => {
  try {
    const isCashier = req.user?.role === 'cashier';
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [allTodayBills, totalMenuItems, tables, recentOrders] = await Promise.all([
      Bill.find({ createdAt: { $gte: startOfDay }, status: 'active' }),
      MenuItem.find({}),
      Table.find({}).sort({ tableNumber: 1 }).populate('currentOrder'),
      Order.find({ status: 'open' }).populate('table').sort({ createdAt: -1 }).limit(8),
    ]);

    // Today's Sales: Full for Admin, Limited (shift sales) for Cashier
    const totalRestaurantSales = allTodayBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);
    const cashierBills = allTodayBills.filter(
      (b) => b.cashier?.toString() === req.user?._id?.toString()
    );
    const cashierShiftSales = cashierBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);

    const todaySales = isCashier ? cashierShiftSales : totalRestaurantSales;
    const todayOrdersCount = allTodayBills.length; // Total bills: visible to both

    const freeTablesCount = tables.filter((t) => t.status === 'free').length;
    const runningTablesCount = tables.filter((t) => t.status === 'running').length;

    // Total revenue analytics / Hourly buckets (Admin only, computed from real today's bills)
    let hourlyData = [];
    if (!isCashier) {
      hourlyData = buildHourlyTrend(allTodayBills);
    }

    // Payment analytics (Admin only)
    let paymentDistribution = [];
    if (!isCashier) {
      const billIds = allTodayBills.map((b) => b._id);
      const payments = await Payment.find({ bill: { $in: billIds } });
      const paymentModes = { cash: 0, upi: 0, card: 0 };
      payments.forEach((p) => {
        if (paymentModes[p.paymentMode] !== undefined) {
          paymentModes[p.paymentMode] += p.amount;
        }
      });
      paymentDistribution = [
        { mode: 'Cash', amount: paymentModes.cash },
        { mode: 'UPI / QR', amount: paymentModes.upi },
        { mode: 'Card', amount: paymentModes.card },
      ];
    }

    // Top-selling items (Admin only)
    let topSellingItems = [];
    if (!isCashier) {
      const itemSalesMap = {};
      allTodayBills.forEach((b) => {
        b.items?.forEach((item) => {
          const name = item.name;
          if (!itemSalesMap[name]) {
            itemSalesMap[name] = { name, quantity: 0, revenue: 0 };
          }
          itemSalesMap[name].quantity += item.quantity;
          itemSalesMap[name].revenue += item.total || item.quantity * item.price;
        });
      });
      topSellingItems = Object.values(itemSalesMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }

    // Category distribution for menu
    const categoryCounts = {};
    totalMenuItems.forEach((item) => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    const categoryDistribution = Object.keys(categoryCounts).map((cat) => ({
      name: cat,
      count: categoryCounts[cat],
    }));

    return successResponse(res, 200, 'Dashboard metrics fetched successfully', {
      salesScope: isCashier ? 'limited' : 'full',
      todaySales,
      todayOrdersCount,
      activeMenuCount: totalMenuItems.filter((m) => m.isAvailable).length,
      totalMenuCount: totalMenuItems.length,
      tablesSummary: {
        total: tables.length,
        free: freeTablesCount,
        running: runningTablesCount,
      },
      categoryDistribution: !isCashier ? categoryDistribution : [],
      hourlyData,
      paymentDistribution,
      topSellingItems,
      recentOpenOrders: recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/analytics (Comprehensive Analytics & Financial Reports)
const getDetailedAnalytics = async (req, res, next) => {
  try {
    const { range = 'today', startDate: customStart, endDate: customEnd } = req.query;

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '7days') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '30days') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    // Query all bills in range
    const allBills = await Bill.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate('cashier', 'name username');

    // Separate active and cancelled bills
    const activeBills = allBills.filter((b) => b.status === 'active');
    const cancelledBills = allBills.filter((b) => b.status === 'cancelled');

    // Financial KPIs (computed only from active bills)
    const netRevenue = activeBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);
    const totalBillsCount = activeBills.length;
    const averageOrderValue = totalBillsCount > 0 ? Math.round(netRevenue / totalBillsCount) : 0;
    const totalDiscounts = activeBills.reduce((acc, b) => acc + (b.discountAmount || 0), 0);
    const totalCgst = activeBills.reduce((acc, b) => acc + (b.cgst || 0), 0);
    const totalSgst = activeBills.reduce((acc, b) => acc + (b.sgst || 0), 0);
    const totalTax = parseFloat((totalCgst + totalSgst).toFixed(2));

    const cancelledCount = cancelledBills.length;
    const cancelledRevenue = cancelledBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);

    // Dine-in vs Takeaway share
    let dineInCount = 0;
    let takeawayCount = 0;
    let dineInRevenue = 0;
    let takeawayRevenue = 0;

    activeBills.forEach((b) => {
      if (b.orderType === 'dine-in') {
        dineInCount++;
        dineInRevenue += b.finalAmount;
      } else {
        takeawayCount++;
        takeawayRevenue += b.finalAmount;
      }
    });

    // Top-selling items & Category revenue breakdown
    const itemSalesMap = {};
    const categorySalesMap = {};

    activeBills.forEach((b) => {
      b.items?.forEach((item) => {
        const name = item.name;
        if (!itemSalesMap[name]) {
          itemSalesMap[name] = { name, quantity: 0, revenue: 0 };
        }
        itemSalesMap[name].quantity += item.quantity;
        itemSalesMap[name].revenue += item.total || item.quantity * item.price;
      });
    });

    const topSellingItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Payment method distribution from Payment collection
    const billIds = activeBills.map((b) => b._id);
    const payments = await Payment.find({ bill: { $in: billIds } });

    const paymentModes = { cash: 0, upi: 0, card: 0 };
    payments.forEach((p) => {
      if (paymentModes[p.paymentMode] !== undefined) {
        paymentModes[p.paymentMode] += p.amount;
      }
    });

    const paymentDistribution = [
      { mode: 'Cash', amount: paymentModes.cash },
      { mode: 'UPI / QR', amount: paymentModes.upi },
      { mode: 'Card', amount: paymentModes.card },
    ];

    // Timeline series data for chart (computed from real active bills)
    const timelineData = buildHourlyTrend(activeBills);

    return successResponse(res, 200, 'Detailed analytics fetched successfully', {
      period: { range, startDate, endDate },
      kpis: {
        netRevenue,
        totalBillsCount,
        averageOrderValue,
        totalDiscounts,
        totalTax,
        cancelledCount,
        cancelledRevenue,
      },
      orderTypeDistribution: {
        dineIn: { count: dineInCount, revenue: dineInRevenue },
        takeaway: { count: takeawayCount, revenue: takeawayRevenue },
      },
      paymentDistribution,
      topSellingItems,
      timelineData,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/export-csv (Downloadable audit spreadsheet)
const exportSalesReportCSV = async (req, res, next) => {
  try {
    const bills = await Bill.find()
      .populate('cashier', 'name username')
      .populate('cancelledBy', 'name username')
      .sort({ createdAt: -1 });

    const headers = [
      'Bill Number',
      'Date',
      'Time',
      'Order Type',
      'Table',
      'Cashier',
      'Subtotal',
      'Discount',
      'Taxable Amount',
      'CGST (2.5%)',
      'SGST (2.5%)',
      'Round Off',
      'Final Amount',
      'Payment Status',
      'Bill Status',
      'Cancellation Reason',
    ];

    const rows = bills.map((b) => [
      b.billNumber,
      new Date(b.createdAt).toISOString().split('T')[0],
      new Date(b.createdAt).toLocaleTimeString(),
      b.orderType,
      b.tableNumber,
      b.cashier?.name || 'Staff',
      b.subtotal.toFixed(2),
      b.discountAmount.toFixed(2),
      b.taxableAmount.toFixed(2),
      b.cgst.toFixed(2),
      b.sgst.toFixed(2),
      b.roundOff.toFixed(2),
      b.finalAmount.toFixed(2),
      b.paymentStatus,
      b.status,
      b.cancellationReason ? `"${b.cancellationReason}"` : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="urban_plate_sales_report.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getDetailedAnalytics,
  exportSalesReportCSV,
};
