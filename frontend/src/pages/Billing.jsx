import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
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

  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState(0);

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

  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [singlePaymentMode, setSinglePaymentMode] = useState('cash');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [splitList, setSplitList] = useState([
    { paymentMode: 'cash', amount: '' },
    { paymentMode: 'upi', amount: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const [generatedBill, setGeneratedBill] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

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

  useEffect(() => {
    if (selectedOrderId && openOrders.length > 0) {
      const found = openOrders.find((o) => o._id === selectedOrderId);
      if (found) {
        setCurrentOrder(found);
        setTenderedAmount('');
      }
    }
  }, [selectedOrderId, openOrders]);

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

    setCalculations({ subtotal, discountAmount, taxableAmount, cgst, sgst, grandTotal, roundOff, finalAmount });
  }, [currentOrder, discountType, discountValue]);

  const cashChange =
    singlePaymentMode === 'cash' && Number(tenderedAmount) > calculations.finalAmount
      ? Number(tenderedAmount) - calculations.finalAmount
      : 0;

  const splitTotal = splitList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const splitShortfall = calculations.finalAmount - splitTotal;

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

  const handleFinalizeBill = async () => {
    if (!currentOrder) return;

    if (isSplitPayment) {
      if (splitTotal < calculations.finalAmount) {
        setCheckoutError(
          `Split total ₹${splitTotal} is less than ₹${calculations.finalAmount}. Short by ₹${splitShortfall}`
        );
        return;
      }
    } else if (singlePaymentMode === 'cash') {
      if (tenderedAmount && Number(tenderedAmount) < calculations.finalAmount) {
        setCheckoutError(
          `Cash ₹${tenderedAmount} is less than ₹${calculations.finalAmount}`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setCheckoutError('');

      const billRes = await api.post('/bills', {
        orderId: currentOrder._id,
        discountType,
        discountValue: Number(discountValue) || 0,
      });

      const bill = billRes.data.data;

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

      setGeneratedBill(paymentRes.data.data.bill);
      setPaymentInfo({
        payments: paymentRes.data.data.newPayments,
        changeDue: paymentRes.data.data.changeDue,
      });

      setIsReceiptOpen(true);
      await fetchOpenOrders();
    } catch (err) {
      setCheckoutError(err.message || 'Failed to complete billing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading billing..." />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Billing</h2>

        {openOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Order:</span>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {openOrders.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.orderNumber} ({o.orderType === 'dine-in' ? `Table ${o.table?.tableNumber || ''}` : 'Takeaway'}) — ₹{o.subtotal?.toFixed(0)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {openOrders.length === 0 ? (
        <Card className="p-10 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-700">No open orders to bill</h3>
          <p className="text-xs text-slate-400 mt-1">Start a new order from the Tables page.</p>
          <div className="mt-4">
            <Button variant="primary" size="sm" icon={UtensilsCrossed} onClick={() => navigate('/tables')}>
              Go to Tables
            </Button>
          </div>
        </Card>
      ) : currentOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Order + Tax */}
          <div className="lg:col-span-7 space-y-5">
            {/* Order Items */}
            <Card title={`Order ${currentOrder.orderNumber}`}
              subtitle={`${currentOrder.orderType === 'dine-in' ? `Table ${currentOrder.table?.tableNumber || ''}` : 'Takeaway'}`}
            >
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-5">Item</th>
                      <th className="py-2.5 px-5 text-center">Qty</th>
                      <th className="py-2.5 px-5 text-right">Price</th>
                      <th className="py-2.5 px-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-5 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2.5 px-5 text-center">{item.quantity}</td>
                        <td className="py-2.5 px-5 text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-2.5 px-5 text-right font-semibold text-slate-800">
                          ₹{(item.total || item.quantity * item.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Discount */}
            <Card title="Discount">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        discountType === 'fixed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Fixed (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        discountType === 'percentage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Percent (%)
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? '100' : currentOrder.subtotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'fixed' ? '₹0' : '0%'}
                    className="flex-1 max-w-[140px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => { setDiscountType('percentage'); setDiscountValue(pct); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md"
                    >
                      {pct}%
                    </button>
                  ))}
                  {[50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setDiscountType('fixed'); setDiscountValue(amt); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bill Summary */}
            <Card title="Bill Summary">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">₹{calculations.subtotal.toFixed(2)}</span>
                </div>
                {calculations.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>−₹{calculations.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-t border-slate-100 pt-2 text-slate-700 font-medium">
                  <span>Taxable Amount</span>
                  <span>₹{calculations.taxableAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>CGST (2.5%)</span>
                  <span>+₹{calculations.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>SGST (2.5%)</span>
                  <span>+₹{calculations.sgst.toFixed(2)}</span>
                </div>
                {calculations.roundOff !== 0 && (
                  <div className="flex justify-between py-1 text-slate-400">
                    <span>Round Off</span>
                    <span>
                      {calculations.roundOff >= 0
                        ? `+₹${calculations.roundOff.toFixed(2)}`
                        : `−₹${Math.abs(calculations.roundOff).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-emerald-700">₹{calculations.finalAmount}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: Payment */}
          <div className="lg:col-span-5 space-y-5">
            <Card title="Payment">
              {checkoutError && (
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Single / Split Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(false)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                    !isSplitPayment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(true)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                    isSplitPayment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Split
                </button>
              </div>

              {!isSplitPayment ? (
                <div className="space-y-4">
                  {/* Payment Mode */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'cash', label: 'Cash', icon: Banknote },
                      { mode: 'upi', label: 'UPI', icon: QrCode },
                      { mode: 'card', label: 'Card', icon: CreditCard },
                    ].map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSinglePaymentMode(mode)}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-colors ${
                          singlePaymentMode === mode
                            ? 'border-brand-500 bg-brand-50/40 text-brand-700 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Cash Tendered */}
                  {singlePaymentMode === 'cash' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <label className="block text-xs font-medium text-slate-600">Cash Received</label>
                      <input
                        type="number"
                        min="0"
                        value={tenderedAmount}
                        onChange={(e) => setTenderedAmount(e.target.value)}
                        placeholder={`₹${calculations.finalAmount}`}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                      {cashChange > 0 && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs font-semibold text-emerald-800">
                          <span>Change</span>
                          <span>₹{cashChange.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {singlePaymentMode === 'upi' && (
                    <p className="text-xs text-slate-500 text-center py-2">UPI Payment — ₹{calculations.finalAmount}</p>
                  )}

                  {singlePaymentMode === 'card' && (
                    <p className="text-xs text-slate-500 text-center py-2">Card Payment — ₹{calculations.finalAmount}</p>
                  )}
                </div>
              ) : (
                /* Split Payment */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Split Allocations</span>
                    <button
                      type="button"
                      onClick={handleAddSplitRow}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {splitList.map((split, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <select
                          value={split.paymentMode}
                          onChange={(e) => handleUpdateSplit(idx, 'paymentMode', e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          placeholder="₹"
                          value={split.amount}
                          onChange={(e) => handleUpdateSplit(idx, 'amount', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold"
                        />
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

                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-medium ${
                      splitTotal >= calculations.finalAmount
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <span>₹{splitTotal} / ₹{calculations.finalAmount}</span>
                    <span>
                      {splitShortfall > 0 ? `Short ₹${splitShortfall}` : 'Covered ✓'}
                    </span>
                  </div>
                </div>
              )}

              {/* Settle */}
              <div className="pt-5 border-t border-slate-100 mt-5">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold"
                  loading={isSubmitting}
                  onClick={handleFinalizeBill}
                  icon={CheckCircle2}
                >
                  Settle ₹{calculations.finalAmount}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Receipt Modal */}
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
