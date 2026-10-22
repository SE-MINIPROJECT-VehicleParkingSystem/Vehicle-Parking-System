# Vehicle Parking System

## Team 10 — PES University

A web-based Vehicle Parking System developed as an academic mini-project to automate parking slot management, vehicle entry and exit tracking, fee calculation, and administrative reporting.

The system replaces manual, register-based parking management with a digital and real-time solution.

---

## Project Overview

The Vehicle Parking System provides a centralized platform for managing vehicles and parking slots within a parking facility.

The system allows:

- Vehicle owners to register and check real-time parking availability.
- Gate staff to record vehicle entries and exits.
- Automatic allocation of suitable parking slots.
- Automatic calculation of parking fees based on parking duration.
- Real-time tracking of parking slot status.
- Administrators to manage slots, pricing, staff accounts, and reports.

The system is designed for parking facilities such as college campuses, shopping malls, and corporate offices.

## Security and Quality Assurance

This repository includes a dedicated security and QA review for the parking system. See [SECURITY_QUALITY_ASSURANCE.md](SECURITY_QUALITY_ASSURANCE.md) for the authentication, authorization, risk assessment, and test strategy documentation.

---

## Current Status

| Feature | Status |
|---------|--------|
| Registration, login, logout, session (JWT in HTTP-only cookie) | Done |
| Account lockout after 3 failed logins, rate limiting | Done |
| Role-based access control (Owner, Staff, Admin) | Done |
| Vehicle entry and slot allocation (`POST /api/entries`, Staff/Admin only) | Done |
| Staff entry form in the web client | Done |
| Vehicle exit and fee calculation | Planned |
| Slot availability dashboard | Planned |
| Admin reports and pricing rules | Planned |

---

## Objectives

- Provide real-time visibility of available and occupied parking slots.
- Automate parking slot allocation and release.
- Automatically calculate parking charges based on duration.
- Maintain secure and searchable vehicle entry and exit records.
- Provide administrators with occupancy and revenue reports.
- Reduce congestion and errors associated with manual parking management.

---

## Main Features

### 1. User Registration & Authentication

- Vehicle owner registration.
- Secure login using email and password.
- Password hashing.
- JWT-based authentication.
- Role-based access control.
- Public registration creates Owner accounts only.
- Staff and Admin accounts are managed by an Administrator.
- Generic error messages for invalid login credentials.

### 2. Vehicle Entry & Slot Allocation

- Record vehicle number plate and vehicle type.
- Automatically allocate the nearest suitable available slot.
- Mark allocated slots as Occupied.
- Prevent duplicate vehicle entries.
- Display a Parking Full message when suitable slots are unavailable.
- Generate a unique entry ticket/reference number.

Implementation notes:

- Only one active session (no exit time) can exist per number plate. This is enforced by a partial unique index in MongoDB, so two simultaneous requests cannot both succeed.
- Slots are claimed with a single atomic update, so two vehicles cannot be given the same slot.
- If saving the session fails, the slot is released again. A failed release is logged loudly instead of hiding the original error.
- Transaction IDs (`TXN-` plus 16 hex characters) and ticket numbers (`TKT-YYMMDD-` plus 8 hex characters) are random, and the server retries with new values if an ID collision occurs.

### 3. Vehicle Exit & Fee Calculation

- Record vehicle exit.
- Calculate parking duration.
- Calculate parking fee according to configured pricing rules.
- Support cash and online payment methods.
- Generate digital parking receipts.
- Release the occupied slot after exit confirmation.

### 4. Real-Time Slot Availability & Tracking

- Display current parking slot availability.
- Show Available, Occupied, and Reserved slot statuses.
- Search/filter slots by zone and vehicle type.
- Update slot status in real time.
- Provide accurate availability counts.

### 5. Admin Dashboard & Reporting

- View parking occupancy information.
- Monitor revenue.
- Configure parking slots.
- Configure and update pricing rules.
- Manage staff accounts.
- Generate occupancy and revenue reports.
- Export reports in CSV/PDF formats.
- Restrict administrative functions to authorized users.

---

## User Roles

| Role | Responsibilities |
|------|------------------|
| **Vehicle Owner** | Register, log in, check slot availability, view parking history and receipts |
| **Gate Staff** | Record vehicle entry and exit at the parking gate |
| **Administrator** | Manage slots, pricing, staff accounts, and reports |

> Public users cannot self-register as Staff or Administrator. Staff and Administrator roles are assigned by an existing Administrator.

---

## Technology Stack

### Frontend
- React.js 18.x (built with Vite)

### Backend
- Node.js 20+
- Express.js 4.x

### Database
- MongoDB 6.x (MongoDB Atlas or local)

### Authentication
- JSON Web Tokens (JWT) stored in an HTTP-only cookie

### Real-Time Communication
- WebSockets / Socket.IO or short-interval polling (planned)

### Payment
- Optional payment gateway sandbox such as Razorpay/Stripe for online payment simulation

---

## System Architecture

The system follows a three-layer architecture:

