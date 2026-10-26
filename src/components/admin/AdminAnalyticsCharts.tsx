"use client";

import React from "react";
import Link from "next/link";

interface AnalyticsData {
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

export default function AdminAnalyticsCharts({ data }: { data: AnalyticsData }) {
  const { kpis, topEquipment, timeline, inventory, service } = data;

  const maxTimeline = Math.max(...timeline.map((t) => t.count), 5);
  const maxEquipment = Math.max(...topEquipment.map((e) => e.count), 5);

  const lowStockList = inventory?.lowStockAlerts || [];
  const criticalList = service?.criticalTickets || [];
  const serviceOverview = service?.overview || {};

  return (
    <div className="space-y-6">
      {/* 1. Primary Commercial & Quotation Pipeline Strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
            Commercial & RFQ Pipeline
          </span>
          <Link href="/admin#quotations" className="text-xs font-semibold text-[#0F9F95] hover:underline">
            View All Quotes →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">
                Total Quotations
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-[#172033]">
              {kpis.totalQuotations}
            </div>
          </div>

          <div className="rounded-xl border border-[#99E2DC] bg-[#E6F7F5] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F9F95]">
                New RFQs
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#0F9F95] shadow-2xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0F9F95]">
              {kpis.newRequests}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">
                Quotes Prepared
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-[#172033]">
              {kpis.quotationsSent}
            </div>
          </div>

          <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15803D]">
                Closed / Approved
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#15803D] shadow-2xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-[#15803D]">
              {kpis.closed}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">
                Hospital Accounts
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-[#172033]">
              {kpis.totalCustomers}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operations, Inventory & Service Strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
            Inventory & Field Engineering Operations
          </span>
          <div className="flex gap-4 text-xs font-semibold">
            <Link href="/admin/inventory" className="text-[#0F9F95] hover:underline">
              Inventory Ledger →
            </Link>
            <Link href="/admin/service" className="text-[#0F9F95] hover:underline">
              Service Desk →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <span className="text-xs font-medium text-[#64748B]">
              Total Stock Units
            </span>
            <div className="mt-1 text-xl font-bold text-[#172033]">
              {kpis.totalStockUnits ?? "—"}
            </div>
          </div>

          <div className={`rounded-xl border p-3.5 shadow-2xs ${
            (kpis.lowStockCount ?? 0) > 0 ? "border-[#FDE68A] bg-[#FFFBEB]" : "border-[#E2E8F0] bg-white"
          }`}>
            <span className="text-xs font-medium text-[#B45309]">
              Low Stock Alerts
            </span>
            <div className="mt-1 text-xl font-bold text-[#B45309]">
              {kpis.lowStockCount ?? 0}
            </div>
          </div>

          <div className={`rounded-xl border p-3.5 shadow-2xs ${
            (kpis.outOfStockCount ?? 0) > 0 ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#E2E8F0] bg-white"
          }`}>
            <span className="text-xs font-medium text-[#B91C1C]">
              Out of Stock
            </span>
            <div className="mt-1 text-xl font-bold text-[#B91C1C]">
              {kpis.outOfStockCount ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <span className="text-xs font-medium text-[#64748B]">
              Active Suppliers
            </span>
            <div className="mt-1 text-xl font-bold text-[#172033]">
              {kpis.activeSuppliers ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-3.5 shadow-2xs">
            <span className="text-xs font-medium text-[#0369A1]">
              Open Tickets
            </span>
            <div className="mt-1 text-xl font-bold text-[#0369A1]">
              {kpis.openServiceTickets ?? 0}
            </div>
          </div>

          <div className={`rounded-xl border p-3.5 shadow-2xs ${
            (kpis.criticalTicketsCount ?? 0) > 0 ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#E2E8F0] bg-white"
          }`}>
            <span className="text-xs font-medium text-[#B91C1C]">
              Critical Emergency
            </span>
            <div className="mt-1 text-xl font-bold text-[#B91C1C]">
              {kpis.criticalTicketsCount ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <span className="text-xs font-medium text-[#64748B]">
              Pending Install
            </span>
            <div className="mt-1 text-xl font-bold text-[#172033]">
              {kpis.pendingInstallationsCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Sections: Low Stock Alerts & Critical Service Tickets */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <span className="text-xs font-bold text-[#B45309]">
                Replenishment Reorder Alerts
              </span>
              <h3 className="text-sm font-bold text-[#172033] mt-0.5">
                Low Stock & Depleted Equipment
              </h3>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs font-semibold text-[#0F9F95] hover:underline"
            >
              Manage Stock →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#F1F5F9]">
            {lowStockList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] flex flex-col items-center justify-center">
                <span className="text-[#15803D] font-semibold flex items-center gap-1.5">
                  ✓ All catalog equipment units are above reorder thresholds.
                </span>
                <span className="text-[11px] text-[#94A3B8] mt-1">Inventory levels healthy</span>
              </div>
            ) : (
              lowStockList.map((item) => (
                <div key={item.productCode} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0F9F95]">{item.productCode}</span>
                      <span className="font-bold text-[#172033]">{item.name}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      {item.categoryName} • Threshold: {item.reorderLevel} units
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#172033]">
                      Avail: {item.availableQuantity}
                    </span>
                    {item.stockStatus === "OUT_OF_STOCK" ? (
                      <span className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#B91C1C]">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
                        Low Stock
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Service Tickets */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <span className="text-xs font-bold text-[#B91C1C]">
                Immediate Action Required
              </span>
              <h3 className="text-sm font-bold text-[#172033] mt-0.5">
                Critical Emergency Service Tickets
              </h3>
            </div>
            <Link
              href="/admin/service"
              className="text-xs font-semibold text-[#0F9F95] hover:underline"
            >
              Open Service Desk →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#F1F5F9]">
            {criticalList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] flex flex-col items-center justify-center">
                <span className="text-[#15803D] font-semibold flex items-center gap-1.5">
                  ✓ No open emergency or critical severity tickets recorded.
                </span>
                <span className="text-[11px] text-[#94A3B8] mt-1">Field operations running smoothly</span>
              </div>
            ) : (
              criticalList.map((t) => (
                <div key={t.ticketId} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0F9F95]">{t.ticketId}</span>
                      <span className="font-bold text-[#172033] truncate max-w-[200px]">
                        {t.equipmentName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] truncate max-w-[240px] mt-0.5">
                      {t.issueTitle} • {t.customerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#B91C1C]">
                      Critical
                    </span>
                    <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#172033]">
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Service Workflow Status Pipeline */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-4">
          <span className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
            Biomedical Service Workflow Pipeline
          </span>
          <Link href="/admin/service" className="text-xs font-semibold text-[#0F9F95] hover:underline">
            Manage Service Tickets →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-center">
            <div className="text-xs text-[#B45309] font-bold">Open</div>
            <div className="font-mono text-lg font-bold text-[#B45309] mt-1">{serviceOverview.OPEN || 0}</div>
          </div>
          <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-3 text-center">
            <div className="text-xs text-[#0369A1] font-bold">Assigned</div>
            <div className="font-mono text-lg font-bold text-[#0369A1] mt-1">{serviceOverview.ASSIGNED || 0}</div>
          </div>
          <div className="rounded-xl border border-[#99E2DC] bg-[#E6F7F5] p-3 text-center">
            <div className="text-xs text-[#0F9F95] font-bold">In Progress</div>
            <div className="font-mono text-lg font-bold text-[#0F9F95] mt-1">{serviceOverview.IN_PROGRESS || 0}</div>
          </div>
          <div className="rounded-xl border border-[#E9D5FF] bg-[#FAF5FF] p-3 text-center">
            <div className="text-xs text-[#7E22CE] font-bold">Waiting Parts</div>
            <div className="font-mono text-lg font-bold text-[#7E22CE] mt-1">{serviceOverview.WAITING_FOR_PARTS || 0}</div>
          </div>
          <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-center">
            <div className="text-xs text-[#15803D] font-bold">Resolved</div>
            <div className="font-mono text-lg font-bold text-[#15803D] mt-1">{serviceOverview.RESOLVED || 0}</div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-center">
            <div className="text-xs text-[#64748B] font-bold">Closed</div>
            <div className="font-mono text-lg font-bold text-[#172033] mt-1">{serviceOverview.CLOSED || 0}</div>
          </div>
        </div>
      </div>

      {/* 5. Demand & Monthly Trend Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Trend Analysis */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-4">
            <div>
              <span className="text-xs font-bold text-[#0F9F95]">
                Trend Analysis
              </span>
              <h3 className="text-sm font-bold text-[#172033] mt-0.5">
                Quotation Inquiries Over Time
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Last 6 Months</span>
          </div>

          <div className="flex h-40 items-end justify-between gap-3 pt-4">
            {timeline.map((point) => {
              const heightPercent = maxTimeline > 0 ? (point.count / maxTimeline) * 100 : 0;
              return (
                <div key={point.period} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[11px] font-bold text-[#172033]">
                    {point.count}
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-[#0F9F95] transition-all hover:bg-[#0B827B] shadow-2xs"
                    style={{ height: `${Math.max(6, heightPercent)}%` }}
                  />
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {point.period}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Requested Equipment */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-4">
            <div>
              <span className="text-xs font-bold text-[#0F9F95]">
                Demand Metrics
              </span>
              <h3 className="text-sm font-bold text-[#172033] mt-0.5">
                Top Requested Biomedical Equipment
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">By RFQ Volume</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {topEquipment.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No equipment quotation requests logged yet.
              </div>
            ) : (
              topEquipment.map((item) => {
                const widthPercent = maxEquipment > 0 ? (item.count / maxEquipment) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2 text-[#172033] font-semibold max-w-[260px]">
                        {item.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#0F9F95]">
                        {item.count} {item.count === 1 ? "unit" : "units"}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EDF2F7] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0F9F95]"
                        style={{ width: `${Math.max(4, widthPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
