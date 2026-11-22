import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { ReceiptModal } from '../components/billing/ReceiptModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import {
  Receipt,
  UtensilsCrossed,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Sparkles,
} from 'lucide-react';

export const Billing = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const initialOrderId = queryParams.get('orderId');

  const [openOrders, setOpenOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || '');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Discount configuration
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percentage'
  const [discountValue, setDiscountValue] = useState(0);

  // Live computed calculations
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    grandTotal: 0,
    roundOff: 0,
    finalAmount: 0,
  });

  // Payment states
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [singlePaymentMode, setSinglePaymentMode] = useState('cash'); // 'cash' | 'upi' | 'card'
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [splitList, setSplitList] = useState([
    { paymentMode: 'cash', amount: '' },
    { paymentMode: 'upi', amount: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Generated Bill & Receipt Modal
  const [generatedBill, setGeneratedBill] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Load open orders
  const fetchOpenOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders?status=open');
      const orders = res.data.data || [];
      setOpenOrders(orders);

      if (initialOrderId) {
        const found = orders.find((o) => o._id === initialOrderId);
        if (found) {
          setCurrentOrder(found);
          setSelectedOrderId(found._id);
        }
      } else if (orders.length > 0 && !selectedOrderId) {
        setCurrentOrder(orders[0]);
        setSelectedOrderId(orders[0]._id);
      }
    } catch (err) {
      console.error('Failed to load open orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenOrders();
  }, []);

  // Update current order when selectedOrderId changes
  useEffect(() => {
    if (selectedOrderId && openOrders.length > 0) {
      const found = openOrders.find((o) => o._id === selectedOrderId);
      if (found) {
        setCurrentOrder(found);
        setTenderedAmount('');
      }
    }
  }, [selectedOrderId, openOrders]);

  // Recompute tax, discounts, roundoff
  useEffect(() => {
    if (!currentOrder) return;

    const subtotal = currentOrder.subtotal || 0;
    const dVal = Math.max(0, Number(discountValue) || 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = parseFloat(((subtotal * Math.min(100, dVal)) / 100).toFixed(2));
    } else {
      discountAmount = parseFloat(Math.min(subtotal, dVal).toFixed(2));
    }

    const taxableAmount = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
    const cgst = parseFloat(((taxableAmount * 2.5) / 100).toFixed(2));
    const sgst = parseFloat(((taxableAmount * 2.5) / 100).toFixed(2));
    const grandTotal = parseFloat((taxableAmount + cgst + sgst).toFixed(2));
    const finalAmount = Math.round(grandTotal);
    const roundOff = parseFloat((finalAmount - grandTotal).toFixed(2));

    setCalculations({
      subtotal,
      discountAmount,
      taxableAmount,
      cgst,
      sgst,
      grandTotal,
      roundOff,
      finalAmount,
    });
  }, [currentOrder, discountType, discountValue]);

  // Cash change due calculation
  const cashChange =
    singlePaymentMode === 'cash' && Number(tenderedAmount) > calculations.finalAmount
      ? Number(tenderedAmount) - calculations.finalAmount
      : 0;

  // Split payment sum calculation
  const splitTotal = splitList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const splitShortfall = calculations.finalAmount - splitTotal;

  // Split payment row handlers
  const handleUpdateSplit = (index, field, value) => {
    setSplitList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddSplitRow = () => {
    setSplitList((prev) => [...prev, { paymentMode: 'card', amount: '' }]);
  };

  const handleRemoveSplitRow = (index) => {
    if (splitList.length <= 1) return;
    setSplitList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit Bill & Payment
  const handleFinalizeBill = async () => {
    if (!currentOrder) return;

    // Validate payment
    if (isSplitPayment) {
      if (splitTotal < calculations.finalAmount) {
        setCheckoutError(
          `Split payments sum (₹${splitTotal}) does not cover final amount (₹${calculations.finalAmount}). Shortfall: ₹${splitShortfall}`
        );
        return;
      }
    } else if (singlePaymentMode === 'cash') {
      if (tenderedAmount && Number(tenderedAmount) < calculations.finalAmount) {
        setCheckoutError(
          `Cash tendered (₹${tenderedAmount}) is less than final amount (₹${calculations.finalAmount})`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setCheckoutError('');

      // 1. Generate Bill
      const billRes = await api.post('/bills', {
        orderId: currentOrder._id,
        discountType,
        discountValue: Number(discountValue) || 0,
      });

      const bill = billRes.data.data;

      // 2. Record Payment
      let paymentPayload = {};
      if (isSplitPayment) {
        paymentPayload = {
          payments: splitList
            .filter((p) => Number(p.amount) > 0)
            .map((p) => ({
              paymentMode: p.paymentMode,
              amount: Number(p.amount),
            })),
        };
      } else {
        paymentPayload = {
          paymentMode: singlePaymentMode,
          amount: calculations.finalAmount,
          tenderedAmount:
            singlePaymentMode === 'cash' ? Number(tenderedAmount) || calculations.finalAmount : null,
        };
      }

      const paymentRes = await api.post(`/bills/${bill._id}/payments`, paymentPayload);

      // Update state for receipt modal
      setGeneratedBill(paymentRes.data.data.bill);
      setPaymentInfo({
        payments: paymentRes.data.data.newPayments,
        changeDue: paymentRes.data.data.changeDue,
      });

      setIsReceiptOpen(true);
      await fetchOpenOrders();
    } catch (err) {
      setCheckoutError(err.message || 'Failed to complete billing checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading billing workstation..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Billing & POS Checkout
            </h2>
            <Badge variant="brand" size="sm">
              GST 5% Calculator
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Apply discounts, compute CGST/SGST, settle split payments, and print invoices
          </p>
        </div>

        {/* Order Selector Dropdown */}
        {openOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Order:
            </span>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {openOrders.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.orderNumber} ({o.orderType.toUpperCase()} - {o.table?.tableNumber || 'Takeaway'}) - ₹
                  {o.subtotal?.toFixed(0)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {openOrders.length === 0 ? (
        <Card className="p-12 text-center text-slate-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No Open Orders to Bill</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All tables are currently settled. Start a new dine-in or takeaway order from the Tables floor plan.
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              size="md"
              icon={UtensilsCrossed}
              onClick={() => navigate('/tables')}
            >
              Go to Tables & Floor Plan
            </Button>
          </div>
        </Card>
      ) : currentOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: ORDER SUMMARY & TAX BREAKDOWN (7 COLS)                      */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Order Items Snapshot Card */}
            <Card
              title={`Ticket Details: ${currentOrder.orderNumber}`}
              subtitle={`${currentOrder.orderType.toUpperCase()} - ${
                currentOrder.table?.tableNumber || 'Takeaway Counter'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentOrder.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{(item.total || item.quantity * item.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Discount Configuration Card */}
            <Card title="Apply Promotional Discount" subtitle="Fixed amount or percentage deduction">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {/* Discount Type Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        discountType === 'fixed'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Fixed (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        discountType === 'percentage'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Percent (%)
                    </button>
                  </div>

                  {/* Discount Input */}
                  <div className="flex-1 max-w-xs">
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? '100' : currentOrder.subtotal}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'fixed' ? 'e.g. 50' : 'e.g. 10'}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Presets:
                  </span>
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountType('percentage');
                        setDiscountValue(pct);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                  {[50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setDiscountType('fixed');
                        setDiscountValue(amt);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Comprehensive Tax Breakdown Summary */}
            <Card title="GST & Financial Breakdown" subtitle="Computed strictly according to Indian GST standards">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    ₹{calculations.subtotal.toFixed(2)}
                  </span>
                </div>

                {calculations.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700 font-semibold">
                    <span>Discount Deduction:</span>
                    <span>-₹{calculations.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 pt-2 border-t border-slate-100 font-semibold text-slate-700">
                  <span>Taxable Base Value:</span>
                  <span>₹{calculations.taxableAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-500">
                  <span>Central GST (CGST @ 2.5%):</span>
                  <span>+₹{calculations.cgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-500">
                  <span>State GST (SGST @ 2.5%):</span>
                  <span>+₹{calculations.sgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-400 text-[11px]">
                  <span>Nearest Integer Round Off:</span>
                  <span>
                    {calculations.roundOff >= 0
                      ? `+₹${calculations.roundOff.toFixed(2)}`
                      : `-₹${Math.abs(calculations.roundOff).toFixed(2)}`}
                  </span>
                </div>

                <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center text-slate-900">
                  <span className="text-sm font-extrabold uppercase tracking-wide">
                    Final Net Payable:
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    ₹{calculations.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: PAYMENT SETTLEMENT & CHECKOUT (5 COLS)                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            <Card
              title="Payment & Settlement"
              subtitle="Record single or split payment transactions"
            >
              {checkoutError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Single Mode vs Split Payment Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    !isSplitPayment
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Single Payment
                </button>
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    isSplitPayment
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Split Payment Mode
                </button>
              </div>

              {!isSplitPayment ? (
                /* SINGLE PAYMENT METHOD */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Select Payment Mode:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: 'cash', label: 'Cash', icon: Banknote },
                        { mode: 'upi', label: 'UPI / QR', icon: QrCode },
                        { mode: 'card', label: 'Card Swipe', icon: CreditCard },
                      ].map(({ mode, label, icon: Icon }) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSinglePaymentMode(mode)}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                            singlePaymentMode === mode
                              ? 'border-brand-500 bg-brand-50/50 text-brand-700 font-bold shadow-2xs'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Tendered & Change Due Calculator */}
                  {singlePaymentMode === 'cash' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Cash Tendered from Customer:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tenderedAmount}
                          onChange={(e) => setTenderedAmount(e.target.value)}
                          placeholder={`Enter amount (e.g. ₹${calculations.finalAmount})`}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>

                      {cashChange > 0 && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs font-bold text-emerald-800">
                          <span>Change to Return:</span>
                          <span className="text-sm font-mono">₹{cashChange.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {singlePaymentMode === 'upi' && (
                    <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl text-center text-xs text-blue-800 space-y-1">
                      <QrCode className="w-8 h-8 mx-auto text-blue-600 mb-1" />
                      <p className="font-bold">Dynamic UPI QR Ready</p>
                      <p className="text-[11px] text-blue-600">
                        Ask guest to scan restaurant QR or transfer ₹{calculations.finalAmount}
                      </p>
                    </div>
                  )}

                  {singlePaymentMode === 'card' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-700 space-y-1">
                      <CreditCard className="w-8 h-8 mx-auto text-slate-500 mb-1" />
                      <p className="font-bold">POS EDC Machine Ready</p>
                      <p className="text-[11px] text-slate-500">
                        Swipe/Dip Card for ₹{calculations.finalAmount} and confirm slip
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* SPLIT PAYMENT METHOD */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Split Allocations:
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSplitRow}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Split Row
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {splitList.map((split, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <select
                          value={split.paymentMode}
                          onChange={(e) => handleUpdateSplit(idx, 'paymentMode', e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                        </select>

                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount (₹)"
                            value={split.amount}
                            onChange={(e) => handleUpdateSplit(idx, 'amount', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                          />
                        </div>

                        {splitList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Split Summary Indicator */}
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
                      splitTotal >= calculations.finalAmount
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <span>
                      Allocated: ₹{splitTotal.toFixed(2)} / ₹{calculations.finalAmount}
                    </span>
                    <span>
                      {splitShortfall > 0
                        ? `Shortfall: ₹${splitShortfall.toFixed(2)}`
                        : 'Fully Covered ✓'}
                    </span>
                  </div>
                </div>
              )}

              {/* Final Settle Action Button */}
              <div className="pt-6 border-t border-slate-100 space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md text-base"
                  loading={isSubmitting}
                  onClick={handleFinalizeBill}
                  icon={CheckCircle2}
                >
                  Generate Invoice & Settle (₹{calculations.finalAmount})
                </Button>
                <p className="text-[11px] text-center text-slate-400">
                  Generates permanent tax bill, closes active order, and opens printable receipt slip.
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          navigate('/bills');
        }}
        bill={generatedBill}
        paymentInfo={paymentInfo}
      />
    </div>
  );
};
