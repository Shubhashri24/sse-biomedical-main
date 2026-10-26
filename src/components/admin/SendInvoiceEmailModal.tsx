"use client";

import React, { useState, useEffect } from "react";
import type { InvoiceDoc } from "@/lib/mongodb";
import { formatINR } from "@/lib/invoice-calculations";

interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceDoc | null;
  onEmailSent: (updatedInvoice: InvoiceDoc, message: string) => void;
}

export default function SendInvoiceEmailModal({
  isOpen,
  onClose,
  invoice,
  onEmailSent,
}: SendInvoiceEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [confirmResend, setConfirmResend] = useState(false);

  useEffect(() => {
    if (invoice) {
      setRecipientEmail(invoice.customer?.email || "");
      setError(null);
      setDuplicateWarning(null);
      setConfirmResend(false);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const safeNum = (invoice.invoiceNumber || invoice.invoiceId).replace(/[/\\?%*:|"<>]/g, "-");
  const pdfFilename = `Invoice-${safeNum}.pdf`;

  async function handleSend(isRetryWithConfirm = false) {
    if (!invoice) return;
    setError(null);

    const emailToValidate = recipientEmail.trim();
    if (!emailToValidate) {
      setError("Please enter a valid recipient email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      setError("Please enter a properly formatted email address (e.g. name@hospital.com).");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.invoiceId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: emailToValidate,
          confirmResend: isRetryWithConfirm || confirmResend,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicateDetected) {
        setDuplicateWarning(data.message);
        setConfirmResend(true);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to dispatch email. Please check SMTP settings.");
        return;
      }

      onEmailSent(data.invoice, data.message || "Invoice PDF successfully emailed.");
      onClose();
    } catch {
      setError("Network or server communication error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Email Official Tax Invoice</h2>
              <p className="text-xs text-slate-500">
                Dispatch official PDF invoice directly to customer / hospital procurement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            title="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">⏱️</span>
              <p className="font-medium">{duplicateWarning}</p>
            </div>
            <p className="text-2xs text-amber-700 pl-6">
              To prevent accidental duplicate dispatches, please confirm that you intend to send another copy immediately.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Invoice Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-500">Invoice Number:</span>
              <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber || invoice.invoiceId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-800">{invoice.customer?.customerName || "Customer"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Amount:</span>
              <span className="font-bold text-emerald-700 font-mono">₹{formatINR(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Balance Due:</span>
              <span className="font-bold text-amber-700 font-mono">₹{formatINR(invoice.balanceDue)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">Attached File:</span>
              <span className="font-medium text-teal-700 flex items-center gap-1">
                <span>📎</span>
                <span>{pdfFilename}</span>
              </span>
            </div>
          </div>

          {/* Recipient Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                setError(null);
                setDuplicateWarning(null);
              }}
              placeholder="e.g. accounts@hospital.com, procurement@clinic.in"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              disabled={sending}
            />
            <p className="mt-1 text-2xs text-slate-500">
              Defaults to customer email. You can adjust this to dispatch directly to a billing department.
            </p>
          </div>

          {/* Delivery Note */}
          <div className="rounded-lg bg-teal-50/60 border border-teal-100 p-2.5 text-2xs text-teal-800 flex items-start gap-2">
            <span className="text-teal-600 font-bold text-xs">ℹ️</span>
            <span>
              The email will be sent with official Shree Shyam Electronics letterhead, banking instructions, and the computer-generated PDF attached. Dispatched status confirms acceptance by the SMTP mail server.
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {duplicateWarning ? (
            <button
              type="button"
              disabled={sending}
              onClick={() => handleSend(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Resending Copy...</span>
                </>
              ) : (
                <span>⚠️ Yes, Confirm &amp; Resend</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={sending}
              onClick={() => handleSend(false)}
              className="rounded-lg bg-[#0F9F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send Invoice PDF</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
