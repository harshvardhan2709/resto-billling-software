import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ReceiptModal } from '../components/billing/ReceiptModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Receipt,
  Search,
  Printer,
  Ban,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const BillHistory = () => {
  const { isAdmin } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [orderTypeFilter, setOrderTypeFilter] = useState('All');
  const [datePreset, setDatePreset] = useState('All');

  const [selectedBill, setSelectedBill] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [billToCancel, setBillToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer void request');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = {};
      if (paymentFilter !== 'All') params.paymentStatus = paymentFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (orderTypeFilter !== 'All') params.orderType = orderTypeFilter;

      const now = new Date();
      if (datePreset === 'today') {
        params.startDate = now.toISOString().split('T')[0];
        params.endDate = now.toISOString().split('T')[0];
      } else if (datePreset === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        params.startDate = yest.toISOString().split('T')[0];
        params.endDate = yest.toISOString().split('T')[0];
      } else if (datePreset === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        params.startDate = weekAgo.toISOString().split('T')[0];
        params.endDate = now.toISOString().split('T')[0];
      }

      const res = await api.get('/bills', { params });
      setBills(res.data.data || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [paymentFilter, statusFilter, orderTypeFilter, datePreset]);

  const handleOpenReceipt = async (bill) => {
    try {
      const res = await api.get(`/bills/${bill._id}`);
      setSelectedBill(res.data.data);
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Failed to load bill receipt details', err);
    }
  };

  const handleConfirmCancel = async () => {
    if (!billToCancel) return;
    try {
      setIsCancelling(true);
      setCancelError('');
      await api.put(`/bills/${billToCancel._id}/cancel`, {
        cancellationReason: cancelReason,
      });
      setBillToCancel(null);
      await fetchBills();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel bill');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    if (paymentModeFilter !== 'All') {
      const modes = (b.payments || []).map((p) => p.paymentMode?.toLowerCase());
      if (!modes.includes(paymentModeFilter.toLowerCase())) {
        return false;
      }
    }
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      b.billNumber.toLowerCase().includes(term) ||
      b.tableNumber?.toLowerCase().includes(term) ||
      b.cashier?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Bill History</h2>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchBills} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        {/* Date presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
          {[
            { id: 'All', label: 'All' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md shrink-0 transition-colors ${
                datePreset === preset.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Search + Dropdowns */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search bill #, table, cashier..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Types</option>
              <option value="dine-in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Payments</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading bills..." />
        ) : filteredBills.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No bills found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Bill #</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type / Table</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Payment</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => {
                  const isCancelled = bill.status === 'cancelled';
                  return (
                    <tr
                      key={bill._id}
                      className={`transition-colors ${
                        isCancelled ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800">
                        {bill.billNumber}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {bill.orderType?.toUpperCase()} ({bill.tableNumber})
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${
                          isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'
                        }`}
                      >
                        ₹{bill.finalAmount?.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge
                          variant={
                            bill.paymentStatus === 'paid'
                              ? 'success'
                              : bill.paymentStatus === 'partial'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {bill.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Printer}
                            onClick={() => handleOpenReceipt(bill)}
                          >
                            Slip
                          </Button>
                          {!isCancelled && isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Ban}
                              onClick={() => {
                                setBillToCancel(bill);
                                setCancelReason('Customer void request');
                                setCancelError('');
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Void
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Cancel Modal */}
      <Modal
        isOpen={!!billToCancel}
        onClose={() => setBillToCancel(null)}
        title="Void Bill"
        subtitle={`Bill #${billToCancel?.billNumber}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <p className="font-semibold">This will void the invoice and deduct ₹{billToCancel?.finalAmount} from reports.</p>
            </div>
          </div>

          {cancelError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Customer void request">Customer void request</option>
              <option value="Wrong dishes punched">Wrong dishes punched</option>
              <option value="Billing calculation error">Billing calculation error</option>
              <option value="Order returned / food issue">Order returned / food issue</option>
              <option value="Payment transaction failure">Payment transaction failure</option>
              <option value="Duplicate invoice entered">Duplicate invoice entered</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBillToCancel(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={isCancelling} onClick={handleConfirmCancel} icon={Ban}>
              Void Bill
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        bill={selectedBill}
        paymentInfo={{
          payments: selectedBill?.payments || [],
          changeDue: 0,
        }}
      />
    </div>
  );
};
