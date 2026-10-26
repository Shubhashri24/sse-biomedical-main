"use client";

import React, { useState, useEffect } from "react";
import type { CompanyQuotationSettings } from "@/lib/mongodb";

interface InvoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanyQuotationSettings | null;
  onSaved: (updated: CompanyQuotationSettings) => void;
}

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function InvoiceSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaved,
}: InvoiceSettingsModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [maskAccount, setMaskAccount] = useState(true);

  const [form, setForm] = useState({
    companyName: "",
    address: "",
    state: "Maharashtra",
    stateCode: "27",
    phone: "",
    email: "",
    gstNumber: "",
    // Bank details
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    accountType: "Current Account",
    ifscCode: "",
    branchName: "",
    branchAddress: "",
    branchAndIfsc: "",
    // Numbering & legal
    invoicePrefix: "00103/",
    invoiceNumberFormat: "00103/XXXX",
    defaultDeclaration:
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    signatoryTitle: "Authorised Signatory",
  });

  // Re-sync form state when settings change or modal opens
  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName || "",
        address: settings.address || "",
        state: settings.state || "Maharashtra",
        stateCode: settings.stateCode || "27",
        phone: settings.phone || "",
        email: settings.email || "",
        gstNumber: settings.gstNumber || "",
        bankName: settings.bankName || "",
        accountHolderName: settings.accountHolderName || "",
        accountNumber: settings.accountNumber || "",
        confirmAccountNumber: settings.accountNumber || "",
        accountType: settings.accountType || "Current Account",
        ifscCode: settings.ifscCode || (settings.branchAndIfsc ? settings.branchAndIfsc.split(/[-\s]+/).pop() || "" : ""),
        branchName: settings.branchName || "",
        branchAddress: settings.branchAddress || "",
        branchAndIfsc: settings.branchAndIfsc || "",
        invoicePrefix: settings.invoicePrefix || "00103/",
        invoiceNumberFormat: settings.invoiceNumberFormat || "00103/XXXX",
        defaultDeclaration:
          settings.defaultDeclaration ||
          "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
        signatoryTitle: settings.signatoryTitle || "Authorised Signatory",
      });
    }
    setError(null);
    setFieldErrors({});
  }, [settings, isOpen]);

  if (!isOpen) return null;

  function validateBankDetails(isVerifying: boolean): boolean {
    const errs: Record<string, string> = {};

    // Only validate banking strictly if user is saving bank details or explicitly verifying
    const hasAnyBankData =
      Boolean(form.bankName.trim()) ||
      Boolean(form.accountNumber.trim()) ||
      Boolean(form.ifscCode.trim()) ||
      Boolean(form.accountHolderName.trim());

    if (isVerifying || hasAnyBankData) {
      if (!form.bankName.trim()) {
        errs.bankName = "Bank name is required.";
      }
      if (!form.accountHolderName.trim()) {
        errs.accountHolderName = "Account holder / beneficiary name is required.";
      }
      const acc = form.accountNumber.trim();
      if (!acc) {
        errs.accountNumber = "Account number is required.";
      } else if (!/^\d{6,24}$/.test(acc)) {
        errs.accountNumber = "Account number must contain 6 to 24 numeric digits.";
      }

      if (form.confirmAccountNumber.trim() !== acc) {
        errs.confirmAccountNumber = "Confirm account number does not match account number.";
      }

      const ifsc = form.ifscCode.trim().toUpperCase();
      if (!ifsc) {
        errs.ifscCode = "IFSC code is required.";
      } else if (!IFSC_REGEX.test(ifsc)) {
        errs.ifscCode = "Invalid IFSC format. Example: CBIN0280710 (4 letters, 0, 6 alphanumeric).";
      }

      if (!form.branchName.trim()) {
        errs.branchName = "Branch name is required.";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(action?: "VERIFY_BANK" | "UNVERIFY_BANK") {
    setSaving(true);
    setError(null);

    const isVerifying = action === "VERIFY_BANK";
    if (!validateBankDetails(isVerifying)) {
      setSaving(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        companyName: form.companyName.trim(),
        address: form.address.trim(),
        state: form.state.trim(),
        stateCode: form.stateCode.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        gstNumber: form.gstNumber.trim(),
        bankName: form.bankName.trim(),
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountType: form.accountType.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        branchName: form.branchName.trim(),
        branchAddress: form.branchAddress.trim(),
        invoicePrefix: form.invoicePrefix.trim(),
        invoiceNumberFormat: form.invoiceNumberFormat.trim(),
        defaultDeclaration: form.defaultDeclaration.trim(),
        signatoryTitle: form.signatoryTitle.trim(),
      };

      if (action) {
        payload.action = action;
      }

      const res = await fetch("/api/admin/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSaved(data.settings);
        onClose();
      } else {
        setError(data.message || "Failed to update company settings.");
      }
    } catch {
      setError("Network error updating company settings.");
    } finally {
      setSaving(false);
    }
  }

  const isVerified = Boolean(settings?.isBankVerified);
  const isPendingVerification =
    !isVerified &&
    Boolean(settings?.bankName && settings?.accountNumber);

  const maskedDisplayNumber =
    form.accountNumber.length > 4
      ? "•".repeat(Math.max(0, form.accountNumber.length - 4)) +
        form.accountNumber.slice(-4)
      : form.accountNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Invoice & Company Billing Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain company header, verified bank settlement details, invoice numbering, and declarations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="mt-4 space-y-5"
        >
          {/* Company Details */}
          <div>
            <span className="text-[11px] font-bold text-[#0F9F95] uppercase tracking-wider">
              Company Header Information
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Registered Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State Name</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State Code</label>
                <input
                  type="text"
                  value={form.stateCode}
                  onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  placeholder="27XXXXXXXXXXXXX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Company Bank Account Details Section */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#0F9F95] uppercase tracking-wider">
                  Company Bank Account Details
                </span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Verified for Invoice PDFs
                  </span>
                ) : isPendingVerification ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Verification Pending (Omitted from PDFs)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    Unconfigured
                  </span>
                )}
              </div>

              {form.accountNumber && (
                <button
                  type="button"
                  onClick={() => setMaskAccount((v) => !v)}
                  className="text-[11px] text-teal-700 hover:text-teal-900 font-medium underline cursor-pointer"
                >
                  {maskAccount ? "Reveal Account #" : "Mask Account #"}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Banking details are printed on finalized invoice PDFs for customer bank transfers/RTGS. Details must be verified before being included on invoices.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Bank of India"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                    fieldErrors.bankName ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-600"
                  }`}
                />
                {fieldErrors.bankName && (
                  <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.bankName}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Holder / Beneficiary Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shree Shyam Electronics"
                  value={form.accountHolderName}
                  onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                    fieldErrors.accountHolderName ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-600"
                  }`}
                />
                {fieldErrors.accountHolderName && (
                  <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.accountHolderName}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type={maskAccount ? "password" : "text"}
                  placeholder="e.g. 3709239443"
                  value={form.accountNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\s+/g, "");
                    setForm({ ...form, accountNumber: clean });
                  }}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-slate-900 focus:outline-none ${
                    fieldErrors.accountNumber ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-600"
                  }`}
                />
                {maskAccount && form.accountNumber && (
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                    Masked: {maskedDisplayNumber}
                  </span>
                )}
                {fieldErrors.accountNumber && (
                  <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.accountNumber}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Re-enter bank account number"
                  value={form.confirmAccountNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\s+/g, "");
                    setForm({ ...form, confirmAccountNumber: clean });
                  }}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-slate-900 focus:outline-none ${
                    fieldErrors.confirmAccountNumber ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-600"
                  }`}
                />
                {fieldErrors.confirmAccountNumber && (
                  <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.confirmAccountNumber}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  IFSC Code (11 Chars) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CBIN0280710"
                  maxLength={11}
                  value={form.ifscCode}
                  onChange={(e) =>
                    setForm({ ...form, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                  }
                  className={`w-full rounded-lg border px-3 py-2 font-mono uppercase text-slate-900 focus:outline-none ${
                    fieldErrors.ifscCode ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-600"
                  }`}
                />
                {fieldErrors.ifscCode && (
                  <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.ifscCode}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value="Current Account">Current Account</option>
                  <option value="Savings Account">Savings Account</option>
                  <option value="Cash Credit (CC)">Cash Credit (CC)</option>
                  <option value="Overdraft (OD)">Overdraft (OD)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MIDC Jalgaon Branch"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                    fieldErrors.branchName ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-600"
                  }`}
                />
                {fieldErrors.branchName && (
                  <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.branchName}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area, Jalgaon"
                  value={form.branchAddress}
                  onChange={(e) => setForm({ ...form, branchAddress: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Verification status and explicit actions */}
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong className="text-slate-800">Verification Safeguard:</strong>
                <p className="text-[11px] text-slate-500">
                  {isVerified
                    ? `Verified on ${settings?.bankVerifiedAt ? new Date(settings.bankVerifiedAt).toLocaleDateString("en-IN") : "active record"} by ${settings?.bankVerifiedBy || "admin"}. Invoices will render bank details.`
                    : "Saving new banking details unverified prevents accidental or incorrect bank transfers. Click 'Verify & Confirm Bank Details' to enable display on customer invoices."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isVerified ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave("UNVERIFY_BANK")}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Unverify
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave("VERIFY_BANK")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    ✓ Verify & Confirm Bank Details
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Numbering & Legal */}
          <div className="border-t border-slate-100 pt-4">
            <span className="text-[11px] font-bold text-[#0F9F95] uppercase tracking-wider">
              Invoice Numbering & Legal Declaration
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                  placeholder="00103/"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Example: <code className="font-mono text-teal-700 font-semibold">00103/</code> results in{" "}
                  <code className="font-mono text-teal-700">00103/0386</code>
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Signatory Title</label>
                <input
                  type="text"
                  value={form.signatoryTitle}
                  onChange={(e) => setForm({ ...form, signatoryTitle: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Default Declaration</label>
                <textarea
                  rows={2}
                  value={form.defaultDeclaration}
                  onChange={(e) => setForm({ ...form, defaultDeclaration: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0F9F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {saving ? "Saving Settings..." : "Save Invoice Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
