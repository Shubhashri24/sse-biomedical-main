"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";
import type { QuotationRequestDoc, QuotationStatus } from "@/lib/mongodb";

interface AnalyticsPayload {
  kpis: {
    totalQuotations: number;
    newRequests: number;
    contacted: number;
    quotationsSent: number;
    closed: number;
    totalProducts: number;
    totalCustomers: number;
    totalMessages: number;
    totalStockUnits?: number;
    reservedStockUnits?: number;
    lowStockCount?: number;
    outOfStockCount?: number;
    activeSuppliers?: number;
    openServiceTickets?: number;
    criticalTicketsCount?: number;
    pendingInstallationsCount?: number;
  };
  inventory?: {
    totalStockUnits: number;
    reservedStockUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockAlerts: Array<{
      productCode: string;
      name: string;
      categoryName: string;
      availableQuantity: number;
      stockQuantity: number;
      reorderLevel: number;
      stockStatus: "OUT_OF_STOCK" | "LOW_STOCK";
    }>;
  };
  service?: {
    overview: Record<string, number>;
    criticalTickets: Array<{
      ticketId: string;
      equipmentName: string;
      productCode: string;
      issueTitle: string;
      customerName: string;
      priority: string;
      status: string;
      createdAt: string | Date;
    }>;
    pendingInstallationsCount: number;
  };
  statusDistribution: Array<{ status: string; count: number }>;
  topEquipment: Array<{ name: string; count: number }>;
  categoryBreakdown: Array<{ name: string; count: number }>;
  timeline: Array<{ period: string; count: number }>;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<QuotationRequestDoc[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsPayload | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const [quotesRes, analyticsRes] = await Promise.all([
          fetch(`/api/admin/quotations?${new URLSearchParams({
            search: search.trim(),
            ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
          }).toString()}`),
          fetch("/api/admin/analytics"),
        ]);

        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          if (!isCancelled && quotesData.success) {
            setQuotations(quotesData.quotations || []);
          }
        }

        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          if (!isCancelled && aData.success) {
            setAnalyticsData(aData);
          }
        }
      } catch (err) {
        console.error("Failed to load admin dashboard data:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [search, statusFilter]);

  function getStatusBadge(status: QuotationStatus) {
    switch (status) {
      case "NEW":
        return (
          <span className="inline-flex items-center rounded-full border border-[#99E2DC] bg-[#E6F7F5] px-2.5 py-0.5 text-[11px] font-bold text-[#0F9F95]">
            ● New
          </span>
        );
      case "REVIEWING":
        return (
          <span className="inline-flex items-center rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[11px] font-bold text-[#0369A1]">
            Reviewing
          </span>
        );
      case "CONTACTED":
        return (
          <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">
            Contacted
          </span>
        );
      case "QUOTATION_PREPARATION":
        return (
          <span className="inline-flex items-center rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-bold text-[#4338CA]">
            Preparing
          </span>
        );
      case "QUOTATION_SENT":
        return (
          <span className="inline-flex items-center rounded-full border border-[#E9D5FF] bg-[#FAF5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#7E22CE]">
            Sent
          </span>
        );
      case "NEGOTIATION":
        return (
          <span className="inline-flex items-center rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-2.5 py-0.5 text-[11px] font-bold text-[#C2410C]">
            Negotiation
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]">
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-bold text-[#B91C1C]">
            Rejected
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] font-bold text-[#64748B]">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-medium text-[#64748B]">
            {status}
          </span>
        );
    }
  }

  return (
    <AdminShell
      title="Commercial & Technical Operations"
      subtitle="Overview of quotation pipeline, customer demand, and active equipment"
      breadcrumbs={[{ label: "Overview" }]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/new"
            className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs hover:shadow"
          >
            + Add Product
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* KPI & Analytics Charts */}
        {analyticsData && <AdminAnalyticsCharts data={analyticsData} />}

        {/* Quotation Pipeline Section */}
        <div id="quotations" className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">
                Quotation Requests Pipeline
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Showing {quotations.length} records matching current filter
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, customer, facility..."
                className="h-8.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUOTATION_PREPARATION">Quotation Preparation</option>
                <option value="QUOTATION_SENT">Quotation Sent</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CLOSED">Closed</option>
              </select>

              {(search || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="text-xs font-semibold text-[#0F9F95] hover:underline px-1.5 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                Loading quotation requests...
              </div>
            ) : quotations.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#64748B]">
                No quotation requests found. Try resetting search filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Customer & Facility</th>
                    <th className="py-3 px-4">Equipment Items</th>
                    <th className="py-3 px-4">Units</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {quotations.map((q) => {
                    const itemsSummary =
                      Array.isArray(q.items) && q.items.length > 0
                        ? q.items.map((it) => `${it.productCode || it.equipmentName} (${it.quantity})`).join(", ")
                        : q.equipment;

                    return (
                      <tr key={q.requestId} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0F9F95]">
                          {q.requestId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#172033]">{q.customerName}</div>
                          <div className="text-[11px] text-[#64748B]">{q.facility || q.phone}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[#64748B] font-medium">
                          {itemsSummary}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                          {q.quantity}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(q.status)}</td>
                        <td className="py-3 px-4 text-[11px] text-[#64748B]">
                          {new Date(q.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/requests/${q.requestId}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs"
                          >
                            Process →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
