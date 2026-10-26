"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import type { CustomerSummary } from "@/app/api/admin/customers/route";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/admin/customers?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setCustomers(data.customers || []);
          }
        }
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <AdminShell
      title="Healthcare Customer & Hospital Directory"
      subtitle="Aggregated contact profiles derived from quotation inquiries and facility requests"
      breadcrumbs={[{ label: "Customers" }]}
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
          <div className="text-xs text-slate-600">
            Total Recognized Client Accounts: <strong className="text-slate-900 font-bold">{customers.length}</strong>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, facility, phone..."
                className="h-8 w-72 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Customer History Drawer / Modal */}
        {selectedCustomer && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                  Customer Profile & Engagement Log
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCustomer.name}
                </h2>
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
                  <span>Email: <strong className="text-slate-900 font-medium">{selectedCustomer.email}</strong></span>
                  <span>Phone: <strong className="text-slate-900 font-mono font-medium">{selectedCustomer.phone}</strong></span>
                  {selectedCustomer.facility && (
                    <span>Facility: <strong className="text-slate-900 font-medium">{selectedCustomer.facility}</strong></span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Quotation Request History ({selectedCustomer.quotations.length})
              </span>
              <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40">
                {selectedCustomer.quotations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No formal quotation records found (Contact form inquiry only).
                  </div>
                ) : (
                  selectedCustomer.quotations.map((q) => (
                    <div key={q.requestId} className="flex items-center justify-between p-3.5 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#0B827B]">
                            {q.requestId}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {q.equipment}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Units: <strong className="text-slate-700 font-medium">{q.quantity}</strong> • Logged on {new Date(q.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                          {q.status}
                        </span>
                        <Link
                          href={`/admin/requests/${q.requestId}`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#0B827B] hover:border-teal-300 hover:bg-teal-50 transition-colors shadow-2xs"
                        >
                          View Request →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <span>Loading customer profiles...</span>
                </div>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">No Customer Accounts Found</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Customer records will automatically populate when healthcare facilities submit quotation requests or contact inquiries.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Customer Name</th>
                    <th className="py-3 px-3.5">Contact Details</th>
                    <th className="py-3 px-3.5">Hospital / Facility</th>
                    <th className="py-3 px-3.5">Quotations</th>
                    <th className="py-3 px-3.5">Latest Reference</th>
                    <th className="py-3 px-3.5">Last Activity</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.email} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-semibold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="text-slate-800 font-medium">{c.email}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{c.phone}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {c.facility || "Direct Procurement"}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {c.totalQuotations}
                      </td>
                      <td className="py-3 px-3.5">
                        {c.latestRequestId ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-[#0B827B] font-semibold">{c.latestRequestId}</span>
                            <span className="text-[11px] text-slate-500 font-sans">({c.latestStatus})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(c.lastActivity).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                        >
                          View History
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
