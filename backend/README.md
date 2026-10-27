# FACILITRACK

**An Integrated Mobile and Web-Based School Facility Issue Reporting and Maintenance Monitoring System for Cavite State University – Imus Campus**

FACILITRACK lets campus users report damaged or faulty facilities from their phones, routes each report to the right maintenance trade unit, generates digital job orders, and lets technicians and coordinators track repair progress in real time.

> **Project status: ~50% milestone.** The core workflow is working end to end: reporter submits, system routes, coordinator creates a job order, technician updates progress, everyone sees the change live. See [Feature status](#feature-status) for what is done and what is still on the backlog.

---

## Table of contents

1. [How the system works](#how-the-system-works)
2. [Tech stack](#tech-stack)
3. [Repository structure](#repository-structure)
4. [Prerequisites](#prerequisites)
5. [First-time setup](#first-time-setup)
6. [Running the project](#running-the-project)
7. [Test accounts](#test-accounts)
8. [Running the mobile app on a phone](#running-the-mobile-app-on-a-phone)
9. [API reference](#api-reference)
10. [Real-time events](#real-time-events)
11. [Data model](#data-model)
12. [Feature status](#feature-status)
13. [Testing](#testing)
14. [Git workflow for the team](#git-workflow-for-the-team)
15. [Troubleshooting](#troubleshooting)
16. [Important rules and design decisions](#important-rules-and-design-decisions)

---

## How the system works

```
Reporter (mobile)      Coordinator (web)        Technician (mobile)
      |                       |                         |
 1. Submit report             |                         |
    + location, category,     |                         |
    urgency, required photo   |                         |
      |                       |                         |
      |---- system proposes a trade unit from the category (rule-based) ----|
      |                       |                         |
      |                2. Review report                 |
      |                   confirm or reassign           |
      |                   trade unit                    |
      |                3. Generate job order            |
      |                   (JO-2026-0001, ...)           |
      |                   assign technician             |
      |                       |------------------------>|
      |                       |                  4. Start work
      |                       |                  5. Mark completed
      |<------------- live status updates (Socket.IO) -------------------->|
```

Every status change is written to the `StatusLog` table, so each report has a complete audit trail.

**Status flow:** `SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → COMPLETED`

**Urgency levels:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

**Roles:**

| Role | Uses | Can do |
|---|---|---|
| `REPORTER` | Mobile app | Submit reports with a photo, view own reports and history |
| `TECHNICIAN` | Mobile app | View own assigned jobs, start work, mark completed |
| `COORDINATOR` | Web dashboard | View all reports, confirm or reassign trade unit, create job orders, assign technicians |
| `ADMIN` | Web dashboard | Same access as coordinator for now |

Students, faculty, and staff are all `REPORTER` accounts, distinguished by the `userType` field.

---

## Tech stack

| Part | Technology |
|---|---|
| Backend | NestJS (CommonJS), TypeScript, Prisma 6, PostgreSQL |
| Database host | Supabase (PostgreSQL) |
| Auth | JWT with role-based guards |
| Real-time | Socket.IO |
| Photo storage | Local `backend/uploads/` folder (Supabase Storage planned) |
| Web dashboard | React, TypeScript, Vite, React Router, Axios |
| Mobile app | Flutter (Dart), Dio, Provider, image_picker, socket_io_client |

---

## Repository structure

```
facilitrack/
├── backend/            NestJS API
│   ├── prisma/         schema.prisma and seed.ts
│   ├── src/
│   │   ├── auth/       login, JWT strategy, role guards
│   │   ├── reports/    report endpoints, photo upload, routing
│   │   ├── job-orders/ job order endpoints, technician updates
│   │   ├── events/     Socket.IO gateway
│   │   └── prisma/     database service
│   └── uploads/        uploaded photos (not tracked by Git)
├── web/                React coordinator dashboard
│   └── src/
│       ├── pages/      Login, Reports, ReportDetail, JobOrders
│       └── ...         api, auth, socket, types, formatting helpers
├── mobile/             Flutter app
│   └── lib/
│       ├── core/       config, API client, realtime, formatting
│       └── features/   auth, reports, jobs, home
└── README.md
```

---

## Prerequisites

Install these before you start:

| Tool | Version / notes |
|---|---|
| Node.js | LTS (v20 or newer) |
| Git | Any recent version |
| Flutter SDK | Stable channel; run `flutter doctor` and fix any red items |
| Android Studio | For the Android SDK, command-line tools, and emulator |
| VS Code | Recommended editor |
| Postman | For testing the API |
| A PostgreSQL database | A free [Supabase](https://supabase.com) project works |

For the Flutter Android toolchain, install **Android SDK Command-line Tools** from Android Studio's SDK Manager, then run `flutter doctor --android-licenses` and accept everything.

---

## First-time setup

### 1. Clone the repository

```bash
git clone https://github.com/xenzu07/facilitrack.git
cd facilitrack
```

### 2. Set up the database

You have two options:

- **Use the team's shared dev database.** Ask the project owner for the `DATABASE_URL` through a private channel. Everyone then shares the same test data.
- **Create your own database.** Create a free Supabase project and use your own connection string. This keeps your test data separate.

For Supabase, go to **Connect → Session pooler (port 5432)** and copy the connection string. The username looks like `postgres.<project-ref>`, not plain `postgres`. Replace `[YOUR-PASSWORD]` with your real password and remove the square brackets. Use a password with letters and numbers only, since symbols can break the URL.

### 3. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<host>.pooler.supabase.com:5432/postgres"
JWT_SECRET="any-long-random-string"
```

> **Never commit `.env`.** It is listed in `.gitignore`. If you ever see it in `git status`, stop and tell the team.

Then create the tables and seed the starting data (only needed for a new, empty database):

```bash
npx prisma db push
npx prisma generate
npx prisma db seed
```

The seed creates the 8 trade units, 11 issue categories, 12 sample locations, and the test accounts listed below. It is safe to run more than once.

### 4. Web dashboard

```bash
cd web
npm install
```

The dashboard talks to `http://localhost:3000` by default. To point it elsewhere, create `web/.env` with `VITE_API_URL=http://<host>:3000`.

### 5. Mobile app

```bash
cd mobile
flutter pub get
```

Then set the server address in `mobile/lib/core/config.dart` (see [Running the mobile app on a phone](#running-the-mobile-app-on-a-phone)).

---

## Running the project

Open **three terminals** from the repository root.

**Terminal 1: backend**
```bash
cd backend
npm run start:dev
```
Wait for `Nest application successfully started`. The API runs at `http://localhost:3000`.

**Terminal 2: web dashboard**
```bash
cd web
npm run dev
```
Open `http://localhost:5173` and sign in as the coordinator.

**Terminal 3: mobile app**
```bash
cd mobile
flutter devices
flutter run -d <device id>
```

**Database viewer** (optional):
```bash
cd backend
npx prisma studio
```
Opens at `http://localhost:5555`.

---

## Test accounts

All seeded accounts use the password **`password123`**. These are for development only and must be removed or changed before any real deployment.

| Email | Role | Trade unit |
|---|---|---|
| `student@test.com` | Reporter (student) | n/a |
| `faculty@test.com` | Reporter (faculty) | n/a |
| `coordinator@test.com` | Coordinator | n/a |
| `admin@test.com` | Admin | n/a |
| `plumber@test.com` | Technician | Plumbing |
| `electrician@test.com` | Technician | Electrical |

If your seed file also includes `electrician2@test.com` and `plumber2@test.com`, those are extra technicians, handy for testing reassignment.

The web dashboard only accepts coordinator and admin accounts. Reporters and technicians use the mobile app.

---

## Running the mobile app on a phone

The app must reach your computer's backend. The address depends on where the app runs:

| Where the app runs | Server address |
|---|---|
| Android emulator | `http://10.0.2.2:3000` (default) |
| Chrome (flutter run -d chrome) | `http://localhost:3000` (set automatically) |
| Real phone on the same Wi-Fi | `http://<your PC's IPv4>:3000` |

Edit `_mobileUrl` in `mobile/lib/core/config.dart`:

```dart
static const String _mobileUrl = 'http://192.168.1.15:3000';
```

### Real phone checklist

1. Enable **Developer options** and **USB debugging** on the phone, plug it in with a data cable, and accept the prompt.
2. Run `flutter devices` and copy your phone's id.
3. Find your PC's IP address with `ipconfig` (Wi-Fi adapter, **IPv4 Address**).
4. Put the phone and the PC on the same Wi-Fi network.
5. Allow the API through the Windows firewall (PowerShell as Administrator):
   ```powershell
   New-NetFirewallRule -DisplayName "FACILITRACK API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
   ```
6. From the phone's browser, open `http://<your PC IP>:3000/reports/options`. Seeing an "Unauthorized" JSON message means the phone can reach the server.
7. Run `flutter run -d <device id>`.

**If the Wi-Fi blocks device-to-device traffic** (common on campus networks), use the USB tunnel instead:
```powershell
adb reverse tcp:3000 tcp:3000
```
Then set `_mobileUrl` to `http://localhost:3000`. Repeat the command each time you reconnect the phone.

### Android manifest

The app uses plain HTTP during development. `android/app/src/main/AndroidManifest.xml` must contain the internet permission and `android:usesCleartextTraffic="true"` on the `<application>` tag. Both are already set. Remove cleartext traffic and use HTTPS before any real release.

### Using Chrome for quick checks

`flutter run -d chrome` works for login, lists, and details. Camera behavior differs on the web, so test report submission on a real phone or emulator.

---

## API reference

Base URL: `http://localhost:3000`. All routes except login need the header `Authorization: Bearer <token>`.

### Auth

| Method | Route | Roles | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Body `{ email, password }`. Returns `accessToken` and `user` |
| GET | `/auth/me` | any | Returns the current user id and role |

### Reports

| Method | Route | Roles | Description |
|---|---|---|---|
| GET | `/reports/options` | any | Categories (with default trade unit), locations, urgency values |
| POST | `/reports` | Reporter | Multipart form: `locationId`, `categoryId`, `urgency`, `description`, `photo` (required, image only, max 5 MB) |
| GET | `/reports/mine` | Reporter | The current user's reports |
| GET | `/reports` | Coordinator, Admin | All reports. Filters: `?status=`, `?urgency=`, `?categoryId=` |
| GET | `/reports/:id` | Owner, Coordinator, Admin | One report with photos, job order, and status history |
| PATCH | `/reports/:id/route` | Coordinator, Admin | Body `{ tradeUnitId, remarks? }`. Confirms or changes the trade unit |

### Job orders

| Method | Route | Roles | Description |
|---|---|---|---|
| POST | `/job-orders` | Coordinator, Admin | Body `{ reportId, tradeUnitId?, technicianId?, materialsNote?, targetDate? }`. Generates `JO-YYYY-NNNN` |
| GET | `/job-orders/technicians` | Coordinator, Admin | Technicians. Optional `?tradeUnitId=` |
| GET | `/job-orders/assigned` | Technician | Only the logged-in technician's jobs |
| GET | `/job-orders` | Coordinator, Admin | All job orders. Optional `?status=` |
| GET | `/job-orders/:id` | Coordinator, Admin, assigned Technician, owning Reporter | One job order |
| PATCH | `/job-orders/:id/technician` | Coordinator, Admin | Body `{ technicianId }`. Only while the job is `ASSIGNED` |
| PATCH | `/job-orders/:id/status` | Technician | Body `{ status, remarks? }`. Only `ASSIGNED → IN_PROGRESS → COMPLETED`, only on own jobs |

### Common responses

| Code | Meaning |
|---|---|
| 400 | Validation failed, missing photo, or an invalid status change |
| 401 | Missing, expired, or invalid token, or wrong password |
| 403 | Your role is not allowed, or the job or report is not yours |
| 404 | Record not found |
| 409 | A job order already exists for that report |

---

## Real-time events

The backend runs a Socket.IO gateway on the same port as the API.

- **Connect** with the JWT in the handshake: `io(url, { auth: { token } })`. Connections without a valid token are disconnected.
- **Event:** `report.statusChanged`
- **Payload:**
  ```json
  {
    "reportId": "uuid",
    "jobOrderId": "uuid or null",
    "status": "IN_PROGRESS",
    "message": "JO-2026-0001 is now in progress",
    "at": "2026-10-27T03:36:18.787Z"
  }
  ```
- **Who receives it:** coordinators and admins receive every event. A reporter receives events for their own reports. A technician receives events for their own jobs, including when a job is reassigned away from them.
- Clients react by reloading from the normal REST API, so REST stays the single source of truth.

---

## Data model

| Table | Purpose |
|---|---|
| `User` | Accounts with a role, optional `userType`, and a `tradeUnitId` for technicians |
| `TradeUnit` | Electrical, Carpentry, Plumbing, Welding, Masonry, Painting, Mechanical, Utility |
| `IssueCategory` | Each category has a default trade unit. This is the routing rule |
| `Location` | Building, floor, and room (unique combination) |
| `Report` | The facility issue, with urgency, status, and the proposed trade unit |
| `ReportPhoto` | One or more photos per report |
| `JobOrder` | `jobOrderNo`, trade unit, technician, optional materials note and target date, status |
| `StatusLog` | One row per change: old status, new status, remarks, who changed it, when |

The full schema is in `backend/prisma/schema.prisma`.

---

## Feature status

### Done

- Login and role-based access control (reporter, technician, coordinator, admin)
- Report submission with required photo, location, category, and urgency
- Rule-based routing from category to trade unit, with coordinator confirm or reassign
- Digital job order generation with unique sequential numbers
- Technician assignment and reassignment, with the previous technician named in the history
- Technician job list and status updates (`IN_PROGRESS`, `COMPLETED`) with remarks
- Complete status history for every report
- Coordinator dashboard with filters, status counts, report detail, and job order list
- Real-time updates over Socket.IO on the dashboard and mobile app
- Clear error messages when the server or network is unreachable

### Backlog (not built yet)

- Material delay notices and revised target dates (`DELAYED` status)
- Completion verification, printed job order sign-off, and feedback ratings
- Maintenance history and reports for administrators
- Printable job order form
- Firebase Cloud Messaging push notifications
- Supabase Storage for photos (currently saved to the local `uploads/` folder)
- Secure token storage on mobile (currently `shared_preferences`)
- Deployment of the backend and dashboard
- Removal of the temporary `/auth/coordinator-only` test route

### Out of scope by design

- Offline report submission (the system requires a network connection)
- Predictive or AI-based assignment (routing is rule-based, with coordinator review)
- Purchasing materials, budgeting, or performing repairs

---

## Testing

The thesis (Chapter III) requires documented functional tests. Keep a shared test log with these columns: **Test ID, Scenario, Steps, Expected, Actual, Pass/Fail, Date**.

Things to keep covered in the log:

- Report without a photo is rejected (400)
- Reporter calling a coordinator route gets 403
- A technician cannot open or update another technician's job (403)
- A category routes to the correct trade unit
- A coordinator reassignment is recorded in the status history
- A status change appears on a second connected device without refreshing
- Submitting with no connection shows a clear error message
- A socket connection without a token is disconnected

Use a shared Postman collection for API tests. For manual app tests, run the demo path: **student submits → coordinator confirms and generates the job order → technician starts and completes → student sees the full history.**

---

## Git workflow for the team

1. **Pull before you start working:**
   ```bash
   git pull
   ```
2. **Work on a branch**, not directly on `main`:
   ```bash
   git checkout -b feature/short-description
   ```
   Examples: `feature/material-delay-notice`, `fix/photo-upload-error`.
3. **Commit small and often** with clear messages:
   ```bash
   git add .
   git commit -m "add material delay notice endpoint"
   ```
4. **Push your branch and open a pull request** on GitHub for review:
   ```bash
   git push -u origin feature/short-description
   ```
5. **Merge to `main`** only after someone else has looked at it and the app still runs.

### Never commit

- `backend/.env` or any file with passwords or keys
- `node_modules/`, `build/`, `dist/`
- `backend/uploads/` (test photos)

Run `git status` before every commit and read the list.

### Changing the database schema

`prisma/schema.prisma` is shared, so coordinate schema changes with the team.

1. Edit `schema.prisma` (enum values go **one per line**).
2. Run `npx prisma db push` and `npx prisma generate`.
3. Update `seed.ts` if the change needs new starting data.
4. Tell the team in the pull request so everyone runs `npx prisma db push` and `npx prisma generate` after pulling.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` in Postman or the app | The backend is not running. Start `npm run start:dev` in `backend` |
| Prisma error `P1000: Authentication failed` | Wrong database credentials. On the Supabase pooler the username must be `postgres.<project-ref>`, and the password must have no square brackets or symbols |
| Prisma `P1012` "not an enum value definition" | Enum values must each be on their own line in `schema.prisma` |
| `Role` or other Prisma types not found | Run `npx prisma generate`, then restart the backend |
| `Cannot POST /reports/options` or similar 404 | Wrong HTTP method or URL. Check the [API reference](#api-reference) |
| Dashboard shows **Offline** | Backend not running, or sign out and in again to reconnect the socket |
| Phone shows "No internet connection or server unreachable" | Wrong `_mobileUrl`, different Wi-Fi networks, or the firewall rule is missing. Run the phone browser check in the real phone checklist |
| `Cleartext HTTP traffic not permitted` | `usesCleartextTraffic="true"` is missing from `AndroidManifest.xml`. Stop and rerun `flutter run` |
| Mobile build fails after adding a package | Stop the app fully and run `flutter run` again. Hot reload is not enough for new plugins |
| Report form fails in Chrome | Use a real phone or emulator for photo submission |
| `flutter doctor` reports missing `cmdline-tools` | Install Android SDK Command-line Tools in Android Studio, then `flutter doctor --android-licenses` |
| Photo upload returns "Only image files are allowed" | The file is not an image, or the upload field name is not `photo` |
| Photo upload fails for a large file | The limit is 5 MB. Use a smaller image |
| Port 3000 already in use | Close the other backend terminal, or run `Get-Process node \| Stop-Process` |
| Two `.git` folders (`backend/.git`) | Delete `backend/.git`. The repository root is the only one |

---

## Important rules and design decisions

1. **Role enforcement happens on the backend.** Hiding a button in the app is not security. Every protected route uses the JWT guard and the role guard.
2. **Routing is a database lookup, not AI.** `IssueCategory.defaultTradeUnitId` decides the proposed unit, and a coordinator can always change it.
3. **Never invent data.** Materials and target dates stay empty when unknown. The system must not fill them in.
4. **A photo is required** for every report, enforced on both the app and the server.
5. **Status changes are always logged.** Any code that changes a status must write a `StatusLog` row in the same transaction.
6. **Realtime notifications never block a save.** A failed emit is logged and ignored.
7. **Prisma is pinned to version 6.** Do not upgrade to a newer major version without checking the configuration changes.
8. **The system records and communicates information.** It does not purchase materials, approve budgets, or perform repairs.
9. **Technicians can only change a job's status along `ASSIGNED → IN_PROGRESS → COMPLETED`**, and only for jobs assigned to them.
10. **Official status names, categories, locations, and the job order form fields must be confirmed with the General Services Office** before the final version. Current values are working placeholders.

---

## Team

| Name | Role |
|---|---|
| _Add member name_ | _e.g. Backend_ |
| _Add member name_ | _e.g. Mobile_ |
| _Add member name_ | _e.g. Web_ |

**Adviser:** _Add adviser name_

**Client office:** General Services Office, Cavite State University – Imus Campus
