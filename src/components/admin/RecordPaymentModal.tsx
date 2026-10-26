"use client";

import React, { useState } from "react";
import type { InvoiceDoc } from "@/lib/mongodb";
import { formatINR } from "@/lib/invoice-calculations";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceDoc | null;
  onPaymentRecorded: (updatedInvoice: InvoiceDoc) => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>(
    invoice ? String(invoice.balanceDue || 0) : ""
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "Bank Transfer" | "NEFT/RTGS" | "UPI" | "Cheque" | "Cash" | "Credit Card" | "Other"
  >("Bank Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen || !invoice) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!invoice) return;

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }

    const currentBalance = Number(invoice.balanceDue || 0);
    if (numAmount > currentBalance + 0.0001) {
      setError(`Payment amount cannot exceed current balance due (₹${formatINR(currentBalance)}). Overpayments are not permitted.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          paymentDate,
          paymentMethod,
          referenceNumber,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onPaymentRecorded(data.invoice);
        onClose();
      } else {
        setError(data.message || "Failed to record payment.");
      }
    } catch {
      setError("Network error recording payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Record Customer Payment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice <strong className="font-mono text-slate-800">{invoice.invoiceNumber || invoice.invoiceId}</strong> • {invoice.customer?.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Invoice Payment Overview */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Invoice Total</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              ₹{formatINR(invoice.grandTotal)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Paid So Far</span>
            <div className="text-xs font-bold text-emerald-700 mt-0.5">
              ₹{formatINR(invoice.amountPaid)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Current Balance</span>
            <div className="text-xs font-bold text-amber-700 mt-0.5">
              ₹{formatINR(invoice.balanceDue)}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Amount Received (₹)</label>
              <button
                type="button"
                onClick={() => setAmount(String(invoice.balanceDue || 0))}
                className="text-[11px] text-[#0F9F95] font-semibold hover:underline"
              >
                Pay Full Balance (₹{formatINR(invoice.balanceDue)})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.balanceDue || 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono text-sm font-bold focus:border-teal-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "Bank Transfer" | "NEFT/RTGS" | "UPI" | "Cheque" | "Cash" | "Credit Card" | "Other")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:border-teal-600 focus:outline-none"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI / Net Banking</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit / Debit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Cheque / UTR #</label>
            <input
              type="text"
              placeholder="e.g. UTR123456789 or Cheque #004521"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Remarks / Notes</label>
            <input
              type="text"
              placeholder="Optional notes or receipt references"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#0F9F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
