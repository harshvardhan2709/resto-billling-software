import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
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
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const res = await api.get('/reports/dashboard');
        setMetrics(res.data.data);
      } else {
        // Cashier role operational data
        const [tablesRes, ordersRes, menuRes] = await Promise.all([
          api.get('/tables'),
          api.get('/orders?status=open'),
          api.get('/menu'),
        ]);

        const tables = tablesRes.data.data || [];
        const freeTables = tables.filter((t) => t.status === 'free').length;
        const menuItems = menuRes.data.data || [];

        setMetrics({
          todaySales: 'Restricted',
          todayOrdersCount: ordersRes.data.data?.length || 0,
          activeMenuCount: menuItems.filter((m) => m.isAvailable).length,
          totalMenuCount: menuItems.length,
          tablesSummary: {
            total: tables.length,
            free: freeTables,
            running: tables.length - freeTables,
          },
          recentOpenOrders: ordersRes.data.data || [],
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
    return <LoadingSpinner text="Connecting to Urban Plate POS stream..." />;
  }

  const statCards = [
    {
      title: "Today's Revenue",
      value:
        metrics?.todaySales !== 'Restricted'
          ? `₹${(metrics?.todaySales || 0).toLocaleString('en-IN')}`
          : 'Restricted',
      subtitle: isAdmin ? 'Net realized billings' : 'Manager Access Required',
      icon: IndianRupee,
      badge: isAdmin ? '+12.5%' : 'Protected',
      badgeVariant: isAdmin ? 'success' : 'default',
    },
    {
      title: 'Active Orders',
      value: metrics?.todayOrdersCount ?? 0,
      subtitle: 'Currently running or today',
      icon: ShoppingBag,
      badge: 'Live',
      badgeVariant: 'info',
    },
    {
      title: 'Table Occupancy',
      value: `${metrics?.tablesSummary?.running || 0} / ${metrics?.tablesSummary?.total || 10}`,
      subtitle: `${metrics?.tablesSummary?.free || 0} tables currently free`,
      icon: UtensilsCrossed,
      badge: `${Math.round(
        ((metrics?.tablesSummary?.running || 0) / (metrics?.tablesSummary?.total || 10)) * 100
      )}% Occ`,
      badgeVariant: 'brand',
    },
    {
      title: 'Active Menu Items',
      value: `${metrics?.activeMenuCount || 0} / ${metrics?.totalMenuCount || 28}`,
      subtitle: 'Dishes available in catalog',
      icon: BookOpen,
      badge: 'Stocked',
      badgeVariant: 'default',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-charcoal-900 via-charcoal-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
            <Badge
              variant="brand"
              size="sm"
              className="bg-brand-500/20 text-brand-300 border-brand-500/30"
            >
              {isAdmin ? 'Management Console' : 'Counter Station'}
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name}!
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {isAdmin
              ? 'Urban Plate POS central console. Real-time monitoring of live floor tables, order volume, revenue analytics, and menu management.'
              : 'POS billing terminal ready. Manage table turnover, punch takeaway orders, and generate guest receipts.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={UtensilsCrossed}
              onClick={() => navigate('/tables')}
            >
              Open Tables & POS Orders
            </Button>
            {isAdmin ? (
              <Button
                variant="dark"
                size="md"
                icon={BookOpen}
                onClick={() => navigate('/menu')}
                className="bg-charcoal-800 hover:bg-charcoal-700 border border-slate-700"
              >
                Manage Menu Catalog
              </Button>
            ) : (
              <Button
                variant="dark"
                size="md"
                icon={ShoppingBag}
                onClick={() => navigate('/tables')}
                className="bg-charcoal-800 hover:bg-charcoal-700 border border-slate-700"
              >
                Punch Takeaway
              </Button>
            )}
            <Button
              variant="ghost"
              size="md"
              icon={RefreshCw}
              onClick={fetchDashboardData}
              className="text-slate-300 hover:text-white hover:bg-slate-800/60"
            >
              Sync
            </Button>
          </div>
        </div>

        {/* Decorative graphic */}
        <div className="absolute right-6 -bottom-6 opacity-10 text-brand-400 pointer-events-none hidden md:block">
          <UtensilsCrossed className="w-64 h-64" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-5 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {stat.title}
                </span>
                <Badge variant={stat.badgeVariant} size="sm">
                  {stat.badge}
                </Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {stat.value}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span>{stat.subtitle}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts & Analytics Section (Admin Exclusive / Cashier Alternative) */}
      {isAdmin && metrics?.hourlyData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Velocity Chart (2 cols) */}
          <Card
            title="Hourly Sales Velocity (₹)"
            subtitle="Today's sales pace across operational time slots"
            className="lg:col-span-2"
          >
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.hourlyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                      borderRadius: '8px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category Distribution Chart (1 col) */}
          <Card
            title="Menu Category Distribution"
            subtitle="Items breakdown by catalog section"
          >
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.categoryDistribution || []}
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
                      borderRadius: '8px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [value, 'Dishes']}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Live Floor & Open Orders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Orders Table */}
        <Card
          title="Active Kitchen Tickets & Orders"
          subtitle="Orders currently in progress on the floor"
          action={
            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/tables')}
            >
              Floor Plan
            </Button>
          }
          className="lg:col-span-2 p-0 overflow-hidden"
        >
          {metrics?.recentOpenOrders?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {metrics.recentOpenOrders.slice(0, 5).map((order) => (
                <div
                  key={order._id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 font-bold">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant={order.orderType === 'dine-in' ? 'brand' : 'default'}
                          size="sm"
                        >
                          {order.orderType === 'dine-in'
                            ? `Table ${order.table?.tableNumber || 'Dine-In'}`
                            : 'Takeaway'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} items in ticket
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">
                      ₹{order.subtotal?.toFixed(2)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <Clock className="w-3 h-3" /> Running
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">All Tables Free</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No orders are currently waiting in the kitchen queue.
              </p>
            </div>
          )}
        </Card>

        {/* Quick Operations Panel */}
        <Card title="Quick Floor Dispatch" subtitle="Fast POS Shortcuts">
          <div className="space-y-3">
            <button
              onClick={() => navigate('/tables')}
              className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  T
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600">
                    Floor Plan Grid
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {metrics?.tablesSummary?.free || 0} tables available for seating
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
            </button>

            {isAdmin && (
              <button
                onClick={() => navigate('/menu')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600">
                      Edit Menu Catalog
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Add dishes, adjust pricing, toggle stock
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
              </button>
            )}

            <button
              onClick={() => navigate('/bills')}
              className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600">
                    Bill History
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Audit trail & settled receipts
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
