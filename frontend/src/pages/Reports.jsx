import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
  TrendingUp,
  Download,
  Banknote,
  QrCode,
  CreditCard,
  RefreshCw,
  Printer,
} from 'lucide-react';

export const Reports = () => {
  const [range, setRange] = useState('today');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/analytics', { params: { range } });
      setAnalytics(res.data.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const response = await api.get('/reports/export-csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !analytics) {
    return <LoadingSpinner text="Loading reports..." />;
  }

  const kpis = analytics?.kpis || {};
  const orderTypes = analytics?.orderTypeDistribution || {};
  const payments = analytics?.paymentDistribution || [];
  const topDishes = analytics?.topSellingItems || [];
  const timeline = analytics?.timelineData || [];

  const kpiCards = [
    {
      label: 'Revenue',
      value: `₹${(kpis.netRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
    },
    {
      label: 'Orders',
      value: kpis.totalBillsCount ?? 0,
      icon: ShoppingBag,
    },
    {
      label: 'Avg Order Value',
      value: `₹${(kpis.averageOrderValue || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
    },
    {
      label: 'GST Collected',
      value: `₹${(kpis.totalTax || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Reports</h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setRange(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === p.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV} loading={exporting}>
            CSV
          </Button>
          <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchAnalytics} className="text-slate-500 hover:text-slate-800">
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <Icon className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xl font-bold text-slate-900">{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sales Timeline */}
        <Card title="Sales Timeline" className="lg:col-span-8">
          <div className="w-full min-h-[260px]">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e242b',
                    borderRadius: '6px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val, name) => [
                    name === 'revenue' ? `₹${val}` : `${val} orders`,
                    name === 'revenue' ? 'Revenue' : 'Orders',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Summary */}
        <Card title="Payment Summary" className="lg:col-span-4">
          <div className="space-y-4">
            {payments.map((p, idx) => {
              const total = payments.reduce((acc, item) => acc + item.amount, 0);
              const percentage = total > 0 ? Math.round((p.amount / total) * 100) : 0;
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

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dine-In: <strong>{orderTypes.dineIn?.count || 0}</strong></span>
            <span>Takeaway: <strong>{orderTypes.takeaway?.count || 0}</strong></span>
          </div>
        </Card>
      </div>

      {/* Top Selling */}
      <Card title="Top Selling Items">
        {topDishes.length > 0 ? (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-5 py-2.5">Item</th>
                  <th className="px-5 py-2.5 text-center">Qty Sold</th>
                  <th className="px-5 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDishes.map((dish, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-xs font-medium text-slate-500">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{dish.name}</td>
                    <td className="px-5 py-3 text-center text-xs text-slate-600">{dish.quantity}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">₹{dish.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-4 text-center">No sales data for selected period.</p>
        )}
      </Card>
    </div>
  );
};
