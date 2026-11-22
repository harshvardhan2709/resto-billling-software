# Urban Plate Restaurant Billing Software (POS System)

A modern, commercial-grade Restaurant Billing and Point of Sale (POS) application built for **Urban Plate Restaurant**.

---

## 1. Technology Stack

### Frontend
- **React.js (v18.3)** with **Vite**
- **JavaScript (ES Modules)**
- **Tailwind CSS (v3.4)** with custom POS theme (Dark Charcoal sidebar, subtle emerald green accents, clean white cards)
- **React Router DOM (v6.23)** for protected, role-based navigation
- **Axios** with HttpOnly cookie support and centralized interceptors
- **Lucide React** for professional icons
- **Recharts** for analytics and reporting

### Backend
- **Node.js** & **Express.js** (MVC architecture)
- **MongoDB** & **Mongoose ODM (v8.4)**
- **JWT (JSON Web Tokens)** stored in secure `HttpOnly` cookies + Bearer auth header fallback
- **bcryptjs** for 10-round salted password hashing
- **Cookie-Parser**, **CORS**, and centralized error handling middleware

---

## 2. Project Structure

```
c:\Projects\RestaurantBillingSoftware/
├── package.json                    # Root monorepo scripts
├── .gitignore
├── README.md
│
├── backend/
│   ├── config/
│   │   └── db.js                   # Mongoose connection with lifecycle hooks
│   ├── controllers/
│   │   ├── authController.js       # Login, Logout, and GetMe
│   │   ├── menuController.js       # Menu CRUD (Admin-only mutations)
│   │   ├── tableController.js      # Table status and floor management
│   │   ├── orderController.js      # Order placement and snapshots
│   │   ├── billController.js       # Bill generation and tax calculation
│   │   └── reportController.js     # Sales analytics (Admin-only)
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT extraction (cookie & bearer) and validation
│   │   ├── roleMiddleware.js       # Role authorization (admin vs cashier)
│   │   └── errorHandler.js         # Centralized error handler (Cast, validation, duplicates)
│   ├── models/
│   │   ├── User.js                 # User credentials, roles, bcrypt hashing
│   │   ├── MenuItem.js             # Menu item catalog & categories
│   │   ├── Table.js                # Restaurant tables (T1–T10)
│   │   ├── Order.js                # Live orders with item snapshots
│   │   ├── Bill.js                 # Final invoices with tax & price freezing
│   │   └── Payment.js              # Multi-mode payment records
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── menuRoutes.js
│   │   ├── tableRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── billRoutes.js
│   │   └── reportRoutes.js
│   ├── seed/
│   │   └── seeder.js               # Idempotent database seeder
│   ├── test/
│   │   └── test-auth.js            # Automated test suite (15 assertions)
│   ├── utils/
│   │   ├── apiResponse.js          # Standardized JSON response formatting
│   │   └── jwt.js                  # Token generation and cookie issuance
│   ├── .env.example                # Template environment variables
│   ├── .env                        # Local development environment
│   ├── server.js                   # Express application entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── LoadingSpinner.jsx
    │   │   │   ├── ProtectedRoute.jsx
    │   │   │   └── RoleGuard.jsx
    │   │   ├── layout/
    │   │   │   ├── AppLayout.jsx
    │   │   │   ├── Header.jsx
    │   │   │   └── Sidebar.jsx
    │   │   └── ui/
    │   │       ├── Badge.jsx
    │   │       ├── Button.jsx
    │   │       ├── Card.jsx
    │   │       └── Input.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx     # Global authentication provider
    │   ├── pages/
    │   │   ├── Login.jsx           # POS login with quick demo filler
    │   │   ├── Dashboard.jsx       # Real-time metrics & session summary
    │   │   ├── Tables.jsx          # Table floor status (T1–T10)
    │   │   ├── MenuManagement.jsx  # Dish catalog & category filter
    │   │   ├── BillHistory.jsx     # Invoice archive & audit log
    │   │   └── Reports.jsx         # Revenue analytics (Admin only)
    │   ├── routes/
    │   │   └── AppRoutes.jsx       # Route configuration with role protection
    │   ├── services/
    │   │   ├── api.js              # Axios instance with credentials
    │   │   └── authService.js      # Auth API endpoints
    │   ├── App.jsx
    │   ├── index.css               # Tailwind directives & custom POS scrollbar
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 3. Database Schemas (Mongoose)

1. **User**: Name, username (unique), email (unique), password (bcrypt hashed, `select: false`), role (`admin` | `cashier`), isActive, timestamps.
2. **MenuItem**: Name, category (`Starters`, `Main Course`, `Breads`, `Biryani`, `Beverages`, `Desserts`), price, foodType (`veg` | `non-veg`), isAvailable, timestamps.
3. **Table**: TableNumber (T1–T10, unique), status (`free` | `running`), currentOrder (ref to Order), timestamps.
4. **Order**: OrderNumber (unique), orderType (`dine-in` | `takeaway`), table (ref to Table, nullable), items (snapshot of name, price, quantity, total), status (`open` | `billed` | `cancelled`), cashier (ref to User), subtotal, timestamps.
5. **Bill**: BillNumber (unique), order (ref), cashier (ref), orderType, tableNumber, items (frozen snapshots to preserve historical integrity against menu price changes), subtotal, discountType, discountValue, discountAmount, taxableAmount, cgst (2.5%), sgst (2.5%), grandTotal, roundOff, finalAmount, paymentStatus (`pending` | `partial` | `paid`), status (`active` | `cancelled`), timestamps.
6. **Payment**: Bill (ref), paymentMode (`cash` | `upi` | `card`), amount, receivedBy (ref to User), timestamps.

---

## 4. Test Credentials

The database is pre-seeded with two accounts for testing:

| Role | Username | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@urbanplate.com` | `admin123` | Full Access (Dashboard, Menu CRUD, Tables, Orders, Billing, Reports) |
| **Cashier** | `cashier` | `cashier@urbanplate.com` | `cashier123` | POS Operations (Orders, Tables, Billing, Bill History). *Restricted from Menu CRUD & Reports* |

