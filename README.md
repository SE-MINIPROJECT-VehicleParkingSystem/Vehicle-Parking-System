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
- React.js 18.x

### Backend
- Node.js 18+
- Express.js 4.x

### Database
- MongoDB 6.x

### Authentication
- JSON Web Tokens (JWT)

### Real-Time Communication
- WebSockets / Socket.IO or short-interval polling

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
