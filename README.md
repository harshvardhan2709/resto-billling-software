# Urban Plate — Commercial Restaurant Billing & POS System - [LIVE](https://restaurant-billing-self.vercel.app)

A high-performance, commercial-grade Restaurant Billing and Point of Sale (POS) software built for **Urban Plate Restaurant**. Designed for rapid counter checkout, live dining floor management, multi-mode payment settlement, and automated Indian GST compliance.

---

## Table of Contents
1. [Key Features](#1-key-features)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Role Permissions Matrix (Admin vs. Cashier)](#4-role-permissions-matrix-admin-vs-cashier)
5. [Financial & Tax Engine (GST 5%)](#5-financial--tax-engine-gst-5)
6. [Demo Credentials](#6-demo-credentials)
7. [Environment Configuration](#7-environment-configuration)
8. [Installation & Setup](#8-installation--setup)
9. [Running the Application](#9-running-the-application)
10. [Automated Verification & Test Suite](#10-automated-verification--test-suite)
11. [Complete API Reference](#11-complete-api-reference)
12. [Deployment Guide (Vercel & Cloud Backend)](#12-deployment-guide-vercel--cloud-backend)

---

## 1. Key Features

- **Dual-Role POS Operations:** Role-enforced authentication for **Admin** (business analytics, catalog CRUD, audit trail) and **Cashier** (order punch, table management, billing).
- **Floor & Table Management:** Visual floor grid for 10 dining tables (`T1`–`T10`) with real-time occupancy status (`free` vs. `running`) and instant ticket lookup.
- **Fast 2-Column Order Punching:** Category quick-filters, instant dish search, dynamic item quantity adjustment, and separate routing for **Dine-In** and **Takeaway** orders.
- **5% GST Engine with Paise Precision:** 2.5% CGST + 2.5% SGST calculated on net taxable amount with integer paise arithmetic and nearest rupee round-off.
- **Flexible Discounts:** Percentage (%) or Fixed (₹) bill-level discounts with instant shortcut presets.
- **Multi-Mode Payment Settlement:**
  - **Cash:** Tendered amount input with automated change returned calculation. The recorded payment amount matches the exact payable total, preserving accounting integrity.
  - **UPI / QR Code:** Direct digital transaction settlement.
  - **Card:** POS debit/credit card clearance.
  - **Split Payment:** Flexible multi-channel split (e.g. ₹200 Cash + ₹210 UPI) with real-time balance tracking.
- **Timezone-Aware Shift Analytics:** Operational reporting calibrated to Indian Standard Time (IST, `Asia/Kolkata`) with real 2-hour operational shift buckets (including 12 AM midnight closing) and timezone-safe date filters (*Today*, *Yesterday*, *Last 7 Days*).
- **Thermal Invoice Printing:** Print-optimized 80mm tax receipt modal with dedicated `@media print` CSS that strips out all application navigation, headers, and UI chrome.
- **Invoice Void & Audit Trail:** Admin-authorized bill cancellation requiring a mandatory audit reason. Realized revenue is separated from voided transactions in sales metrics.
- **CSV Audit Export:** One-click downloadable sales spreadsheet with detailed tax, payment, cashier, and status breakdowns.
- **Cloud-Ready Deployment:** Vercel SPA rewrite fallback configuration (`vercel.json`) preventing 404s on browser refresh, plus production health monitoring (`GET /health`).

---

## 2. Technology Stack

### Frontend Client
- **Framework:** React 18.3 with Vite 5
- **Styling:** Tailwind CSS 3.4 (Custom POS palette: Dark Charcoal sidebar `#12161a`, Emerald accents, clean borders)
- **Routing:** React Router DOM 6.23 with role guards (`ProtectedRoute`, `RoleGuard`)
- **State & Data Fetching:** Axios with centralized interceptors, credentials support, and automatic `VITE_API_URL` normalization
- **Telemetry Charts:** Recharts 2.12 (Hourly revenue curves and settlement share)
- **Icons:** Lucide React (feather-style clean SVGs)

### Backend Server
- **Runtime:** Node.js (v20+ / v22) & Express.js 4 (MVC architecture)
- **Database:** MongoDB & Mongoose ODM 8.4
- **Security & Headers:**
  - Helmet for HTTP response security headers
  - Express-Mongo-Sanitize for NoSQL injection prevention
  - Express-Rate-Limit for brute-force protection
  - CORS with configurable origin credentials
- **Authentication:** JSON Web Tokens (JWT) issued in secure `HttpOnly` cookies + Bearer token header fallback
- **Password Security:** bcryptjs (10-round salt hashing)
- **Concurrency & Sequences:** Atomic counter utilities (`getNextSequence`) preventing duplicate invoice or order numbers under concurrent traffic

---

## 3. Project Structure

```
c:\Projects\RestaurantBillingSoftware/
├── package.json                          # Root monorepo orchestration scripts
├── .gitignore                            # Git exclusion rules (ignores .env and node_modules)
├── README.md                             # Project documentation
│
├── backend/
│   ├── config/
│   │   └── db.js                         # Mongoose connection with DNS fallback for Atlas SRV
│   ├── controllers/
│   │   ├── authController.js             # Login, Logout, Session verification
│   │   ├── menuController.js             # Dish catalog CRUD (Admin-only mutations)
│   │   ├── tableController.js            # Table occupancy and live order assignment
│   │   ├── orderController.js            # Ticket creation, snapshotting, and KOT additions
│   │   ├── billController.js             # Tax calculations, settlement, and voiding
│   │   └── reportController.js           # Real-time dashboard & detailed financial reports
│   ├── middleware/
│   │   ├── authMiddleware.js             # JWT extraction (cookie & bearer) and verification
│   │   ├── roleMiddleware.js             # Role-based authorization enforcement
│   │   ├── rateLimiter.js                # Rate-limiting middleware
│   │   └── errorHandler.js               # Centralized API error handling
│   ├── models/
│   │   ├── User.js                       # User credentials, roles, bcrypt hooks
│   │   ├── MenuItem.js                   # Dish catalog, pricing, veg/non-veg tags
│   │   ├── Table.js                      # Tables T1–T10 with status tracking
│   │   ├── Order.js                      # Active orders with immutable item snapshots
│   │   ├── Bill.js                       # Final invoices with tax & price freezing
│   │   └── Payment.js                    # Multi-channel payment records
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── menuRoutes.js
│   │   ├── tableRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── billRoutes.js
│   │   └── reportRoutes.js
│   ├── seed/
│   │   └── seeder.js                     # Idempotent DB seeder (2 users, 10 tables, 28 dishes)
│   ├── test/
│   │   ├── batch4-e2e.test.js            # Comprehensive automated suite (72 assertions)
│   │   └── test-auth.js                  # Standalone auth tests
│   ├── utils/
│   │   ├── apiResponse.js                # Standardized JSON response envelope
│   │   ├── counter.js                    # Atomic sequence generator for Bills & Orders
│   │   └── jwt.js                        # Token creation and cookie attachment
│   ├── .env.example                      # Backend environment variable template
│   ├── .env                              # Local environment configuration (ignored by git)
│   ├── server.js                         # Express entry point & health check handler
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── assets/                       # Static branding and icons
    │   ├── components/
    │   │   ├── billing/
    │   │   │   └── ReceiptModal.jsx      # Thermal printable tax receipt (80mm)
    │   │   ├── common/
    │   │   │   ├── ErrorBoundary.jsx     # UI error boundary
    │   │   │   ├── LoadingSpinner.jsx    # Animated loading indicators
    │   │   │   ├── ProtectedRoute.jsx    # Auth route wrapper
    │   │   │   └── RoleGuard.jsx         # Role authorization element
    │   │   ├── layout/
    │   │   │   ├── AppLayout.jsx         # Responsive dashboard frame
    │   │   │   ├── Header.jsx            # Top navbar with user profile & quick actions
    │   │   │   └── Sidebar.jsx           # Role-filtered POS navigation sidebar
    │   │   └── ui/
    │   │       ├── Badge.jsx             # Status and category badges
    │   │       ├── Button.jsx            # Standardized button components
    │   │       ├── Card.jsx              # Content card containers
    │   │       ├── Input.jsx             # Form inputs with icon adornments
    │   │       └── Modal.jsx             # Accessible popup modal dialogs
    │   ├── context/
    │   │   └── AuthContext.jsx           # Global authentication state
    │   ├── pages/
    │   │   ├── Login.jsx                 # POS sign-in screen with quick-fill demo buttons
    │   │   ├── Dashboard.jsx             # Operational overview & financial analytics
    │   │   ├── Tables.jsx                # Table floor plan & 2-column order punching
    │   │   ├── Billing.jsx               # Order checkout, GST calculation & payment
    │   │   ├── MenuManagement.jsx        # Dish catalog, price updates & availability
    │   │   ├── BillHistory.jsx           # Searchable invoice archive, sort & voiding
    │   │   └── Reports.jsx               # Financial KPIs, sales curves & CSV export
    │   ├── routes/
    │   │   └── AppRoutes.jsx             # Application router definition
    │   ├── services/
    │   │   ├── api.js                    # Axios instance with VITE_API_URL fallback
    │   │   └── authService.js            # Auth service endpoints
    │   ├── App.jsx
    │   ├── index.css                     # Tailwind directives & print styles
    │   └── main.jsx                      # React 18 DOM mount point
    ├── vercel.json                       # Vercel SPA rewrite fallback configuration
    ├── index.html                        # HTML shell
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    └── package.json
```

---

## 4. Role Permissions Matrix (Admin vs. Cashier)

Permissions are strictly validated on the **backend API routes**, ensuring unauthorized requests return `403 Forbidden` regardless of client state.

| Feature / Capability | Admin View | Cashier View | Backend Enforcement |
| :--- | :---: | :---: | :--- |
| **Login / Logout** | Full | Full | `POST /api/auth/login`, `POST /api/auth/logout` |
| **Today's Sales Metric** | **Full** (All counters combined) | **Limited** (Own shift sales only) | Scoped in `reportController.js` via `req.user._id` |
| **Total Revenue Analytics** | **Yes** (Hourly trend chart) | **No** (Hidden) | Cashier response returns empty array; UI suppressed |
| **Payment Analytics** | **Yes** (Mode breakdown & share) | **No** (Hidden) | Cashier response returns empty array; UI suppressed |
| **Total Bills KPI** | **Yes** | **Yes** | Operational KPI visible to both roles |
| **Active Orders Table** | **Yes** | **Yes** | Live running tickets accessible to both roles |
| **Table Availability** | **Yes** | **Yes** | Floor occupancy accessible to both roles |
| **Top-Selling Items** | **Yes** | **No** (Hidden) | Rendered only for Admin |
| **Menu Catalog Browsing** | Yes | Yes | `GET /api/menu` permitted for both |
| **Menu Item CRUD** | **Yes** (Create, Edit, Delete) | **No** (Forbidden) | `POST`, `PUT`, `DELETE /api/menu` reject Cashier with `403` |
| **Tables & Floor Status** | Yes | Yes | `GET`, `PUT /api/tables` permitted for both |
| **Create & Update Orders** | Yes | Yes | `POST /api/orders` permitted for both |
| **Generate Bills & Settle** | Yes | Yes | `POST /api/bills` permitted for both |
| **Bill History Archive** | Yes | Yes | `GET /api/bills` permitted for both |
| **Void / Cancel Bills** | **Yes** (With audit reason) | **No** (Forbidden) | `PUT /api/bills/:id/cancel` rejects Cashier with `403` |
| **Management Reports & CSV** | **Yes** | **No** (Forbidden) | `GET /api/reports/analytics`, `/export-csv` reject Cashier with `403` |

---

## 5. Financial & Tax Engine (GST 5%)

All financial computations are executed using integer paise (`amount * 100`) to eliminate IEEE 754 floating-point rounding errors.

### Tax Calculation Breakdown

$$\text{Taxable Amount} = \text{Subtotal} - \text{Discount}$$

$$\text{CGST (2.5\%)} = \text{Taxable Amount} \times 0.025$$

$$\text{SGST (2.5\%)} = \text{Taxable Amount} \times 0.025$$

$$\text{Grand Total} = \text{Taxable Amount} + \text{CGST} + \text{SGST}$$

$$\text{Final Payable Amount} = \text{Math.round}(\text{Grand Total})$$

$$\text{Round-Off Adjustment} = \text{Final Payable Amount} - \text{Grand Total}$$

### Example Transaction (From Integration Suite)
- **Menu Item:** Classic Butter Chicken (₹340.00)
- **Discount (10%):** ₹34.00
- **Taxable Amount:** ₹306.00
- **CGST (2.5%):** ₹7.65
- **SGST (2.5%):** ₹7.65
- **Grand Total Before Round-Off:** ₹321.30
- **Round-Off Adjustment:** ₹-0.30
- **Final Payable Amount:** **₹321.00**
- **Cash Tendered:** ₹1,000.00
- **Payment Recorded:** **₹321.00** *(Exact payable amount recorded in ledger)*
- **Change Returned:** **₹679.00** *(Returned to customer)*
- **Remaining Due:** **₹0.00**

### Financial Safeguards
- **No Overpayment:** Reject attempts to pay more than the remaining balance.
- **No Negative Values:** Rejects payments or discounts $\le 0$.
- **No Double Billing:** Tables or orders already billed cannot be billed a second time.
- **Immutable Item Snapshots:** Dish names and prices at the moment of order creation are frozen, protecting past invoices from future menu price revisions.

---

## 6. Demo Credentials

The database is pre-seeded with two accounts for testing and demonstration:

| Role | Username | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@urbanplate.com` | `admin123` | Full administrative control, menu catalog, revenue analytics, void authorization, CSV audit export |
| **Cashier** | `cashier` | `cashier@urbanplate.com` | `cashier123` | Counter POS checkout, table floor plan, order punching, billing, invoice history browsing |

> ⚠️ **Note:** The above credentials are provided strictly for local development and hiring evaluation. In a production environment, seed credentials must be rotated.

---

## 7. Environment Configuration

### Backend Environment (`backend/.env`)
Create a `.env` file inside `backend/` (template available in `backend/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/restaurant_billing
JWT_SECRET=super_secret_jwt_key_restaurant_billing_2026_urban_plate
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
TIMEZONE=Asia/Kolkata
```

*Note: For MongoDB Atlas, use your `mongodb+srv://...` connection string.*

### Frontend Environment (`frontend/.env`)
Create a `.env` file inside `frontend/` (template available in `frontend/.env.example`):

```env
# Optional in local development (defaults to http://localhost:5000/api via Vite proxy)
# Required in production deployment (e.g. Vercel)
VITE_API_URL=https://your-backend-service.onrender.com
```

---

## 8. Installation & Setup

### Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10.x+
- **MongoDB:** Local instance running on port 27017 or a MongoDB Atlas URI

### Step-by-Step Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/RestaurantBillingSoftware.git
cd RestaurantBillingSoftware

# 2. Install root dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install

# 4. Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Seed Initial Database
Seed the 2 test users, 10 dining tables, and 28 menu items across 6 categories:

```bash
# From project root
npm run seed

# Or directly in backend
cd backend
npm run seed
```

*(The seeder is fully idempotent: running it repeatedly safely updates existing records without creating duplicates. Pass `--clean` to wipe and re-seed from scratch).*

---

## 9. Running the Application

### Option A: Monorepo Commands (From Root)
Open two terminal windows:

```bash
# Terminal 1 — Start Backend API (Port 5000)
npm run backend

# Terminal 2 — Start Frontend Client (Port 5173)
npm run frontend
```

### Option B: Individual Service Commands

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Server running at http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm run dev
# Client running at http://localhost:5173
```

Open `http://localhost:5173` in your browser to access the POS application.

---

## 10. Automated Verification & Test Suite

The project includes an end-to-end integration test suite verifying authentication, role barriers, cash change calculation, split payments, takeaway billing, concurrent bill creation, and financial reports.

### Run Backend Test Suite
```bash
# From project root
npm run test:backend

# Or from backend directory
cd backend
npm test
```

### Test Suite Execution Output
```text
======================================================
 BATCH 4: COMPREHENSIVE END-TO-END VERIFICATION
======================================================

--- 0. Testing Health Check Endpoint (/health) ---
 ✔ PASS : GET /health returns HTTP 200 when MongoDB is connected
 ✔ PASS : GET /health returns success: true
 ✔ PASS : GET /health returns database: "connected"
 ✔ PASS : GET /health returns message: "Server is healthy"
 ✔ PASS : GET /health does not expose database URIs, credentials, or secrets
 ✔ PASS : GET /api/health also returns HTTP 200
 ✔ PASS : GET /health returns HTTP 503 when database is disconnected
 ✔ PASS : GET /health returns success: false when disconnected
 ✔ PASS : GET /health returns database: "disconnected"

--- 1. Testing Authentication & Role Tokens ---
 ✔ PASS : Admin login succeeds with role admin
 ✔ PASS : Cashier login succeeds with role cashier
 ✔ PASS : GET /api/auth/me returns admin profile
 ✔ PASS : GET /api/auth/me returns cashier profile

--- 2. Testing Role-Based Permission Enforcement ---
 ✔ PASS : Cashier blocked from POST /api/menu (403)
 ✔ PASS : Cashier allowed on GET /api/reports/dashboard (200)
 ✔ PASS : Cashier blocked from GET /api/reports/analytics (403)
 ✔ PASS : Cashier blocked from GET /api/reports/export-csv (403)
 ✔ PASS : Admin allowed on GET /api/reports/dashboard (200)

--- 3. Testing Menu Management (Admin Only) ---
 ✔ PASS : Admin creates new menu item (201)
 ✔ PASS : Admin updates menu item price to 349 (200)
 ✔ PASS : Admin toggles menu item availability to false (200)
 ✔ PASS : Admin deletes menu item (200)

--- 4. Testing Workflow 1: Cash Payment & Change Calculation ---
 ✔ PASS : Found menu item "Classic Butter Chicken" with price ₹340 for standard calculation
 ✔ PASS : Found available table T1 for Cash order
 ✔ PASS : Order 1 created with subtotal ₹340
 ✔ PASS : Table T1 status successfully updated to 'running'
 ✔ PASS : Bill 1 created with 10% discount
 ✔ PASS : Subtotal is ₹340
 ✔ PASS : Discount (10%) is ₹34
 ✔ PASS : Taxable amount is ₹306
 ✔ PASS : CGST (2.5%) is ₹7.65
 ✔ PASS : SGST (2.5%) is ₹7.65
 ✔ PASS : Grand total before round-off is ₹321.3
 ✔ PASS : Round-off adjustment is ₹-0.3
 ✔ PASS : Final payable amount is exactly ₹321
 ✔ PASS : Table T1 status released to 'free' upon bill creation
 ✔ PASS : Cash payment processed successfully (HTTP 200 OK)
 ✔ PASS : Payment record amount is ₹321 (verified ₹321, NOT ₹1,000)
 ✔ PASS : MongoDB Payment collection confirms recorded payment amount is ₹321
 ✔ PASS : Change returned (₹679) matches ₹1000 - ₹321 = ₹679
 ✔ PASS : Remaining balance due is ₹0.00
 ✔ PASS : Bill paymentStatus is "paid"

--- 5. Testing Workflow 2: Split Payment (Cash + UPI) ---
 ✔ PASS : Found available table T10 for Split order
 ✔ PASS : Split payment (Cash + UPI) recorded (200)
 ✔ PASS : Split bill marked fully "paid"
 ✔ PASS : Total paid equals bill total ₹410

--- 6. Testing Workflow 3: Takeaway Order & Card Payment ---
 ✔ PASS : Takeaway order punched without table
 ✔ PASS : Takeaway bill generated
 ✔ PASS : Takeaway bill settled via Card

--- 7. Testing Financial Safeguards & Constraints ---
 ✔ PASS : Overpayment rejected with 400 Bad Request
 ✔ PASS : Negative payment rejected with 400 Bad Request
 ✔ PASS : Invalid payment mode rejected with 400 Bad Request
 ✔ PASS : Double billing of same order rejected with 400 Bad Request
 ✔ PASS : Partial payment correctly marks bill as "partial"

--- 8. Testing Bill Cancellation & Role Authorization ---
 ✔ PASS : Cashier blocked from cancelling bill (403 Forbidden)
 ✔ PASS : Admin successfully cancels/voids bill (200 OK)
 ✔ PASS : Payment on cancelled bill rejected with 400 Bad Request

--- 9. Testing Concurrent Bill Creation (Uniqueness) ---
 ✔ PASS : 10 concurrent bills created with 10 unique bill numbers (no collisions: 10/10)

--- 10. Testing Bill History Retrieval & Filtering ---
 ✔ PASS : Cashier retrieves bill history registry
 ✔ PASS : Filter by paymentStatus=paid works correctly
 ✔ PASS : Filter by status=cancelled works correctly
 ✔ PASS : Filter by datePreset=today returns today's bills
 ✔ PASS : Filter by datePreset=week returns bills covering the week
 ✔ PASS : Filter by datePreset=yesterday returns valid response

--- 11. Testing Reports & Financial Analytics Integrity ---
 ✔ PASS : Admin fetches detailed analytics (200 OK)
 ✔ PASS : Report netRevenue matches database active bills sum
 ✔ PASS : Report cancelledCount strictly equals DB cancelled bills
 ✔ PASS : Report cancelledRevenue correctly tracked and excluded from active netRevenue
 ✔ PASS : Report includes 3 payment modes (Cash, UPI / QR, Card)
 ✔ PASS : Report includes top-selling items ranking
 ✔ PASS : Admin exports CSV report (200 OK)
 ✔ PASS : CSV contains required standard billing headers

======================================================
 BATCH 4 TEST RESULTS: 72 PASSED, 0 FAILED
======================================================
```

### Frontend Production Build
```bash
cd frontend
npm run build
```
*Builds cleanly using Vite without bundle errors (`dist/index.html` + minified JS/CSS chunks).*

---

## 11. Complete API Reference

### Health Check (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server & MongoDB health check (`200 OK` or `503 Service Unavailable`). Does not leak secrets. |
| `GET` | `/api/health` | Alternate health check endpoint. |

### Authentication & Users
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate via username or email + password. Returns JWT and sets `HttpOnly` cookie. |
| `POST` | `/api/auth/logout` | Public/Private | Clears authentication cookie and terminates session. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current user profile (`admin` or `cashier`). |

### Menu Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | Cashier, Admin | List menu catalog with optional `?category=` and `?search=` filters. |
| `POST` | `/api/menu` | **Admin Only** | Add new dish to catalog (`403 Forbidden` for Cashier). |
| `PUT` | `/api/menu/:id` | **Admin Only** | Update dish price, name, category, or availability status. |
| `DELETE` | `/api/menu/:id` | **Admin Only** | Delete dish from catalog. |

### Dining Tables
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tables` | Cashier, Admin | List tables `T1`–`T10` with occupancy status and live orders. |
| `PUT` | `/api/tables/:id/status` | Cashier, Admin | Update table state (`free` or `running`). |

### Orders
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | Cashier, Admin | List orders (filterable by `?status=` and `?orderType=`). |
| `GET` | `/api/orders/:id` | Cashier, Admin | Get single order ticket by ID. |
| `POST` | `/api/orders` | Cashier, Admin | Create new dine-in or takeaway order with frozen item snapshots. |
| `PUT` | `/api/orders/:id/items` | Cashier, Admin | Append extra items to running order (KOT addition). |
| `PUT` | `/api/orders/:id/cancel`| Cashier, Admin | Cancel active order and release table. |

### Billing & Payments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bills` | Cashier, Admin | Query invoice archive with date presets (`today`, `yesterday`, `week`), status, and pagination. |
| `GET` | `/api/bills/:id` | Cashier, Admin | Get bill details, item snapshots, and payment records. |
| `POST` | `/api/bills` | Cashier, Admin | Generate final tax invoice with 5% GST and release table to `free`. |
| `POST` | `/api/bills/:id/payments`| Cashier, Admin | Record payment (Cash, UPI, Card, Split) with change calculation. |
| `PUT` | `/api/bills/:id/cancel` | **Admin Only** | Void invoice with mandatory cancellation reason (`403` for Cashier). |

### Financial Reports
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/dashboard`| Cashier, Admin | Operational dashboard KPIs (Scoped: Full for Admin, Shift sales for Cashier). |
| `GET` | `/api/reports/analytics`| **Admin Only** | Comprehensive financial analytics, KPIs, hourly trends, and top sellers. |
| `GET` | `/api/reports/export-csv`| **Admin Only** | Download sales ledger in CSV format for audits. |

---

## 12. Deployment Guide (Vercel & Cloud Backend)

### Frontend Deployment (Vercel)
1. In the Vercel Dashboard, import the repository.
2. Configure **Project Settings**:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add **Environment Variable**:
   - `VITE_API_URL` = `https://your-backend-api.onrender.com`
4. The included [frontend/vercel.json](file:///c:/Projects/RestaurantBillingSoftware/frontend/vercel.json) automatically handles SPA rewrites so that refreshing deep routes (`/dashboard`, `/tables`, `/billing`, `/bills`, `/reports`) serves `index.html` seamlessly without 404 errors:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

### Backend Deployment (Render / Railway / AWS / Docker)
1. Deploy the `backend/` directory as a Node.js web service.
2. Set Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5000` (or host provided port)
   - `MONGO_URI` = `mongodb+srv://<user>:<password>@cluster.mongodb.net/restaurant_billing`
   - `JWT_SECRET` = `<your-secure-random-secret>`
   - `CLIENT_URL` = `https://your-frontend.vercel.app`
   - `TIMEZONE` = `Asia/Kolkata`
3. Set **Health Check Path**: `/health` (Responds with HTTP 200 when MongoDB is connected).

---

## License & Evaluation Notice
This software was engineered as a commercial restaurant management solution for **Urban Plate Restaurant**. Licensed for evaluation and production deployment. All rights reserved.