> ⚠️ **Notice**: These credentials are for local development and hiring evaluation. In a production environment, default credentials must be rotated.

---

## 5. MongoDB Configuration Instructions

### Prerequisites
- MongoDB Community Server (v6.0 or v7.0+) installed and running locally, or a MongoDB Atlas URI.

### Connection Configuration
The backend connects using the `MONGO_URI` variable specified in `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/restaurant_billing
JWT_SECRET=super_secret_jwt_key_restaurant_billing_2026_urban_plate
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

To start MongoDB locally (if not already running):
```bash
# Windows
mongod --dbpath "C:\data\db" --bind_ip 127.0.0.1

# macOS / Linux
mongod --dbpath /data/db
```

---

## 6. Commands to Run Backend and Frontend

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Seed the Database
```bash
cd backend
npm run seed
```
*(The seed script is fully idempotent: running it multiple times safely preserves existing data without creating duplicates. Pass `--clean` to wipe and re-seed).*

### Step 3: Run Backend Test Suite
```bash
cd backend
npm test
```

### Step 4: Start the Applications
Open two terminal windows:

**Terminal 1 (Backend API on port 5000):**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 (Frontend Client on port 5173):**
```bash
cd frontend
npm run dev
# Vite runs at http://localhost:5173
```

---

## 7. API Endpoint Documentation

### Authentication & User

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates via username or email + password. Returns JWT and sets `HttpOnly` cookie. |
| `POST` | `/api/auth/logout` | Public/Private | Clears authentication cookie and invalidates session. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated user profile. |
| `GET` | `/api/health` | Public | System status and service health check. |

#### Login Request Payload
```json
{
  "identifier": "admin",
  "password": "admin123"
}
```

#### Login Success Response (HTTP 200)
```json
{
  "success": true,
  "message": "Welcome back, Admin Manager!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67406f97541e21b8...",
    "name": "Admin Manager",
    "username": "admin",
    "email": "admin@urbanplate.com",
    "role": "admin",
    "isActive": true
  }
}
```

### Menu Management

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | Cashier, Admin | List menu items (supports `?category=`, `?search=`). |
| `POST` | `/api/menu` | **Admin Only** | Add new dish (`403 Forbidden` if called by Cashier). |
| `PUT` | `/api/menu/:id` | **Admin Only** | Update dish price, availability, or details. |
| `DELETE`| `/api/menu/:id` | **Admin Only** | Remove dish from catalog. |

### Tables & Orders

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tables` | Cashier, Admin | List all tables (T1–T10) and occupancy status. |
| `PUT` | `/api/tables/:id/status`| Cashier, Admin | Update table state (`free` or `running`). |
| `GET` | `/api/orders` | Cashier, Admin | List orders (supports `?status=`, `?orderType=`). |
| `POST` | `/api/orders` | Cashier, Admin | Create order with item price/name snapshots. |

### Billing & Reports

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bills` | Cashier, Admin | Query invoice archive with pagination. |
| `POST` | `/api/bills` | Cashier, Admin | Generate final bill with GST 5% (2.5% CGST + 2.5% SGST). |
| `GET` | `/api/reports/dashboard`| **Admin Only** | Financial revenue metrics (`403 Forbidden` for Cashier). |

---

## 8. Test Execution Results

Running `npm test` executes the comprehensive automated integration suite (`backend/test/test-auth.js`):

```text
======================================================
 RUNNING BACKEND AUTH & ROLE-BASED ACCESS CONTROL TESTS
======================================================

