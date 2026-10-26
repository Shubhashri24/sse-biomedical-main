import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getQuotationsCollection,
  getProductsCollection,
  getContactMessagesCollection,
  getSuppliersCollection,
  getServiceTicketsCollection,
} from "@/lib/mongodb";

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quotationsCol = await getQuotationsCollection();
    const productsCol = await getProductsCollection();
    const messagesCol = await getContactMessagesCollection();
    const suppliersCol = await getSuppliersCollection();
    const serviceTicketsCol = await getServiceTicketsCollection();

    const [
      allQuotations,
      allProducts,
      totalMessages,
      activeSuppliers,
      allServiceTickets,
    ] = await Promise.all([
      quotationsCol.find({}).sort({ createdAt: -1 }).toArray(),
      productsCol.find({ isActive: { $ne: false } }).toArray(),
      messagesCol.countDocuments({}),
      suppliersCol.countDocuments({ isActive: true }),
      serviceTicketsCol.find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const totalProducts = allProducts.length;

    // Calculate unique customers
    const uniqueCustomerEmails = new Set(
      allQuotations.map((q) => q.customerEmail.toLowerCase().trim()).filter(Boolean)
    );
    const totalCustomers = uniqueCustomerEmails.size;

    // KPI status counters
    const statusCounts: Record<string, number> = {
      NEW: 0,
      REVIEWING: 0,
      CONTACTED: 0,
      QUOTATION_PREPARATION: 0,
      QUOTATION_SENT: 0,
      NEGOTIATION: 0,
      APPROVED: 0,
      REJECTED: 0,
      CLOSED: 0,
    };

    for (const q of allQuotations) {
      if (statusCounts[q.status] !== undefined) {
        statusCounts[q.status]++;
      } else {
        statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
      }
    }

    // Inventory KPIs & Low Stock Items
    let totalStockUnits = 0;
    let reservedStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const lowStockAlerts = allProducts
      .filter((p) => {
        const stock = p.stockQuantity ?? 0;
        const reserved = p.reservedQuantity ?? 0;
        const avail = Math.max(0, stock - reserved);
        const reorder = p.reorderLevel ?? 5;
        totalStockUnits += stock;
        reservedStockUnits += reserved;
        if (avail === 0) {
          outOfStockCount++;
          return true;
        } else if (avail <= reorder) {
          lowStockCount++;
          return true;
        }
        return false;
      })
      .map((p) => {
        const stock = p.stockQuantity ?? 0;
        const reserved = p.reservedQuantity ?? 0;
        const avail = Math.max(0, stock - reserved);
        return {
          productCode: p.productCode,
          name: p.name,
          categoryName: p.categoryName,
          availableQuantity: avail,
          stockQuantity: stock,
          reorderLevel: p.reorderLevel ?? 5,
          stockStatus: avail === 0 ? ("OUT_OF_STOCK" as const) : ("LOW_STOCK" as const),
        };
      })
      .sort((a, b) => a.availableQuantity - b.availableQuantity)
      .slice(0, 8);

    // Service Overview & Critical Tickets
    const serviceOverview: Record<string, number> = {
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_PARTS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    let criticalTicketsCount = 0;
    let pendingInstallationsCount = 0;

    for (const ticket of allServiceTickets) {
      if (serviceOverview[ticket.status] !== undefined) {
        serviceOverview[ticket.status]++;
      }
      if (ticket.priority === "CRITICAL" && !["RESOLVED", "CLOSED"].includes(ticket.status)) {
        criticalTicketsCount++;
      }
      if (
        ticket.installationRequired &&
        ticket.installationStatus &&
        ["PENDING", "SCHEDULED", "IN_PROGRESS"].includes(ticket.installationStatus)
      ) {
        pendingInstallationsCount++;
      }
    }

    const criticalTickets = allServiceTickets
      .filter(
        (t) => t.priority === "CRITICAL" && !["RESOLVED", "CLOSED"].includes(t.status)
      )
      .slice(0, 5)
      .map((t) => ({
        ticketId: t.ticketId,
        equipmentName: t.equipmentName,
        productCode: t.productCode,
        issueTitle: t.issueTitle,
        customerName: t.customerName,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
      }));

    // 1. Most requested equipment
    const equipmentCounts: Record<string, number> = {};
    for (const q of allQuotations) {
      if (Array.isArray(q.items) && q.items.length > 0) {
        for (const item of q.items) {
          const key = item.equipmentName || q.equipment;
          equipmentCounts[key] = (equipmentCounts[key] || 0) + item.quantity;
        }
      } else if (q.equipment) {
        equipmentCounts[q.equipment] = (equipmentCounts[q.equipment] || 0) + (q.quantity || 1);
      }
    }

    const topEquipment = Object.entries(equipmentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // 2. Requests by Category
    const categoryCounts: Record<string, number> = {};
    for (const q of allQuotations) {
      const cat = q.category || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Requests over time
    const monthMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthMap[label] = 0;
    }

    for (const q of allQuotations) {
      const d = new Date(q.createdAt);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (monthMap[label] !== undefined) {
        monthMap[label]++;
      }
    }

    const timeline = Object.entries(monthMap).map(([period, count]) => ({
      period,
      count,
    }));

    return NextResponse.json({
      success: true,
      kpis: {
        totalQuotations: allQuotations.length,
        newRequests: statusCounts.NEW || 0,
        contacted: (statusCounts.CONTACTED || 0) + (statusCounts.REVIEWING || 0),
        quotationsSent: (statusCounts.QUOTATION_SENT || 0) + (statusCounts.QUOTATION_PREPARATION || 0),
        closed: (statusCounts.CLOSED || 0) + (statusCounts.APPROVED || 0) + (statusCounts.REJECTED || 0),
        totalProducts,
        totalCustomers,
        totalMessages,
        // New business KPIs
        totalStockUnits,
        reservedStockUnits,
        lowStockCount,
        outOfStockCount,
        activeSuppliers,
        openServiceTickets: (serviceOverview.OPEN || 0) + (serviceOverview.ASSIGNED || 0),
        criticalTicketsCount,
        pendingInstallationsCount,
      },
      inventory: {
        totalStockUnits,
        reservedStockUnits,
        lowStockCount,
        outOfStockCount,
        lowStockAlerts,
      },
      service: {
        overview: serviceOverview,
        criticalTickets,
        pendingInstallationsCount,
      },
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      topEquipment,
      categoryBreakdown,
      timeline,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/analytics] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
