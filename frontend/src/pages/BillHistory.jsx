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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Banknote,
  QrCode,
  CreditCard,
  Split,
  User,
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

  // Sorting state (default: newest date first)
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

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

      if (datePreset !== 'All') {
        params.datePreset = datePreset;
      }

      const formatLocalDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const now = new Date();
      if (datePreset === 'today') {
        const todayStr = formatLocalDate(now);
        params.startDate = todayStr;
        params.endDate = todayStr;
      } else if (datePreset === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        const yestStr = formatLocalDate(yest);
        params.startDate = yestStr;
        params.endDate = yestStr;
      } else if (datePreset === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        params.startDate = formatLocalDate(weekAgo);
        params.endDate = formatLocalDate(now);
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getBillPaymentMode = (b) => {
    if (b.paymentMode) return b.paymentMode;
    const modes = (b.payments || []).map((p) => p.paymentMode).filter(Boolean);
    if (modes.length > 1) return 'split';
    return modes[0] || 'cash';
  };

  // Filter bills
  const filteredBills = bills.filter((b) => {
    if (paymentModeFilter !== 'All') {
      const target = paymentModeFilter.toLowerCase();
      const primaryMode = getBillPaymentMode(b).toLowerCase();
      const allModes = (b.payments || []).map((p) => p.paymentMode?.toLowerCase());
      if (target === 'split') {
        if (primaryMode !== 'split' && allModes.length <= 1) return false;
      } else if (primaryMode !== target && !allModes.includes(target)) {
        return false;
      }
    }
    if (!search) return true;
    const term = search.toLowerCase();
    const primaryMode = getBillPaymentMode(b).toLowerCase();
    return (
      (b.billNumber || '').toLowerCase().includes(term) ||
      (b.tableNumber || '').toLowerCase().includes(term) ||
      (b.cashier?.name || '').toLowerCase().includes(term) ||
      primaryMode.includes(term)
    );
  });

  // Sort bills
  const sortedBills = [...filteredBills].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') {
      cmp = new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortField === 'paidBy' || sortField === 'paymentMode') {
      const modeA = getBillPaymentMode(a);
      const modeB = getBillPaymentMode(b);
      cmp = modeA.localeCompare(modeB);
    } else if (sortField === 'amount') {
      cmp = (a.finalAmount || 0) - (b.finalAmount || 0);
    } else if (sortField === 'billNumber') {
      cmp = (a.billNumber || '').localeCompare(b.billNumber || '');
    } else if (sortField === 'cashier') {
      cmp = (a.cashier?.name || '').localeCompare(b.cashier?.name || '');
    } else if (sortField === 'status') {
      cmp = (a.status || '').localeCompare(b.status || '');
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline-block" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-brand-600 ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-brand-600 ml-1 inline-block" />
    );
  };

  const renderPaymentModeBadge = (bill) => {
    const mode = getBillPaymentMode(bill).toLowerCase();
    if (mode === 'cash') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
          <Banknote className="w-3 h-3 text-emerald-600" />
          Cash
        </span>
      );
    }
    if (mode === 'upi') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
          <QrCode className="w-3 h-3 text-blue-600" />
          UPI
        </span>
      );
    }
    if (mode === 'card') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
          <CreditCard className="w-3 h-3 text-amber-600" />
          Card
        </span>
      );
    }
    if (mode === 'split') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
          <Split className="w-3 h-3 text-purple-600" />
          Split
        </span>
      );
    }
    return (
      <span className="text-[11px] text-slate-500 uppercase">{mode}</span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bill History</h2>
          <p className="text-xs text-slate-500">
            {sortedBills.length} invoices found • Click headers to sort by Paid By, Date, or Amount
          </p>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchBills} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        {/* Date presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
          {[
            { id: 'All', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md shrink-0 transition-colors ${
                datePreset === preset.id
                  ? 'bg-brand-500 text-white shadow-xs'
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
              placeholder="Search bill #, table, cashier, payment mode..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortField(f);
                setSortOrder(o);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="date-desc">Sort: Newest First</option>
              <option value="date-asc">Sort: Oldest First</option>
              <option value="paidBy-asc">Sort: Paid By Mode (A-Z)</option>
              <option value="paidBy-desc">Sort: Paid By Mode (Z-A)</option>
              <option value="amount-desc">Sort: Amount (High to Low)</option>
              <option value="amount-asc">Sort: Amount (Low to High)</option>
              <option value="cashier-asc">Sort: Cashier (A-Z)</option>
            </select>

            {/* Paid By Mode Filter */}
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Paid Modes</option>
              <option value="cash">Paid by Cash</option>
              <option value="upi">Paid by UPI</option>
              <option value="card">Paid by Card</option>
              <option value="split">Paid by Split</option>
            </select>

            {/* Payment Settlement Status Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Payments</option>
              <option value="paid">Settled (Paid)</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>

            {/* Order Type Filter */}
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Types</option>
              <option value="dine-in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
            </select>

            {/* Bill Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Voided</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading bills..." />
        ) : sortedBills.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No bills found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th
                    className="px-5 py-3 cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('billNumber')}
                  >
                    Bill # {renderSortIndicator('billNumber')}
                  </th>
                  <th
                    className="px-5 py-3 cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('date')}
                  >
                    Date & Time {renderSortIndicator('date')}
                  </th>
                  <th className="px-5 py-3">Type / Table</th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {renderSortIndicator('amount')}
                  </th>
                  <th
                    className="px-5 py-3 cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('paidBy')}
                  >
                    Paid By {renderSortIndicator('paidBy')}
                  </th>
                  <th
                    className="px-5 py-3 cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('cashier')}
                  >
                    Cashier {renderSortIndicator('cashier')}
                  </th>
                  <th
                    className="px-5 py-3 text-center cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status {renderSortIndicator('status')}
                  </th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBills.map((bill) => {
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
                        <span className="font-medium">{bill.orderType?.toUpperCase()}</span>
                        <span className="text-slate-400 ml-1">({bill.tableNumber})</span>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold ${
                          isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        ₹{bill.finalAmount?.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderPaymentModeBadge(bill)}
                          <Badge
                            variant={
                              bill.paymentStatus === 'paid'
                                ? 'success'
                                : bill.paymentStatus === 'partial'
                                ? 'warning'
                                : 'default'
                            }
                            size="sm"
                            className="capitalize text-[10px]"
                          >
                            {bill.paymentStatus}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{bill.cashier?.name || 'Staff'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
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

      {/* Cancel / Void Modal */}
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
              <p className="font-semibold">
                This will void the invoice and deduct ₹{billToCancel?.finalAmount} from sales reports.
              </p>
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
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="Customer void request">Customer void request</option>
              <option value="Order billed twice">Order billed twice</option>
              <option value="Customer walked out">Customer walked out</option>
              <option value="Payment transaction failed">Payment transaction failed</option>
              <option value="Incorrect items punched">Incorrect items punched</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBillToCancel(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isCancelling}
              onClick={handleConfirmCancel}
              icon={Ban}
            >
              Confirm Void
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      {selectedBill && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedBill(null);
          }}
          bill={selectedBill}
          paymentInfo={{
            payments: selectedBill.payments || [],
            changeDue: 0,
          }}
        />
      )}
    </div>
  );
};
