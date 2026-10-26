"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import CommercialQuotationBuilder from "@/components/admin/CommercialQuotationBuilder";
import type { QuotationRequestDoc, QuotationStatus } from "@/lib/mongodb";
import { formatINR, formatDateIN } from "@/lib/quotation-calculations";

const WORKFLOW_STATUSES: QuotationStatus[] = [
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "QUOTATION_PREPARATION",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "APPROVED",
  "REJECTED",
  "CLOSED",
];

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<QuotationRequestDoc | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Active view tab: overview or commercial builder
  const [activeTab, setActiveTab] = useState<"overview" | "commercial">("overview");

  // Status updating state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");

  // Reply form state
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyNotice, setReplyNotice] = useState<string>("");

  // Internal note form state
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteNotice, setNoteNotice] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/admin/quotations/${id}`);
        if (!res.ok) {
          setErrorMessage("Failed to load quotation request.");
          return;
        }

        const data = await res.json();
        if (data.success && data.quotation) {
          setQuotation(data.quotation);
        } else {
          setErrorMessage(data.message || "Quotation not found.");
        }
      } catch {
        setErrorMessage("Network error loading quotation request.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  async function handleStatusChange(newStatus: QuotationStatus) {
    if (!quotation) return;
    setStatusUpdating(true);
    setStatusNotice("");

    try {
      const res = await fetch(`/api/admin/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQuotation(data.quotation);
        setStatusNotice(`Status updated to ${newStatus}`);
        setTimeout(() => setStatusNotice(""), 3500);
      } else {
        setStatusNotice(data.message || "Failed to update status.");
      }
    } catch {
      setStatusNotice("Network error updating status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    setNoteNotice("");

    try {
      const res = await fetch(`/api/admin/quotations/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewNote("");
        setNoteNotice("Note attached successfully.");
        setTimeout(() => setNoteNotice(""), 3000);
        // Refresh quotation
        const reloadRes = await fetch(`/api/admin/quotations/${id}`);
        const reloadData = await reloadRes.json();
        if (reloadData.success) setQuotation(reloadData.quotation);
      } else {
        setNoteNotice(data.message || "Failed to add note.");
      }
    } catch {
      setNoteNotice("Network error adding note.");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setReplying(true);
    setReplyNotice("");

    try {
      const res = await fetch(`/api/admin/quotations/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplyMessage("");
        setReplyNotice("Reply recorded and dispatched to customer.");
        setTimeout(() => setReplyNotice(""), 4000);
        // Refresh quotation
        const reloadRes = await fetch(`/api/admin/quotations/${id}`);
        const reloadData = await reloadRes.json();
        if (reloadData.success) setQuotation(reloadData.quotation);
      } else {
        setReplyNotice(data.message || "Failed to dispatch reply.");
      }
    } catch {
      setReplyNotice("Network error sending reply.");
    } finally {
      setReplying(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title={`Request ${id}`} breadcrumbs={[{ label: "Quotations", href: "/admin" }, { label: id }]}>
        <div className="py-16 text-center text-xs text-[#64748B]">
          Loading quotation details...
        </div>
      </AdminShell>
    );
  }

  if (errorMessage || !quotation) {
    return (
      <AdminShell title="Request Not Found" breadcrumbs={[{ label: "Quotations", href: "/admin" }, { label: id }]}>
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-8 text-center text-xs text-[#B91C1C]">
          {errorMessage || "Unable to locate quotation request."}
          <div className="mt-4">
            <Link href="/admin" className="font-semibold text-[#0F9F95] hover:underline">
              Return to Pipeline Dashboard
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  // Items list
  const items = Array.isArray(quotation.items) && quotation.items.length > 0
    ? quotation.items
    : [
        {
          productCode: quotation.equipmentCode || "GEN-01",
          equipmentName: quotation.equipment,
          quantity: quotation.quantity,
          category: quotation.category,
        },
      ];

  return (
    <AdminShell
      title={`Quotation Request: ${quotation.requestId}`}
      subtitle={`Submitted on ${new Date(quotation.createdAt).toLocaleString("en-IN")}`}
      breadcrumbs={[{ label: "Quotations", href: "/admin" }, { label: quotation.requestId }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172033] hover:border-[#CBD5E1] transition-all shadow-2xs"
          >
            ← Back to Pipeline
          </Link>

          {quotation.commercialQuote && (
            <>
              <a
                href={`/api/admin/quotations/${id}/commercial/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs"
              >
                📄 View PDF
              </a>
              <a
                href={`/api/admin/quotations/${id}/commercial/pdf?download=true`}
                download={quotation.commercialQuote.pdfFilename || `Quotation-${quotation.requestId}.pdf`}
                className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs"
              >
                ⬇ Download PDF
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "commercial" ? "overview" : "commercial")}
            className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer"
          >
            {activeTab === "commercial" ? (
              <span>📋 View RFQ Overview</span>
            ) : (
              <span>⚡ {quotation.commercialQuote ? "Edit Commercial Quote" : "Prepare Quotation"}</span>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Workflow Status Selector Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-[#64748B]">
              Current Status:
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#99E2DC] bg-[#E6F7F5] px-3 py-0.5 text-xs font-bold text-[#0F9F95]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F9F95]" />
              {quotation.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-select" className="text-xs font-semibold text-[#64748B]">
              Transition Status:
            </label>
            <select
              id="status-select"
              value={quotation.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
              className="h-8.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
              {WORKFLOW_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusNotice && (
          <div className="rounded-xl border border-[#99E2DC] bg-[#E6F7F5] p-3.5 text-xs font-medium text-[#0F9F95]">
            {statusNotice}
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] space-x-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === "overview"
                ? "border-[#0F9F95] text-[#0F9F95]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            📋 Customer RFQ Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("commercial")}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "commercial"
                ? "border-[#0F9F95] text-[#0F9F95]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <span>⚡ Commercial Quotation &amp; PDF</span>
            {quotation.commercialQuote ? (
              <span className="rounded-full bg-[#E6F7F5] px-2 py-0.5 text-[10px] font-mono font-bold text-[#0F9F95] border border-[#99E2DC]">
                ₹{formatINR(quotation.commercialQuote.grandTotal)}
              </span>
            ) : (
              <span className="rounded-full bg-[#FFFBEB] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309] border border-[#FDE68A]">
                Not prepared
              </span>
            )}
          </button>
        </div>

        {activeTab === "commercial" ? (
          <CommercialQuotationBuilder
            requestId={id}
            initialQuote={quotation.commercialQuote}
            onSaved={() => {
              fetch(`/api/admin/quotations/${id}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.success && d.quotation) setQuotation(d.quotation);
                });
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Commercial Quotation Snapshot Card if prepared */}
            {quotation.commercialQuote && (
              <div className="rounded-2xl border border-[#99E2DC] bg-[#E6F7F5] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0F9F95] uppercase tracking-wider">
                      Commercial Quotation Prepared
                    </span>
                    <span className="rounded-full border border-[#99E2DC] bg-white px-2 py-0.5 text-[10px] font-bold text-[#0F9F95]">
                      {quotation.commercialQuote.status} (v{quotation.commercialQuote.version})
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#172033] flex flex-wrap items-center gap-4">
                    <span>
                      Quotation Ref: <strong className="font-mono text-[#0F9F95] font-bold">{quotation.commercialQuote.quotationNumber}</strong>
                    </span>
                    <span>
                      Items: <strong>{quotation.commercialQuote.items.length}</strong>
                    </span>
                    <span>
                      Grand Total: <strong className="font-mono text-[#15803D] font-bold text-sm">₹{formatINR(quotation.commercialQuote.grandTotal)}</strong>
                    </span>
                    <span>
                      Valid Until: <strong>{formatDateIN(quotation.commercialQuote.validUntil)}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/admin/quotations/${id}/commercial/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs"
                  >
                    📄 View PDF
                  </a>
                  <a
                    href={`/api/admin/quotations/${id}/commercial/pdf?download=true`}
                    download={quotation.commercialQuote.pdfFilename || `Quotation-${quotation.requestId}.pdf`}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs"
                  >
                    ⬇ Download
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveTab("commercial")}
                    className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs cursor-pointer"
                  >
                    Edit Proposal →
                  </button>
                </div>
              </div>
            )}

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              {/* Left Column: Customer details, Equipment Table, Reply Box */}
              <div className="space-y-6">
                {/* Customer Details Box */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold text-[#0F9F95] uppercase tracking-wider">
                    Customer & Facility Profile
                  </span>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="font-semibold text-[#64748B]">Customer Name:</span>
                      <div className="mt-0.5 font-bold text-[#172033] text-sm">
                        {quotation.customerName}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Facility / Organization:</span>
                      <div className="mt-0.5 font-medium text-[#172033]">
                        {quotation.facility || "Not specified (Direct / Clinic)"}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Email Address:</span>
                      <div className="mt-0.5">
                        <a
                          href={`mailto:${quotation.customerEmail}`}
                          className="font-medium text-[#0F9F95] hover:underline"
                        >
                          {quotation.customerEmail}
                        </a>
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Telephone:</span>
                      <div className="mt-0.5">
                        <a
                          href={`tel:${quotation.phone}`}
                          className="font-mono font-bold text-[#172033] hover:text-[#0F9F95] transition-colors"
                        >
                          {quotation.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {quotation.message && (
                    <div className="mt-4 border-t border-[#F1F5F9] pt-3 text-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                        Customer Requirement Note:
                      </span>
                      <p className="mt-1 leading-relaxed text-[#172033] whitespace-pre-wrap">
                        {quotation.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Requested Equipment List */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <span className="text-xs font-bold text-[#0F9F95] uppercase tracking-wider">
                      Equipment Specifications Requested
                    </span>
                    <span className="text-xs font-medium text-[#64748B]">
                      Total Units: <strong className="text-[#172033] font-bold">{quotation.quantity}</strong>
                    </span>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3">Equipment Profile</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#0F9F95]">
                              {it.productCode || `ITM-${idx + 1}`}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#172033]">
                              {it.equipmentName}
                            </td>
                            <td className="py-2.5 px-3 text-[#64748B]">
                              {it.category || quotation.category || "General"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                              {it.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Reply Dispatch & History */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold text-[#0F9F95] uppercase tracking-wider">
                    Commercial Reply & Quotation Communication
                  </span>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Send formal quotation details to customer at <strong className="text-[#172033]">{quotation.customerEmail}</strong>. Records communication in history.
                  </p>

                  <form onSubmit={handleSendReply} className="mt-4 space-y-3">
                    <textarea
                      rows={4}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Enter quotation particulars, unit prices, delivery terms, and warranty schedule..."
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                    />

                    {replyNotice && (
                      <div className="rounded-xl border border-[#99E2DC] bg-[#E6F7F5] p-3 text-xs font-semibold text-[#0F9F95]">
                        {replyNotice}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={replying || !replyMessage.trim()}
                      className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {replying ? "Dispatching Reply..." : "Send Reply"}
                    </button>
                  </form>

                  {/* Reply History */}
                  {Array.isArray(quotation.replyHistory) && quotation.replyHistory.length > 0 && (
                    <div className="mt-6 border-t border-[#F1F5F9] pt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                        Sent Reply History ({quotation.replyHistory.length})
                      </span>
                      <div className="mt-3 space-y-3">
                        {quotation.replyHistory.map((rep, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                              <span>By: <strong className="text-[#172033]">{rep.sentBy}</strong></span>
                              <span>{new Date(rep.sentAt).toLocaleString("en-IN")}</span>
                            </div>
                            <p className="mt-2 text-[#172033] whitespace-pre-wrap leading-relaxed font-medium">
                              {rep.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Internal Admin Notes & Activity History Timeline */}
              <div className="space-y-6">
                {/* Internal Admin Notes */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider">
                    Internal Admin Notes
                  </span>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Internal team memos, procurement remarks, and price negotiations. Not visible to customers.
                  </p>

                  <form onSubmit={handleAddNote} className="mt-3.5 space-y-2">
                    <textarea
                      rows={2}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="e.g. Spoke with Dr. Sharma. Needs 2-year AMC quote. Follow up Friday."
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#B45309] focus:bg-white focus:outline-none transition-colors"
                    />

                    {noteNotice && (
                      <div className="text-xs font-semibold text-[#15803D]">{noteNotice}</div>
                    )}

                    <button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                      className="rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#B45309] hover:text-[#B45309] transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {addingNote ? "Saving..." : "Attach Note"}
                    </button>
                  </form>

                  {/* Notes List */}
                  <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto">
                    {Array.isArray(quotation.notes) && quotation.notes.length > 0 ? (
                      quotation.notes.map((n) => (
                        <div
                          key={n.id}
                          className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                            <span className="font-bold text-[#172033]">{n.createdBy}</span>
                            <span>{new Date(n.createdAt).toLocaleDateString("en-IN")}</span>
                          </div>
                          <p className="mt-1.5 text-[#172033] whitespace-pre-wrap font-medium">{n.note}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#94A3B8] italic">No internal notes attached yet.</p>
                    )}
                  </div>
                </div>

                {/* Activity History Audit Trail */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold text-[#0F9F95] uppercase tracking-wider">
                    Activity & Audit History
                  </span>

                  <div className="mt-4 space-y-4">
                    {Array.isArray(quotation.timeline) && quotation.timeline.length > 0 ? (
                      quotation.timeline.map((event, idx) => (
                        <div key={idx} className="relative pl-5 text-xs border-l-2 border-[#E2E8F0] ml-1">
                          <div className="absolute -left-1.5 top-1 h-2.5 w-2.5 rounded-full bg-[#0F9F95] ring-2 ring-white" />
                          <div className="flex items-baseline justify-between">
                            <span className="font-bold text-[#172033]">{event.action}</span>
                            <span className="font-mono text-[11px] text-[#64748B]">
                              {new Date(event.timestamp).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {event.note && (
                            <p className="mt-0.5 text-[#64748B]">{event.note}</p>
                          )}
                          <div className="mt-1 text-[11px] text-[#94A3B8]">
                            By: {event.performedBy} • {new Date(event.timestamp).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#64748B]">
                        <div>Request Created: {new Date(quotation.createdAt).toLocaleString("en-IN")}</div>
                        {quotation.repliedAt && (
                          <div className="mt-1">
                            Quotation Sent: {new Date(quotation.repliedAt).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
