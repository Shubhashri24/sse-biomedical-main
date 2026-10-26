import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getQuotationsCollection, getContactMessagesCollection } from "@/lib/mongodb";

export interface CustomerSummary {
  email: string;
  name: string;
  phone: string;
  facility?: string;
  totalQuotations: number;
  totalMessages: number;
  latestRequestId?: string;
  latestStatus?: string;
  lastActivity: Date;
  quotations: Array<{
    requestId: string;
    equipment: string;
    status: string;
    createdAt: Date;
    quantity: number;
  }>;
}

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const quotationsCol = await getQuotationsCollection();
    const messagesCol = await getContactMessagesCollection();

    const [quotations, messages] = await Promise.all([
      quotationsCol.find({}).sort({ createdAt: -1 }).toArray(),
      messagesCol.find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const customerMap = new Map<string, CustomerSummary>();

    // Aggregate from quotations
    for (const q of quotations) {
      const email = q.customerEmail.toLowerCase().trim();
      if (!email) continue;

      const existing = customerMap.get(email);
      if (existing) {
        existing.totalQuotations += 1;
        if (!existing.phone && q.phone) existing.phone = q.phone;
        if (!existing.facility && q.facility) existing.facility = q.facility;
        if (new Date(q.createdAt) > new Date(existing.lastActivity)) {
          existing.lastActivity = q.createdAt;
          existing.latestRequestId = q.requestId;
          existing.latestStatus = q.status;
        }
        existing.quotations.push({
          requestId: q.requestId,
          equipment: q.equipment,
          status: q.status,
          createdAt: q.createdAt,
          quantity: q.quantity,
        });
      } else {
        customerMap.set(email, {
          email,
          name: q.customerName,
          phone: q.phone,
          facility: q.facility,
          totalQuotations: 1,
          totalMessages: 0,
          latestRequestId: q.requestId,
          latestStatus: q.status,
          lastActivity: q.createdAt,
          quotations: [
            {
              requestId: q.requestId,
              equipment: q.equipment,
              status: q.status,
              createdAt: q.createdAt,
              quantity: q.quantity,
            },
          ],
        });
      }
    }

    // Merge from contact messages
    for (const m of messages) {
      const email = m.email.toLowerCase().trim();
      if (!email) continue;

      const existing = customerMap.get(email);
      if (existing) {
        existing.totalMessages += 1;
        if (!existing.phone && m.phone) existing.phone = m.phone;
        if (new Date(m.createdAt) > new Date(existing.lastActivity)) {
          existing.lastActivity = m.createdAt;
        }
      } else {
        customerMap.set(email, {
          email,
          name: m.name,
          phone: m.phone,
          totalQuotations: 0,
          totalMessages: 1,
          lastActivity: m.createdAt,
          quotations: [],
        });
      }
    }

    let customers = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          (c.facility && c.facility.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      customers,
      totalCount: customers.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/customers] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
