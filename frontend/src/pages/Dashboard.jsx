import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  IndianRupee,
  ShoppingBag,
  UtensilsCrossed,
  BookOpen,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
} from 'lucide-react';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayOrdersCount: 0,
    activeMenuCount: 0,
    totalMenuCount: 0,
    tablesSummary: { total: 10, free: 10, running: 0 },
    categoryDistribution: [],
    hourlyData: [],
    paymentDistribution: [],
    topSellingItems: [],
    recentOpenOrders: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      if (res.data?.data) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const tablesSummary = metrics?.tablesSummary || { total: 10, free: 10, running: 0 };

  const statCards = [
    {
      label: isAdmin ? "Today's Sales (Total)" : 'My Shift Sales',
      value: `₹${Number(metrics?.todaySales || 0).toLocaleString('en-IN')}`,
      subtext: isAdmin ? 'All counters' : `${user?.name || 'Cashier'} shift`,
      icon: IndianRupee,
    },
    {
      label: 'Total Bills',
      value: metrics?.todayOrdersCount ?? 0,
      subtext: "Today's settled bills",
      icon: ShoppingBag,
    },
    {
      label: 'Table Availability',
      value: `${tablesSummary.free} Free`,
      subtext: `${tablesSummary.running} running / ${tablesSummary.total} tables`,
      icon: UtensilsCrossed,
    },
    {
      label: 'Active Menu',
      value: `${metrics?.activeMenuCount || 0} Dishes`,
      subtext: `${metrics?.totalMenuCount || 0} total on catalog`,
      icon: BookOpen,
    },
  ];

  const payments = metrics?.paymentDistribution || [];
  const topSelling = metrics?.topSellingItems || [];
  const totalPaymentSum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Operational overview & financial analytics'
              : `Welcome, ${user?.name || 'Cashier'} • POS Station active`}
          </p>
        </div>
      </div>

      {/* KPI Cards (Both Admin & Cashier: Today's sales [Full vs Limited], Total bills, Table availability) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                <Icon className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xl font-bold text-slate-900">{stat.value}</span>
              {stat.subtext && (
                <p className="text-[11px] text-slate-400 mt-1 truncate">{stat.subtext}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ADMIN-ONLY ANALYTICS: Total revenue analytics & Payment analytics */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Total Revenue Analytics (Hourly Sales Trend) */}
          {metrics?.hourlyData && metrics.hourlyData.length > 0 && (
            <Card title="Total Revenue Analytics" subtitle="Hourly sales trend across shifts" className="lg:col-span-8">
              <div className="w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart
                    data={metrics.hourlyData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e242b',
                        borderRadius: '6px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`₹${value}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Payment Analytics (Cash, UPI, Card breakdown) */}
          <Card title="Payment Analytics" subtitle="Settlement mode share" className="lg:col-span-4">
            <div className="space-y-4 pt-1">
              {payments.map((p, idx) => {
                const percentage = totalPaymentSum > 0 ? Math.round((p.amount / totalPaymentSum) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {p.mode === 'Cash' ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        ) : p.mode.includes('UPI') ? (
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {p.mode}
                      </span>
                      <span>₹{p.amount.toFixed(0)} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.mode === 'Cash'
                            ? 'bg-emerald-500'
                            : p.mode.includes('UPI')
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ADMIN-ONLY: Top-Selling Items */}
      {isAdmin && topSelling.length > 0 && (
        <Card title="Top-Selling Items" subtitle="Top moving dishes by sales volume">
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-5 py-2.5">Dish Name</th>
                  <th className="px-5 py-2.5 text-center">Qty Sold</th>
                  <th className="px-5 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topSelling.map((dish, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-xs font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{dish.name}</span>
                    </td>
                    <td className="px-5 py-3 text-center text-xs font-semibold text-slate-700">
                      {dish.quantity}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 text-xs">
                      ₹{Number(dish.revenue || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ACTIVE ORDERS (Visible to BOTH Admin and Cashier) */}
      <Card title="Active Orders" subtitle="Live running floor and takeaway tickets">
        {metrics?.recentOpenOrders && metrics.recentOpenOrders.length > 0 ? (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-2.5">Order #</th>
                  <th className="px-5 py-2.5">Type</th>
                  <th className="px-5 py-2.5 text-center">Items</th>
                  <th className="px-5 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentOpenOrders.slice(0, 8).map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => navigate('/tables')}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {order.orderType === 'dine-in'
                        ? `Table ${order.table?.tableNumber || ''}`
                        : 'Takeaway'}
                    </td>
                    <td className="px-5 py-3 text-center text-xs text-slate-600">
                      {(order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800 text-xs">
                      ₹{Number(order.subtotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-6 text-center">No active orders right now.</p>
        )}
      </Card>
    </div>
  );
};