```text
+-----------------------------+
|       Client Layer          |
|        React.js             |
|                             |
| Owner | Gate Staff | Admin  |
+-------------+---------------+
              |
              | HTTPS / REST API
              v
+-----------------------------+
|    Application Layer        |
|    Node.js + Express.js     |
|                             |
| Authentication              |
| Slot Allocation             |
| Fee Calculation             |
| Business Logic              |
+-------------+---------------+
              |
              v
+-----------------------------+
|         Data Layer          |
|          MongoDB            |
|                             |
| Users                       |
| Vehicles                    |
| Parking Slots               |
| Transactions                |
+-----------------------------+
```

---

## Project Structure

```text
Vehicle-Parking-System/
├── client/                  React frontend (Vite)
│   └── src/
│       ├── main.jsx         Login, register, session, role-based screens
│       ├── EntryForm.jsx    Staff vehicle entry form
│       └── style.css
├── server/                  Express API
│   ├── src/
│   │   ├── app.js           App setup, middleware, routes
│   │   ├── server.js        Starts the server after connecting to MongoDB
│   │   ├── config/          Database connection
│   │   ├── controllers/     authController, entryController
│   │   ├── middleware/      requireAuth, requireRole
│   │   ├── models/          User, Vehicle, ParkingSlot, ParkingTransaction
│   │   ├── routes/          authRoutes, entryRoutes
│   │   ├── scripts/         seed.js (Admin, Staff, parking slots)
│   │   └── utils/           apiResponse, validators
│   └── test/                Jest tests
└── docs/                    Pull request template
```

---

## Running Locally

**Requirements:** Node.js 20 or newer, and a MongoDB database (MongoDB Atlas or a local installation).

### 1. Backend

```bash
cd server
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Edit `server/.env` and set:

- `MONGODB_URI`: your real connection string, with no `<` or `>` placeholders left in it. Use a database name, for example `.../parking?retryWrites=true&w=majority`. For Atlas, also allow your IP address under Network Access.
- `JWT_SECRET`: at least 32 random characters. Generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- Optionally change the `SEED_*` values.

Then install, seed and start:

```bash
npm install
npm run seed              # creates the Admin account, Staff account and parking slots
npm run dev               # API on http://localhost:5000
```

You should see `MongoDB connected` and `API listening on port 5000`. Check `http://localhost:5000/api/health`.

### 2. Frontend

```bash
cd client
npm install
npm run dev               # App on http://localhost:5173
```

The client calls `http://localhost:5000/api` by default. To use a different API, set `VITE_API_URL` (for example `https://your-api.example.com/api`).

### 3. Seeded accounts

`npm run seed` creates one Admin and one Staff account from the `SEED_*` values in `server/.env`:

| Role | Email (default) | Password (default) |
|------|-----------------|--------------------|
| Admin | `admin@example.com` | `ChangeThisAdminPassword123!` |
| Staff | `staff@example.com` | `ChangeThisStaffPassword123!` |

- Change these values before using a shared or deployed database.
- The seed skips accounts whose email already exists, so changing `.env` later does not update existing users.
- Public registration always creates an Owner. Staff and Admin accounts can only be created by the seed script (or by editing the `role` field in the database).
- Never commit `.env`; it is listed in `.gitignore`.

### 4. Tests and lint

```bash
cd server
npm test
npm run lint
```

To check the client builds:

```bash
cd client
npm run build
```

---

## API Reference

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register an Owner account |
| POST | `/api/auth/login` | Public | Log in (sets the session cookie) |
| POST | `/api/auth/logout` | Public | Log out |
| GET | `/api/auth/me` | Logged in | Current user |
| POST | `/api/entries` | Staff, Admin | Record a vehicle entry |

### `POST /api/entries`

Request body:

```json
{ "numberPlate": "KA01AB1234", "vehicleType": "Four-wheeler" }
```

`vehicleType` must be `Two-wheeler`, `Four-wheeler` or `Other`. The number plate is normalised (spaces and hyphens removed, upper case) and must be 4 to 15 letters or digits.

Success (201) returns the transaction ID, entry ticket number, number plate, vehicle type, slot ID and entry time.

| Status | Meaning |
|--------|---------|
| 400 | Invalid number plate or vehicle type |
| 401 | Not logged in |
| 403 | Logged in, but not Staff or Admin |
| 409 | The vehicle already has an active session, or no slot is free for that vehicle type |

---

## Deployment Notes

- The frontend (Vite) can be hosted on Vercel or Netlify with Root Directory `client`. Set `VITE_API_URL` to the deployed API.
- The backend can be hosted on Render or similar with Root Directory `server`, Build Command `npm install` and Start Command `npm start`. Set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production` and `CLIENT_ORIGIN` (the frontend URL, without a trailing slash).
- If the frontend and backend are on different domains, the login cookie may not be sent on cross-site requests. Serve the API through a same-domain proxy or rewrite (for example a Vercel rewrite from `/api` to the backend), or adjust the cookie `sameSite` setting.
- A frontend deployment shows new UI only after the branch is merged and redeployed, and new API routes work only after the backend is redeployed too.
