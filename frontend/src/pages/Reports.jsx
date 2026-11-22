import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import { BarChart3, TrendingUp, IndianRupee, PieChart, Users } from 'lucide-react';

export const Reports = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setMetrics(res.data.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <LoadingSpinner text="Compiling financial reports..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
        <p className="text-xs text-slate-500 mt-1">
          Financial reporting, sales velocity, and category distribution (Admin Exclusive)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Realized Sales
            </span>
            <IndianRupee className="w-5 h-5 text-brand-600" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-slate-900">
            ₹{(metrics?.todaySales || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-400 mt-1">Accumulated day revenue</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Orders Processed
            </span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-slate-900">
            {metrics?.todayOrdersCount || 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Completed orders</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Tables
            </span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-slate-900">
            {metrics?.tablesSummary?.running || 0} / {metrics?.tablesSummary?.total || 10}
          </div>
          <p className="text-xs text-slate-400 mt-1">Floor capacity utilization</p>
        </Card>
      </div>
    </div>
  );
};
