import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, CheckCircle2, Download } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, bill, paymentInfo }) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptElement = document.getElementById('printable-receipt');
    if (!receiptElement) return;
    const textContent = receiptElement.innerText;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${bill.billNumber || 'receipt'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formattedDate = new Date(bill.createdAt || Date.now()).toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restaurant Tax Invoice / Receipt"
      subtitle="GST Compliant Commercial Restaurant Bill"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Printable Receipt Container */}
        <div
          id="printable-receipt"
          className="bg-white p-6 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 shadow-2xs leading-relaxed printable-area"
        >
          {/* Restaurant Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900 font-sans">
              Urban Plate Restaurant
            </h2>
            <p className="text-[11px] text-slate-500">Fine Dining & Multi-Cuisine POS</p>
            <p className="text-[10px] text-slate-400 mt-1">
              FSSAI (Demo): 00000000000000 | GSTIN (Demo): 29AAAAA0000A1Z5
            </p>
            <p className="text-[10px] text-slate-400">
              MG Road, Metro Pillar 42, Bangalore, KA - 560001
            </p>
            <p className="text-[10px] text-slate-400">Tel: +91 98765 43210</p>
          </div>

          {/* Bill Metadata */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Bill No:</span>
              <span className="font-bold text-slate-900">{bill.billNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Type / Table:</span>
              <span className="font-bold">
                {bill.orderType?.toUpperCase()} ({bill.tableNumber || 'Takeaway'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{bill.cashier?.name || 'Counter Terminal'}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold text-slate-900 text-[11px] pb-1 border-b border-slate-200">
              <span className="w-1/2">Item Description</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-1/6 text-right">Rate</span>
              <span className="w-1/6 text-right">Amt</span>
            </div>
            <div className="divide-y divide-slate-100 py-1">
              {bill.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1 text-[11px]">
                  <span className="w-1/2 truncate pr-1">{item.name}</span>
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-1/6 text-right">₹{item.price.toFixed(0)}</span>
                  <span className="w-1/6 text-right font-medium">
                    ₹{(item.total || item.quantity * item.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span>₹{bill.subtotal?.toFixed(2)}</span>
            </div>

            <div className={`flex justify-between ${bill.discountAmount > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
              <span>
                Discount{bill.discountAmount > 0 && bill.discountType === 'percentage' ? ` (${bill.discountValue}%)` : ''}:
              </span>
              <span>{bill.discountAmount > 0 ? `-₹${bill.discountAmount?.toFixed(2)}` : '₹0.00'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Taxable Amount:</span>
              <span>₹{bill.taxableAmount?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>CGST (2.5%):</span>
              <span>₹{bill.cgst?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>SGST (2.5%):</span>
              <span>₹{bill.sgst?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
              <span>Grand Total before Round-off:</span>
              <span>₹{bill.grandTotal?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Round-off Adjustment:</span>
              <span>
                {bill.roundOff >= 0 ? `+₹${bill.roundOff?.toFixed(2)}` : `-₹${Math.abs(bill.roundOff)?.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 font-sans">
              <span>FINAL PAYABLE:</span>
              <span className="text-base font-mono">₹{bill.finalAmount?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
            <div className="flex justify-between font-semibold">
              <span>Payment Status:</span>
              <span
                className={`uppercase font-bold ${
                  bill.paymentStatus === 'paid'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {bill.paymentStatus}
              </span>
            </div>

            {/* List of payments */}
            {paymentInfo?.payments?.length > 0 ? (
              paymentInfo.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-slate-600">
                  <span className="capitalize">{p.paymentMode} Mode:</span>
                  <span>₹{p.amount.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>Mode:</span>
                <span className="capitalize">
                  {bill.payments?.[0]?.paymentMode || 'Counter Settlement'}
                </span>
              </div>
            )}

            {paymentInfo?.changeDue > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-slate-100">
                <span>Cash Change Returned:</span>
                <span>₹{paymentInfo.changeDue.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-3 text-center text-[10px] text-slate-400 space-y-0.5">
            <p className="font-semibold text-slate-600">
              Thank you for dining at Urban Plate!
            </p>
            <p>Please visit again. Have a wonderful day!</p>
            <p className="text-[9px] text-slate-400 pt-1 font-mono">
              *** Demo POS Receipt (Sample / Local Evaluation Only) ***
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownload}
          >
            Download
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>
    </Modal>
  );
};
