import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  Clock,
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
    recentOpenOrders: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const res = await api.get('/reports/dashboard');
        if (res.data?.data) {
          setMetrics(res.data.data);
        }
      } else {
        const [tablesRes, ordersRes, menuRes] = await Promise.all([
          api.get('/tables').catch(() => ({ data: { data: [] } })),
          api.get('/orders?status=open').catch(() => ({ data: { data: [] } })),
          api.get('/menu').catch(() => ({ data: { data: [] } })),
        ]);

        const tables = tablesRes.data?.data || [];
        const freeTables = tables.filter((t) => t.status === 'free').length;
        const menuItems = menuRes.data?.data || [];
        const openOrders = ordersRes.data?.data || [];

        setMetrics({
          todaySales: 'Restricted',
          todayOrdersCount: openOrders.length,
          activeMenuCount: menuItems.filter((m) => m.isAvailable).length,
          totalMenuCount: menuItems.length,
          tablesSummary: {
            total: tables.length || 10,
            free: freeTables,
            running: (tables.length || 10) - freeTables,
          },
          categoryDistribution: [],
          hourlyData: [],
          recentOpenOrders: openOrders,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const tablesSummary = metrics?.tablesSummary || { total: 10, free: 10, running: 0 };

  const statCards = [
    {
      label: "Today's Sales",
      value:
        metrics?.todaySales !== 'Restricted'
          ? `₹${Number(metrics?.todaySales || 0).toLocaleString('en-IN')}`
          : '—',
      icon: IndianRupee,
    },
    {
      label: 'Orders',
      value: metrics?.todayOrdersCount ?? 0,
      icon: ShoppingBag,
    },
    {
      label: 'Tables',
      value: `${tablesSummary.running} / ${tablesSummary.total}`,
      icon: UtensilsCrossed,
    },
    {
      label: 'Menu Items',
      value: `${metrics?.activeMenuCount || 0} / ${metrics?.totalMenuCount || 0}`,
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>

      {/* KPI Cards */}
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
            </div>
          );
        })}
      </div>

      {/* Charts (Admin Only) */}
      {isAdmin && metrics?.hourlyData && metrics.hourlyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Today's Sales" className="lg:col-span-2">
            <div className="w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height={240}>
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

          {metrics?.categoryDistribution && metrics.categoryDistribution.length > 0 && (
            <Card title="Menu by Category">
              <div className="w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={metrics.categoryDistribution}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
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
                      formatter={(value) => [value, 'Items']}
                    />
                    <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Active Orders */}
      <Card title="Active Orders">
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
          <p className="text-sm text-slate-400 py-4 text-center">No active orders</p>
        )}
      </Card>
    </div>
  );
};
