# Shree Shyam Electronics — Biomedical Systems Catalog & Quotation Management

A Next.js catalog site and lead/quotation management system built for Shree Shyam Electronics biomedical equipment catalog.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **UI & Styling:** React 19, Tailwind CSS v4, IBM Plex Sans / IBM Plex Mono
- **Database:** MongoDB / MongoDB Atlas (collection: `quotation_requests`)
- **Backend:** Next.js Route Handlers (REST APIs)
- **Email Dispatch:** Nodemailer (SMTP)
- **Authentication:** Server-side HMAC signed HTTP-only cookie sessions

## Architecture & Routes

### Public Customer Routes
- `/` — Home: hero, 9-category directory, interactive search & filter across all 36 equipment profiles, about section, CTA.
- `/category/[slug]` — Category equipment profile page showing specifications, function, configurations, selection notes, and "Request Quote →" CTAs.
- `/contact` — Equipment requirement form with automatic URL prefill from product cards (`/contact?equipment=...&code=...&category=...`). Submits to `POST /api/quotations`.

### Protected Admin Routes
- `/admin/login` — Administrator authentication portal.
- `/admin` — Quotation dashboard showing live stats (Total, New, Contacted, Quotation Sent, Closed), live search, status filters, and quotation requests table.
- `/admin/requests/[id]` — Detailed request view, status lifecycle manager, and direct email reply interface to customers.

### Backend APIs
- `POST /api/quotations` — Public quotation submission endpoint (validates input, generates human-readable Request ID `QT-XXXX`, saves to MongoDB, alerts administrator).
- `POST /api/admin/auth/login` — Secure admin login.
- `POST /api/admin/auth/logout` — Admin session termination.
- `GET /api/admin/auth/me` — Verify admin session.
- `GET /api/admin/quotations` — Fetch filtered quotation requests and summary counts.
- `GET /api/admin/quotations/[id]` — Fetch single quotation record.
- `PATCH /api/admin/quotations/[id]` — Update quotation status (`NEW`, `CONTACTED`, `QUOTATION_SENT`, `CLOSED`).
- `POST /api/admin/quotations/[id]/reply` — Dispatch email reply to customer and record reply in MongoDB.

---

## MongoDB Atlas Setup Guide

1. **Create MongoDB Atlas Cluster:**
   - Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Create a free or dedicated cluster (e.g. M0 Free Tier).

2. **Create Database User:**
   - In **Database Access**, create a database user with Read/Write privileges.

3. **Configure Network Access:**
   - In **Network Access**, add an IP Access List entry. (For Vercel or cloud deployment, add `0.0.0.0/0` with secure user credentials).

4. **Copy Connection String:**
   - In **Clusters**, click **Connect** → **Drivers** (Node.js).
   - Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/sse_biomedical?retryWrites=true&w=majority`).

5. **Configure Environment Variables:**
   - Create `.env.local` in the project root (copied from `.env.example`).
   - Paste the connection string:
     ```env
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sse_biomedical?retryWrites=true&w=majority
     ADMIN_EMAIL=admin@shreeshyamelectronics.com
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your_secure_admin_password
     SESSION_SECRET=a_random_32_character_secret_string
     SMTP_HOST=smtp.example.com
     SMTP_PORT=587
     SMTP_USER=user@example.com
     SMTP_PASSWORD=smtp_password
     ```

6. **Start Application:**
   ```bash
   npm install
   npm run dev
   ```
   Visit http://localhost:3000 (public catalog) or http://localhost:3000/admin (admin portal).
