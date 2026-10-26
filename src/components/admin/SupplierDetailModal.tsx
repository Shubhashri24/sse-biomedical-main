"use client";

import React, { useState } from "react";
import type { SupplierDoc } from "@/lib/mongodb";

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDoc | null;
  onEdit: (supplier: SupplierDoc) => void;
  onToggleActive?: (supplier: SupplierDoc) => void;
}

export default function SupplierDetailModal({
  isOpen,
  onClose,
  supplier,
  onEdit,
  onToggleActive,
}: SupplierDetailModalProps) {
  const [showFullAccount, setShowFullAccount] = useState(false);

  if (!isOpen || !supplier) return null;

  // Mask bank account number for safety
  const rawAccount = supplier.bankingDetails?.accountNumber || "";
  const maskedAccount = rawAccount
    ? rawAccount.length > 4
      ? "••••••••" + rawAccount.slice(-4)
      : "••••" + rawAccount
    : "Not provided";

  // Address formatting helper
  const formatAddress = (addr?: {
    streetAddress?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
  }) => {
    if (!addr) return "Not provided";
    const parts = [
      addr.streetAddress,
      addr.addressLine2,
      addr.city,
      addr.state,
      addr.pinCode,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Not provided";
  };

  const statusColors: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-700 border-slate-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
    "Pending Approval": "bg-amber-50 text-amber-800 border-amber-200",
  };

  const verificationColors: Record<string, string> = {
    Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Pending Verification": "bg-amber-50 text-amber-800 border-amber-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
    Unverified: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-detail-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-[#0F9F95] border border-teal-200 shadow-2xs font-bold text-xl">
              🏥
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded">
                  {supplier.supplierCode}
                </span>
                <h2 id="supplier-detail-title" className="text-lg font-bold text-slate-900">
                  {supplier.companyName}
                </h2>
                {supplier.isPreferredSupplier && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                    ⭐ Preferred Partner
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    statusColors[supplier.supplierStatus || (supplier.isActive ? "Active" : "Inactive")] ||
                    "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {supplier.supplierStatus || (supplier.isActive ? "Active" : "Inactive")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {supplier.supplierType || "Biomedical Supplier"} • {supplier.city || "India"}
                {supplier.supplierRating ? ` • ⭐ ${supplier.supplierRating} / 5 Rating` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(supplier);
              }}
              className="rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>✏️</span> Edit Supplier
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section A: Company & Business Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                <span>🏢</span> Section A — Company & OEM Business Credentials
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {supplier.businessRegistrationType || "Private Limited"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Supplier Type</span>
                <span className="font-semibold text-slate-800">
                  {supplier.supplierType || "Not specified"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Registration Type</span>
                <span className="font-semibold text-slate-800">
                  {supplier.businessRegistrationType || "Not specified"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Year Established</span>
                <span className="font-semibold text-slate-800">
                  {supplier.yearEstablished || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Employee Scale</span>
                <span className="font-semibold text-slate-800">
                  {supplier.employeeCount || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Company PAN</span>
                <span className="font-mono font-semibold text-slate-800">
                  {supplier.panNumber || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">GST Status & Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  {supplier.gstNumber || supplier.gstRegistrationStatus || "Unregistered"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">CIN / Reg. Number</span>
                <span className="font-mono text-slate-800">
                  {supplier.cinNumber || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">MSME / Udyam</span>
                <span className="font-mono text-slate-800">
                  {supplier.msmeNumber || "—"}
                </span>
              </div>

              {supplier.iecCode && (
                <div>
                  <span className="text-slate-400 block text-[11px]">IEC Code (Import/Export)</span>
                  <span className="font-mono font-semibold text-slate-800">{supplier.iecCode}</span>
                </div>
              )}

              {supplier.website && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Official Website</span>
                  <a
                    href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-teal-700 hover:underline truncate block"
                  >
                    {supplier.website} ↗
                  </a>
                </div>
              )}

              {supplier.companyDescription && (
                <div className="col-span-2 sm:col-span-3 md:col-span-4 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">Company Overview</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {supplier.companyDescription}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Contact Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                <span>👤</span> Section B — Key Contacts & Sourcing Liaisons
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Primary Contact Person</span>
                <span className="font-bold text-slate-900 text-sm">
                  {supplier.contactPerson}
                </span>
                {supplier.designation && (
                  <span className="text-slate-500 text-[11px] block">{supplier.designation}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Official Email</span>
                <a
                  href={`mailto:${supplier.email}`}
                  className="font-medium text-teal-700 hover:underline block"
                >
                  {supplier.email}
                </a>
                {supplier.alternateEmail && (
                  <span className="text-slate-400 text-[11px] block">
                    Alt: {supplier.alternateEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Primary Phone</span>
                <span className="font-semibold text-slate-800 block">{supplier.phone}</span>
                {supplier.alternatePhone && (
                  <span className="text-slate-400 text-[11px] block">
                    Alt: {supplier.alternatePhone}
                  </span>
                )}
              </div>

              {supplier.accountsBillingEmail && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">
                    Accounts & Invoicing Email (Disbursement Alerts)
                  </span>
                  <a
                    href={`mailto:${supplier.accountsBillingEmail}`}
                    className="font-mono text-slate-800 hover:underline"
                  >
                    {supplier.accountsBillingEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section C: Registered Address & Location */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                <span>📍</span> Section C — Registered Office, Billing & Shipping Locations
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">
                  🏢 Registered Office
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {formatAddress(supplier.registeredOfficeAddress || {
                    streetAddress: supplier.streetAddress || supplier.address,
                    addressLine2: supplier.addressLine2,
                    city: supplier.city,
                    state: supplier.state,
                    pinCode: supplier.pinCode,
                    country: supplier.country,
                  })}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">
                    🧾 Billing Address
                  </span>
                  {supplier.billingSameAsRegistered !== false && (
                    <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.5 rounded">
                      Same as Registered
                    </span>
                  )}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {formatAddress(supplier.billingAddress || supplier.registeredOfficeAddress || {
                    streetAddress: supplier.streetAddress || supplier.address,
                    city: supplier.city,
                    state: supplier.state,
                    pinCode: supplier.pinCode,
                  })}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">
                    📦 Shipping / Warehouse
                  </span>
                  {supplier.shippingSameAsRegistered !== false && (
                    <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.5 rounded">
                      Same as Registered
                    </span>
                  )}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {formatAddress(supplier.shippingAddress || supplier.registeredOfficeAddress || {
                    streetAddress: supplier.streetAddress || supplier.address,
                    city: supplier.city,
                    state: supplier.state,
                    pinCode: supplier.pinCode,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Section D: Banking & Payment Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                  <span>💳</span> Section D — Banking & Payment Settlement Details
                </h3>
                {supplier.bankingDetails?.verificationStatus && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                      verificationColors[supplier.bankingDetails.verificationStatus] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {supplier.bankingDetails.verificationStatus}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                Accounts Payable Only
              </span>
            </div>

            {supplier.bankingDetails &&
            (supplier.bankingDetails.bankName || supplier.bankingDetails.accountNumber) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Bank Name</span>
                  <span className="font-semibold text-slate-800">
                    {supplier.bankingDetails.bankName || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Beneficiary Name</span>
                  <span className="font-semibold text-slate-800">
                    {supplier.bankingDetails.accountHolderName || "—"}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Bank Account No.</span>
                    {rawAccount && (
                      <button
                        type="button"
                        onClick={() => setShowFullAccount(!showFullAccount)}
                        className="text-[10px] text-teal-700 hover:underline cursor-pointer font-semibold"
                      >
                        {showFullAccount ? "Mask" : "Reveal"}
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900 tracking-wider">
                    {showFullAccount ? rawAccount : maskedAccount}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">IFSC Code</span>
                  <span className="font-mono font-bold text-teal-800">
                    {supplier.bankingDetails.ifscCode || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Branch Name</span>
                  <span className="text-slate-800">{supplier.bankingDetails.branchName || "—"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Account Type</span>
                  <span className="text-slate-800">{supplier.bankingDetails.accountType || "Current"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                  <span className="font-semibold text-slate-900">
                    {supplier.bankingDetails.paymentTerms === "Custom"
                      ? `Custom: ${supplier.bankingDetails.customPaymentTerms || ""}`
                      : supplier.bankingDetails.paymentTerms || "Net 30"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Credit Limit / Currency</span>
                  <span className="font-semibold text-slate-800">
                    {supplier.bankingDetails.creditLimit
                      ? `₹${Number(supplier.bankingDetails.creditLimit).toLocaleString("en-IN")}`
                      : "Uncapped"}{" "}
                    ({supplier.bankingDetails.currency || "INR"})
                  </span>
                </div>

                {supplier.bankingDetails.upiId && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">UPI ID</span>
                    <span className="font-mono text-slate-800">{supplier.bankingDetails.upiId}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No banking details on record. Click <strong>Edit Supplier</strong> to add disbursement credentials.
              </p>
            )}
          </div>

          {/* Section E: Biomedical Product & Service Specialization */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                <span>🔬</span> Section E — Biomedical Capabilities & Modalities
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product Categories */}
              <div>
                <span className="text-slate-400 block text-[11px] mb-1.5 font-semibold">
                  Equipment Categories & Modalities Covered
                </span>
                {supplier.productCategories && supplier.productCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {supplier.productCategories.map((c) => (
                      <span
                        key={c}
                        className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900 border border-teal-200/60"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No specific categories categorized.</span>
                )}
              </div>

              {/* Brands & Models */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                    Brands Represented
                  </span>
                  {supplier.brandsRepresented && supplier.brandsRepresented.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.brandsRepresented.map((b) => (
                        <span
                          key={b}
                          className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">None specified</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                    Key Equipment Models
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {supplier.equipmentModels || "None specified"}
                  </p>
                </div>
              </div>

              {/* OEM Authorization & Service Support */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-400 block">Authorized Distributor</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {supplier.isAuthorizedDistributor ? "✅ Yes (Authorized OEM)" : "⚪ Independent"}
                  </span>
                  {supplier.manufacturerAuthorizationDetails && (
                    <p className="text-[11px] text-teal-800 mt-1">
                      {supplier.manufacturerAuthorizationDetails}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-400 block">Service Support Deliverables</span>
                  <div className="mt-1 space-y-0.5 font-medium text-slate-700 text-[11px]">
                    <div>{supplier.hasInstallationSupport ? "✅ Installation Available" : "❌ No Installation"}</div>
                    <div>{supplier.hasWarrantySupport ? "✅ OEM Warranty Available" : "❌ No Warranty"}</div>
                    <div>{supplier.hasAfterSalesService ? "✅ AMC / CMC Available" : "❌ No After-Sales"}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-400 block">Logistics & Ordering</span>
                  <div className="mt-1 space-y-1 text-slate-700">
                    <div>
                      <strong>Coverage:</strong> {supplier.geographicServiceCoverage || "Pan-India"}
                    </div>
                    <div>
                      <strong>Lead Time:</strong> {supplier.typicalLeadTimeDays || "7-14 Days"}
                    </div>
                    {supplier.minimumOrderValue && (
                      <div>
                        <strong>Min Order Value:</strong> ₹{Number(supplier.minimumOrderValue).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section F: Compliance Documents */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                <span>📑</span> Section F — Compliance Registry & Document Validity
              </h3>
              <span className="text-[11px] text-slate-400">
                {supplier.documents?.length || 0} Certificates Recorded
              </span>
            </div>

            {supplier.documents && supplier.documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Document Type</th>
                      <th className="py-2 px-3">Reference / Cert ID</th>
                      <th className="py-2 px-3">Expiry Date</th>
                      <th className="py-2 px-3">Verification</th>
                      <th className="py-2 px-3">Review Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplier.documents.map((doc, idx) => {
                      const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                      const isExpiringSoon =
                        doc.expiryDate &&
                        !isExpired &&
                        new Date(doc.expiryDate).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

                      return (
                        <tr key={doc.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {doc.documentType}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {doc.documentReferenceNumber || "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            {doc.expiryDate ? (
                              <div className="flex items-center gap-1.5">
                                <span>{new Date(doc.expiryDate).toLocaleDateString("en-IN")}</span>
                                {isExpired && (
                                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                    EXPIRED
                                  </span>
                                )}
                                {isExpiringSoon && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    EXPIRING SOON
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Lifetime / NA</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                doc.verificationStatus === "Verified"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : doc.verificationStatus === "Rejected"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {doc.verificationStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 italic">
                            {doc.reviewNotes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No compliance certificates recorded for this partner yet.
              </p>
            )}
          </div>

          {/* Section G: Procurement & Internal Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F9F95] flex items-center gap-1.5">
                <span>📝</span> Section G — Procurement Dossier & Internal Commercial Terms
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                  Agreed Commercial Terms & Discounting
                </span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {supplier.agreedCommercialTerms || "Standard rate card applies."}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                  Warranty & Return Terms
                </span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {supplier.warrantyReturnPolicy || "Standard manufacturer warranty."}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                  Delivery & Commissioning Terms
                </span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {supplier.deliveryInstallationTerms || "Subject to purchase order stipulations."}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                  General Procurement Notes
                </span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {supplier.notes || "None on record."}
                </p>
              </div>

              {supplier.internalRiskReviewNotes && (
                <div className="md:col-span-2">
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                    Internal Risk Assessment & Quality Findings
                  </span>
                  <p className="text-amber-900 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                    {supplier.internalRiskReviewNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5 text-xs text-slate-500">
          <div>
            Registered: {new Date(supplier.createdAt).toLocaleDateString("en-IN")} • Last Updated:{" "}
            {new Date(supplier.updatedAt).toLocaleDateString("en-IN")}
          </div>

          <div className="flex items-center gap-2">
            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(supplier)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {supplier.isActive ? "Deactivate Supplier" : "Activate Supplier"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(supplier);
              }}
              className="rounded-lg bg-[#0F9F95] px-4 py-1.5 font-semibold text-white hover:bg-[#0B827B] transition-colors cursor-pointer shadow-2xs"
            >
              Edit Supplier Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