[Server] Restaurant Billing API running on port 5000 in development mode
[MongoDB] Connected successfully: 127.0.0.1/restaurant_billing
GET /api/health 200 4.888 ms - 107
 ✔ PASS : Health check endpoint returns 200 OK
POST /api/auth/login 400 0.678 ms - 78
 ✔ PASS : Login with missing fields returns 400 Bad Request
POST /api/auth/login 401 15.470 ms - 65
 ✔ PASS : Login with non-existent user returns 401 Unauthorized
POST /api/auth/login 401 126.012 ms - 65
 ✔ PASS : Login with wrong password returns 401 Unauthorized
POST /api/auth/login 200 116.065 ms - 404
 ✔ PASS : Admin login with username succeeds, returns JWT and user payload
POST /api/auth/login 200 112.699 ms - 420
 ✔ PASS : Cashier login with email succeeds, returns JWT and user payload
 ✔ PASS : Auth endpoint sets secure HttpOnly cookie
GET /api/auth/me 401 0.537 ms - 93
 ✔ PASS : Accessing /api/auth/me without token returns 401 Unauthorized
GET /api/auth/me 200 5.281 ms - 254
 ✔ PASS : Admin fetches personal profile via JWT token (/api/auth/me)
GET /api/reports/dashboard 200 11.852 ms - 184
 ✔ PASS : Admin has authorized access to /api/reports/dashboard (200 OK)
GET /api/reports/dashboard 403 2.770 ms - 102
 ✔ PASS : Cashier role is denied access to Admin reports (403 Forbidden)
POST /api/menu 403 2.251 ms - 102
 ✔ PASS : Cashier role is denied creating menu items (403 Forbidden)
POST /api/menu 201 16.737 ms - 297
 ✔ PASS : Admin role successfully creates new menu item (201 Created)
GET /api/menu 200 14.828 ms - 6470
 ✔ PASS : Cashier is permitted to read menu items for billing/ordering (200 OK)
POST /api/auth/logout 200 0.548 ms - 58
 ✔ PASS : Logout endpoint returns 200 OK and clears session

------------------------------------------------------
 SUMMARY: 15 passed, 0 failed
------------------------------------------------------
```

---

## 9. Current Phase Status

- [x] **Phase 1: Foundation & Authentication** *(Completed)*
  - Monorepo initialized (`frontend/` & `backend/`).
  - All 6 Mongoose models implemented with snapshot integrity.
  - JWT auth with bcryptjs and HttpOnly cookies.
  - Role-based authorization middleware (`admin` vs `cashier`).
  - Idempotent database seeder (2 users, 10 tables, 28 menu items).
  - Automated integration tests passing.
  - Initial POS frontend layout, dark charcoal sidebar, responsive header, login screen, and protected routes.
- [x] **Phase 2: Dashboard, Menu Management, Tables & Orders** *(Completed)*
  - Interactive commercial POS Dashboard with Recharts analytics (Hourly sales velocity & category distribution).
  - Admin Menu Management: Full CRUD, instant availability toggle, FSSAI veg/non-veg indicators, category filtering, search, and delete protection.
  - Tables & Floor Plan: Live visual floor grid (T1–T10) with free/running status tracking.
  - 2-Column POS Order Punching Screen: Fast menu search, category filtering, real-time ticket cart, price snapshotting, and dine-in / takeaway routing.
  - Running Order Management: View active order tickets, append extra dishes (KOT additions), and order cancellation.
- [x] **Phase 3: Billing Calculations, 5% GST, Split Payments & Receipt Printing** *(Completed)*
  - Live GST 5% calculation engine (CGST 2.5% + SGST 2.5%) with nearest integer round-off.
  - Flexible discount support: Fixed (₹) and Percentage (%) with quick preset shortcuts.
  - Multi-mode payment settlement: Single mode (Cash, UPI, Card) or Split Payment (e.g., Cash + UPI).
  - Cash tendered and change-due automated calculations.
  - Professional restaurant tax invoice receipt layout with `@media print` thermal printing support.
  - Historical price freezing & immutability verified through automated test suites.
- [x] **Phase 4: Bill History Archive, Order Cancellations & Analytics** *(Completed)*
  - Comprehensive Bill Archive with multi-criteria filtering (date presets, payment status, dine-in/takeaway, active/cancelled).
  - Invoice Void / Cancellation workflow with required reason logging and audit trail (`cancelledBy`, `cancelledAt`).
  - Separation of realized sales from cancelled transactions in revenue calculations.
  - Detailed Analytics Dashboard (`/reports`): 6 KPI cards (Net Revenue, Orders Count, AOV, Discounts, GST 5%, Lost Revenue).
  - Recharts visual telemetry: Revenue pace area curves, payment channels breakdown, and top-selling dishes ranking.
  - One-click sales audit CSV export (`/api/reports/export-csv`) with role-based protection.
- [ ] **Phase 5: Production Deployment & Polish** *(Next)*
