import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ReceiptModal } from '../components/billing/ReceiptModal';
import api from '../services/api';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Filter,
  RefreshCw,
  IndianRupee,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const BillHistory = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Receipt Modal State
  const [selectedBill, setSelectedBill] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = {};
      if (paymentFilter !== 'All') params.paymentStatus = paymentFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

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
  }, [paymentFilter, statusFilter]);

  const handleOpenReceipt = async (bill) => {
    try {
      const res = await api.get(`/bills/${bill._id}`);
      setSelectedBill(res.data.data);
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Failed to load bill receipt details', err);
    }
  };

  const filteredBills = bills.filter((b) => {
    if (!search) return true;
    return (
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.tableNumber.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Bill Archive & History
            </h2>
            <Badge variant="brand" size="sm">
              GST Invoices
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical invoice records, price freezing audit log, and thermal receipt printing
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchBills}
          loading={loading}
        >
          Refresh Archive
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by Bill # or Table..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">
                Payment:
              </span>
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
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">
                Status:
              </span>
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
      </Card>

      {/* Bills Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner text="Retrieving bill records..." />
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No Bills Found</p>
            <p className="text-xs text-slate-400 mt-1">
              Invoices generated via POS Checkout will appear in this archive.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Bill Number</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Type & Table</th>
                  <th className="px-6 py-3.5 text-right">Taxable</th>
                  <th className="px-6 py-3.5 text-right">GST (5%)</th>
                  <th className="px-6 py-3.5 text-right">Final Total</th>
                  <th className="px-6 py-3.5 text-center">Payment</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                      {bill.billNumber}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-800">
                        {bill.orderType?.toUpperCase()} ({bill.tableNumber})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs">
                      ₹{bill.taxableAmount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500">
                      ₹{((bill.cgst || 0) + (bill.sgst || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₹{bill.finalAmount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
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
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Printer}
                        onClick={() => handleOpenReceipt(bill)}
                      >
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Printable Receipt Modal */}
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
