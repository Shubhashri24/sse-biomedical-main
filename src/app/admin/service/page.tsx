"use client";

import React, { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import type {
  ServiceTicketDoc,
  ServiceTicketPriority,
  ServiceTicketStatus,
  InstallationStatus,
  ProductDoc,
  TechnicianDoc,
} from "@/lib/mongodb";

export default function AdminServicePage() {
  const [tickets, setTickets] = useState<ServiceTicketDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    inProgress: 0,
    waitingForParts: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
    pendingInstallation: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [installationFilter, setInstallationFilter] = useState(false);

  // Metadata dropdowns
  const [allProducts, setAllProducts] = useState<ProductDoc[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<TechnicianDoc[]>([]);

  // Create Ticket Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    facility: "",
    productCode: "",
    equipmentName: "",
    serialNumber: "",
    issueTitle: "",
    issueDescription: "",
    priority: "MEDIUM" as ServiceTicketPriority,
    status: "OPEN" as ServiceTicketStatus,
    assignedTechnicianId: "",
    assignedTechnicianName: "",
    scheduledDate: "",
    installationRequired: false,
    installationDate: "",
    installationTechnician: "",
    installationNotes: "",
    installationStatus: "PENDING" as InstallationStatus,
  });
  const [createError, setCreateError] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Workflow / Edit Modal
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicketDoc | null>(null);
  const [editFormData, setEditFormData] = useState({
    status: "OPEN" as ServiceTicketStatus,
    priority: "MEDIUM" as ServiceTicketPriority,
    assignedTechnicianId: "",
    assignedTechnicianName: "",
    scheduledDate: "",
    completedDate: "",
    serialNumber: "",
    diagnosis: "",
    resolution: "",
    partsUsed: "",
    installationRequired: false,
    installationStatus: "PENDING" as InstallationStatus,
    installationTechnician: "",
    installationNotes: "",
  });
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [editError, setEditError] = useState("");

  // Equipment History Modal
  const [historyTarget, setHistoryTarget] = useState<{
    equipmentName: string;
    productCode: string;
    serialNumber: string;
  } | null>(null);
  const [historyTickets, setHistoryTickets] = useState<ServiceTicketDoc[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchTickets() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
        if (installationFilter) params.set("installation", "true");

        const res = await fetch(`/api/admin/service?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setTickets(data.tickets || []);
            if (data.counts) setCounts(data.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load service tickets:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTickets();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, priorityFilter, installationFilter, reloadTrigger]);

  // Load auxiliary data for dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        const [prodRes, techRes] = await Promise.all([
          fetch("/api/admin/products"),
          fetch("/api/admin/technicians?status=active"),
        ]);
        if (prodRes.ok) {
          const pData = await prodRes.json();
          if (pData.success) setAllProducts(pData.products || []);
        }
        if (techRes.ok) {
          const tData = await techRes.json();
          if (tData.success) setAllTechnicians(tData.technicians || []);
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  const openCreateModal = () => {
    setCreateFormData({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      facility: "",
      productCode: allProducts[0]?.productCode || "",
      equipmentName: allProducts[0]?.name || "",
      serialNumber: "",
      issueTitle: "",
      issueDescription: "",
      priority: "MEDIUM",
      status: "OPEN",
      assignedTechnicianId: "",
      assignedTechnicianName: "",
      scheduledDate: "",
      installationRequired: false,
      installationDate: "",
      installationTechnician: "",
      installationNotes: "",
      installationStatus: "PENDING",
    });
    setCreateError("");
    setIsCreateOpen(true);
  };

  const handleProductSelection = (code: string) => {
    const found = allProducts.find((p) => p.productCode === code);
    setCreateFormData((prev) => ({
      ...prev,
      productCode: code,
      equipmentName: found ? found.name : prev.equipmentName,
    }));
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.customerName.trim() || !createFormData.customerPhone.trim() || !createFormData.issueTitle.trim()) {
      setCreateError("Customer name, phone number, and issue summary are required.");
      return;
    }

    setCreatingTicket(true);
    setCreateError("");

    try {
      const res = await fetch("/api/admin/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.message || "Failed to create service ticket.");
        setCreatingTicket(false);
        return;
      }

      showToast(`Service ticket ${data.ticket?.ticketId || "created"} logged successfully.`);
      setIsCreateOpen(false);
      setReloadTrigger((v) => v + 1);
    } catch {
      setCreateError("Network error submitting service ticket.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const openWorkflowModal = (ticket: ServiceTicketDoc) => {
    setSelectedTicket(ticket);
    setEditFormData({
      status: ticket.status,
      priority: ticket.priority,
      assignedTechnicianId: ticket.assignedTechnicianId || "",
      assignedTechnicianName: ticket.assignedTechnicianName || "",
      scheduledDate: ticket.scheduledDate ? new Date(ticket.scheduledDate).toISOString().slice(0, 10) : "",
      completedDate: ticket.completedDate ? new Date(ticket.completedDate).toISOString().slice(0, 10) : "",
      serialNumber: ticket.serialNumber || "",
      diagnosis: ticket.diagnosis || "",
      resolution: ticket.resolution || "",
      partsUsed: ticket.partsUsed || "",
      installationRequired: Boolean(ticket.installationRequired),
      installationStatus: ticket.installationStatus || "PENDING",
      installationTechnician: ticket.installationTechnician || "",
      installationNotes: ticket.installationNotes || "",
    });
    setEditError("");
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    setEditError("");

    try {
      const res = await fetch(`/api/admin/service/${selectedTicket.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEditError(data.message || "Failed to update service ticket.");
        setUpdatingTicket(false);
        return;
      }

      showToast(`Service ticket ${selectedTicket.ticketId} updated successfully.`);
      setSelectedTicket(null);
      setReloadTrigger((v) => v + 1);
    } catch {
      setEditError("Network error updating service ticket.");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const openEquipmentHistoryModal = async (ticket: ServiceTicketDoc) => {
    setHistoryTarget({
      equipmentName: ticket.equipmentName,
      productCode: ticket.productCode,
      serialNumber: ticket.serialNumber || "",
    });
    setHistoryTickets([]);
    setLoadingHistory(true);

    try {
      const params = new URLSearchParams();
      if (ticket.serialNumber && ticket.serialNumber !== "SN-PENDING") {
        params.set("serialNumber", ticket.serialNumber);
      } else {
        params.set("productCode", ticket.productCode);
      }

      const res = await fetch(`/api/admin/service?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistoryTickets(data.tickets || []);
        }
      }
    } catch (err) {
      console.error("Failed to load equipment history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getPriorityBadge = (priority: ServiceTicketPriority) => {
    switch (priority) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
            Critical
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            Medium
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ServiceTicketStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            Open
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
            Assigned
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
            In Progress
          </span>
        );
      case "WAITING_FOR_PARTS":
        return (
          <span className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
            Waiting Parts
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            Resolved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminShell
      title="Biomedical Service & Maintenance Management"
      subtitle="Corrective service tickets, scheduled preventive maintenance, and equipment installations"
      breadcrumbs={[{ label: "Service" }]}
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Raise Service Ticket
        </button>
      }
    >
      <div className="space-y-6">
        {toastMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 shadow-xs flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toastMessage}
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">
              Total Logged Tickets
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {counts.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">All lifecycle stages</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs">
            <span className="text-xs font-semibold text-amber-800">
              Open / Assigned
            </span>
            <div className="mt-1 text-2xl font-bold text-amber-900">
              {counts.open + counts.assigned}
            </div>
            <div className="mt-1 text-[11px] text-amber-700/80">Awaiting engineer action</div>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-2xs">
            <span className="text-xs font-semibold text-teal-800">
              In Field Repair
            </span>
            <div className="mt-1 text-2xl font-bold text-[#0B827B]">
              {counts.inProgress + counts.waitingForParts}
            </div>
            <div className="mt-1 text-[11px] text-teal-700/80">Active field calibration</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-2xs">
            <span className="text-xs font-semibold text-rose-800">
              Critical Emergency
            </span>
            <div className="mt-1 text-2xl font-bold text-rose-700">
              {counts.critical}
            </div>
            <div className="mt-1 text-[11px] text-rose-700/80">ICU / OT high urgency</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
            <span className="text-xs font-semibold text-emerald-800">
              Resolved & Closed
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {counts.resolved + counts.closed}
            </div>
            <div className="mt-1 text-[11px] text-emerald-700/80">Completed maintenance</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center shadow-2xs">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket ID (SR-0001), equipment, serial number, hospital, or issue..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <button
              type="button"
              onClick={() => setInstallationFilter(!installationFilter)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                installationFilter
                  ? "border-teal-300 bg-teal-50 text-teal-800 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Installations Only ({counts.pendingInstallation})
            </button>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-3">Ticket ID</th>
                  <th className="px-3.5 py-3">Hospital / Facility</th>
                  <th className="px-3.5 py-3">Equipment & Serial No.</th>
                  <th className="px-3.5 py-3">Issue Summary</th>
                  <th className="px-3.5 py-3">Priority</th>
                  <th className="px-3.5 py-3">Workflow Status</th>
                  <th className="px-3.5 py-3">Assigned Engineer</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                        <span>Loading service requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 text-sm font-semibold text-slate-800">No Service Tickets Found</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {search || statusFilter !== "ALL" || priorityFilter !== "ALL" || installationFilter
                            ? "No tickets match the active search or filter criteria. Try adjusting your filters."
                            : "No active service tickets in the database. Raise a new service ticket to dispatch an engineer."}
                        </p>
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors"
                        >
                          + Raise Service Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.ticketId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs font-semibold text-[#0B827B]">
                        {t.ticketId}
                        {t.installationRequired && (
                          <div className="text-[10px] font-sans font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.2 mt-0.5 inline-block">
                            INSTALLATION
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900">
                          {t.facility || t.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.customerName} • {t.customerPhone}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-medium text-slate-800">{t.equipmentName}</div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 mt-0.5">
                          <span className="text-teal-700 font-semibold">{t.productCode}</span>
                          <span>•</span>
                          <span>SN: {t.serialNumber || "—"}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 max-w-xs">
                        <div className="truncate font-medium text-slate-800">{t.issueTitle}</div>
                        {t.issueDescription && (
                          <div className="truncate text-[11px] text-slate-500 mt-0.5">
                            {t.issueDescription}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {t.assignedTechnicianName ? (
                          <div className="text-slate-800">
                            <span className="font-medium">{t.assignedTechnicianName}</span>
                            {t.scheduledDate && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Sched: {new Date(t.scheduledDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openWorkflowModal(t)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-2xs"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => openEquipmentHistoryModal(t)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Service Ticket Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                    Log Service Request / Commissioning
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Biomedical Equipment Corrective Ticket
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {createError && (
                <div className="my-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="mt-4 space-y-4 text-xs">
                {/* Hospital / Customer details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-3">
                    Hospital / Customer Information
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Hospital / Clinic Name
                      </label>
                      <input
                        type="text"
                        value={createFormData.facility}
                        onChange={(e) => setCreateFormData({ ...createFormData, facility: e.target.value })}
                        placeholder="e.g. Apex Multispeciality Hospital"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        value={createFormData.customerName}
                        onChange={(e) => setCreateFormData({ ...createFormData, customerName: e.target.value })}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="text"
                        value={createFormData.customerPhone}
                        onChange={(e) => setCreateFormData({ ...createFormData, customerPhone: e.target.value })}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={createFormData.customerEmail}
                        onChange={(e) => setCreateFormData({ ...createFormData, customerEmail: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Equipment details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-3">
                    Equipment Identification & Serial Number
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Equipment Model *
                      </label>
                      <select
                        value={createFormData.productCode}
                        onChange={(e) => handleProductSelection(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      >
                        {allProducts.map((p) => (
                          <option key={p.productCode} value={p.productCode}>
                            {p.productCode} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Unit Serial Number (SN) *
                      </label>
                      <input
                        type="text"
                        value={createFormData.serialNumber}
                        onChange={(e) => setCreateFormData({ ...createFormData, serialNumber: e.target.value })}
                        placeholder="e.g. SN-BPL-2026-901"
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Issue Details & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Issue Summary / Complaint *
                    </label>
                    <input
                      type="text"
                      value={createFormData.issueTitle}
                      onChange={(e) => setCreateFormData({ ...createFormData, issueTitle: e.target.value })}
                      placeholder="e.g. NIBP cuff pressure leak; SpO2 probe intermittent reading"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Detailed Clinical / Operational Symptoms
                    </label>
                    <textarea
                      rows={2}
                      value={createFormData.issueDescription}
                      onChange={(e) => setCreateFormData({ ...createFormData, issueDescription: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Triage Priority
                    </label>
                    <select
                      value={createFormData.priority}
                      onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value as ServiceTicketPriority })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="LOW">LOW — General Maintenance</option>
                      <option value="MEDIUM">MEDIUM — Minor Fault</option>
                      <option value="HIGH">HIGH — Critical Care Degraded</option>
                      <option value="CRITICAL">CRITICAL — ICU / Emergency Equipment Down</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Assign Field Engineer
                    </label>
                    <select
                      value={createFormData.assignedTechnicianId}
                      onChange={(e) => {
                        const tech = allTechnicians.find((t) => t.technicianId === e.target.value);
                        setCreateFormData({
                          ...createFormData,
                          assignedTechnicianId: e.target.value,
                          assignedTechnicianName: tech ? tech.name : "",
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="">Leave Unassigned (Open Queue)</option>
                      {allTechnicians.map((t) => (
                        <option key={t.technicianId} value={t.technicianId}>
                          {t.name} ({t.specialization}) — {t.availability}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Installation Section */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="installationToggle"
                      checked={createFormData.installationRequired}
                      onChange={(e) => setCreateFormData({ ...createFormData, installationRequired: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="installationToggle" className="text-xs font-medium text-slate-800">
                      This ticket involves Initial Equipment Installation / Commissioning
                    </label>
                  </div>

                  {createFormData.installationRequired && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Scheduled Installation Date
                        </label>
                        <input
                          type="date"
                          value={createFormData.installationDate}
                          onChange={(e) => setCreateFormData({ ...createFormData, installationDate: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Installation Status
                        </label>
                        <select
                          value={createFormData.installationStatus}
                          onChange={(e) => setCreateFormData({ ...createFormData, installationStatus: e.target.value as InstallationStatus })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTicket}
                    className="rounded-lg bg-[#0F9F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {creatingTicket ? "Registering..." : "Submit Ticket & Notify Dispatch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Workflow & Update Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                    Workflow Dispatch & Clinical Resolution
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedTicket.ticketId} — {selectedTicket.equipmentName} <span className="font-mono text-slate-500 text-xs font-normal">(SN: {selectedTicket.serialNumber})</span>
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Customer: {selectedTicket.facility || selectedTicket.customerName} • {selectedTicket.customerPhone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editError && (
                <div className="my-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  {editError}
                </div>
              )}

              <form onSubmit={handleUpdateTicket} className="mt-4 space-y-4 text-xs">
                {/* Workflow Transitions */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ticket Status Transition
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as ServiceTicketStatus })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="OPEN">OPEN (Awaiting Dispatch)</option>
                      <option value="ASSIGNED">ASSIGNED (Technician Assigned)</option>
                      <option value="IN_PROGRESS">IN_PROGRESS (On-Site Repair Active)</option>
                      <option value="WAITING_FOR_PARTS">WAITING_FOR_PARTS (Spares Ordered)</option>
                      <option value="RESOLVED">RESOLVED (Repaired & Calibrated)</option>
                      <option value="CLOSED">CLOSED (Sign-off Complete)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Urgency Priority
                    </label>
                    <select
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as ServiceTicketPriority })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Assigned Field Engineer
                    </label>
                    <select
                      value={editFormData.assignedTechnicianId}
                      onChange={(e) => {
                        const tech = allTechnicians.find((t) => t.technicianId === e.target.value);
                        setEditFormData({
                          ...editFormData,
                          assignedTechnicianId: e.target.value,
                          assignedTechnicianName: tech ? tech.name : "",
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {allTechnicians.map((t) => (
                        <option key={t.technicianId} value={t.technicianId}>
                          {t.name} ({t.specialization}) — {t.availability}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Scheduled Service Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.scheduledDate}
                      onChange={(e) => setEditFormData({ ...editFormData, scheduledDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Technical Diagnosis & Resolution */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Technical Diagnosis / Failure Root Cause
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.diagnosis}
                    onChange={(e) => setEditFormData({ ...editFormData, diagnosis: e.target.value })}
                    placeholder="e.g. Optical sensor degraded on finger probe; power supply filter capacitor drift."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Corrective Resolution & Calibration Performed
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.resolution}
                    onChange={(e) => setEditFormData({ ...editFormData, resolution: e.target.value })}
                    placeholder="e.g. Replaced sensor assembly. Calibrated with patient simulator. Verified alarms."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Spare Parts Consumed
                  </label>
                  <input
                    type="text"
                    value={editFormData.partsUsed}
                    onChange={(e) => setEditFormData({ ...editFormData, partsUsed: e.target.value })}
                    placeholder="e.g. Adult reusable SpO2 sensor (Part: PRB-902), ECG 5-lead wire set"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                {/* Installation Update if applicable */}
                {selectedTicket.installationRequired && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
                    <div className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider mb-3">
                      Commissioning / Installation Progress
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-purple-900 mb-1">
                          Installation Status
                        </label>
                        <select
                          value={editFormData.installationStatus}
                          onChange={(e) => setEditFormData({ ...editFormData, installationStatus: e.target.value as InstallationStatus })}
                          className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-purple-900 mb-1">
                          Installation Notes
                        </label>
                        <input
                          type="text"
                          value={editFormData.installationNotes}
                          onChange={(e) => setEditFormData({ ...editFormData, installationNotes: e.target.value })}
                          placeholder="e.g. Clinical demo conducted for ICU head nurse."
                          className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingTicket}
                    className="rounded-lg bg-[#0F9F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {updatingTicket ? "Saving Changes..." : "Save Workflow Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Equipment Service History Modal */}
        {historyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                    Equipment Service Lifecycle & Maintenance History
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {historyTarget.equipmentName} <span className="font-mono text-slate-500 text-xs font-normal">({historyTarget.productCode})</span>
                  </h3>
                  <div className="font-mono text-xs text-slate-500 mt-0.5">
                    Serial Number: <span className="text-slate-800 font-semibold">{historyTarget.serialNumber || "N/A"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryTarget(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4">
                {loadingHistory ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                      <span>Loading equipment service logs...</span>
                    </div>
                  </div>
                ) : historyTickets.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No historical service tickets logged for this specific equipment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyTickets.map((ht) => (
                      <div
                        key={ht.ticketId}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">{ht.ticketId}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">{new Date(ht.createdAt).toLocaleDateString()}</span>
                            {getPriorityBadge(ht.priority)}
                            {getStatusBadge(ht.status)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Engineer: <strong className="text-slate-700">{ht.assignedTechnicianName || "Unassigned"}</strong>
                          </div>
                        </div>

                        <div className="mt-2 font-semibold text-slate-900">{ht.issueTitle}</div>
                        {ht.issueDescription && (
                          <div className="text-xs text-slate-600 mt-1">{ht.issueDescription}</div>
                        )}

                        {(ht.diagnosis || ht.resolution || ht.partsUsed) && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs">
                            {ht.diagnosis && (
                              <div>
                                <span className="font-semibold text-slate-700">Diagnosis: </span>
                                <span className="text-slate-600">{ht.diagnosis}</span>
                              </div>
                            )}
                            {ht.resolution && (
                              <div>
                                <span className="font-semibold text-emerald-700">Resolution: </span>
                                <span className="text-slate-600">{ht.resolution}</span>
                              </div>
                            )}
                            {ht.partsUsed && (
                              <div>
                                <span className="font-semibold text-amber-700">Parts Consumed: </span>
                                <span className="text-slate-600">{ht.partsUsed}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setHistoryTarget(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
