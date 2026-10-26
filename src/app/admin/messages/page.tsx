"use client";

import React, { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import type { ContactMessageDoc, ContactMessageStatus } from "@/lib/mongodb";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, new: 0, read: 0, responded: 0, closed: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeMessage, setActiveMessage] = useState<ContactMessageDoc | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "ALL") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/messages?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setMessages(data.messages || []);
            if (data.counts) setCounts(data.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter]);

  async function handleUpdateStatus(msg: ContactMessageDoc, newStatus: ContactMessageStatus) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/messages/${msg._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, status: newStatus } : m))
        );
        if (activeMessage && activeMessage._id === msg._id) {
          setActiveMessage({ ...activeMessage, status: newStatus });
        }
      } else {
        alert(data.message || "Failed to update message status");
      }
    } catch {
      alert("Network error updating message");
    } finally {
      setUpdating(false);
    }
  }

  function getStatusBadge(status: ContactMessageStatus) {
    switch (status) {
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F9F95]" />
            New
          </span>
        );
      case "READ":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
            Read
          </span>
        );
      case "RESPONDED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Responded
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            Closed
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  }

  return (
    <AdminShell
      title="Clinical Inquiries & Communications"
      subtitle="Direct communications and queries submitted via website contact form"
      breadcrumbs={[{ label: "Enquiries" }]}
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">
              Total Enquiries
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {counts.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">All received messages</div>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-2xs">
            <div className="text-xs font-semibold text-teal-800">
              New Messages
            </div>
            <div className="mt-1.5 text-2xl font-bold text-[#0B827B]">
              {counts.new}
            </div>
            <div className="mt-1 text-[11px] text-teal-700/80">Awaiting clinical review</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
            <div className="text-xs font-semibold text-emerald-800">
              Responded
            </div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-700">
              {counts.responded}
            </div>
            <div className="mt-1 text-[11px] text-emerald-700/80">Follow-up dispatched</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">
              Closed
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-400">
              {counts.closed}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Archived enquiries</div>
          </div>
        </div>

        {/* Message Viewer Drawer / Modal */}
        {activeMessage && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                  Clinical Enquiry Particulars
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeMessage.subject || "General Inquiry"}
                </h2>
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
                  <span>From: <strong className="text-slate-900 font-medium">{activeMessage.name}</strong></span>
                  <span>Email: <a href={`mailto:${activeMessage.email}`} className="text-[#0B827B] hover:underline font-medium">{activeMessage.email}</a></span>
                  {activeMessage.phone && (
                    <span>Phone: <a href={`tel:${activeMessage.phone}`} className="font-mono text-slate-900 font-medium hover:text-[#0B827B]">{activeMessage.phone}</a></span>
                  )}
                  <span>Received: {new Date(activeMessage.createdAt).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeMessage.status}
                  disabled={updating}
                  onChange={(e) => handleUpdateStatus(activeMessage, e.target.value as ContactMessageStatus)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 font-medium focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="NEW">NEW</option>
                  <option value="READ">READ</option>
                  <option value="RESPONDED">RESPONDED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
                <button
                  type="button"
                  onClick={() => setActiveMessage(null)}
                  className="rounded-lg p-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
              {activeMessage.message}
            </div>
          </div>
        )}

        {/* Search & Status Filter */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-600">
              Showing <strong className="text-slate-900 font-bold">{messages.length}</strong> enquiries
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sender, email, subject..."
                className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="READ">READ</option>
                <option value="RESPONDED">RESPONDED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              {(search || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline px-1 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <span>Loading messages...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">No General Inquiries Found</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Communications sent through the public website contact form will appear in this inbox.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Sender</th>
                    <th className="py-3 px-3.5">Subject</th>
                    <th className="py-3 px-3.5">Message Snippet</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Received</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {messages.map((m) => (
                    <tr key={String(m._id)} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-500">{m.email}</div>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800 max-w-[180px] truncate">
                        {m.subject || "General Inquiry"}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs truncate text-slate-500">
                        {m.message}
                      </td>
                      <td className="py-3 px-3.5">{getStatusBadge(m.status)}</td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(m.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMessage(m);
                            if (m.status === "NEW") {
                              handleUpdateStatus(m, "READ");
                            }
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
