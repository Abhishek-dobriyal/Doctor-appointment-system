<<<<<<< HEAD
# Doctor Appointment & Project Management System

Production-structured MVP: **Express + MongoDB (Mongoose)** REST API, **vanilla HTML/CSS/JS** frontend, **JWT + bcrypt** auth, **RBAC** (patient / doctor / admin), appointments, treatment **projects & tasks**, file uploads, mock prescriptions, optional **simulated 2FA**, and **30-minute inactivity** session expiry.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) running locally or a connection string (MongoDB Atlas)

## Folder layout

```
doctor appointment system/
├── backend/           # Express API (MVC)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── uploads/       # created at runtime (health files)
│   └── server.js
├── frontend/          # Static UI
│   ├── css/
│   ├── js/
│   ├── patient/
│   ├── doctor/
│   └── admin/
└── README.md
```

## Setup

### 1. MongoDB

Start MongoDB (example: local default port `27017`), or use Atlas and copy the SRV URI.

### 2. Backend environment

```powershell
cd backend
copy .env.example .env
```

Edit **`.env`**:

- `MONGODB_URI` — e.g. `mongodb://127.0.0.1:27017/doctor_appointment_app`
- `JWT_SECRET` — long random string (required for production)
- `PORT` — default `5000` (serves API + frontend)
- `FRONTEND_URL` — e.g. `http://127.0.0.1:5000` (used by CORS)

### 3. Install and run

```powershell
cd backend
npm install
npm start
```

Open **http://127.0.0.1:5000** (or your `PORT`).

### 4. Create the first admin

Registration only creates **patients**. To create an **admin** (and then doctors):

1. Add to `.env`:

   ```env
   SEED_ADMIN_EMAIL=admin@example.com
   SEED_ADMIN_PASSWORD=YourSecurePassword123
   ```

2. Run:

   ```powershell
   npm run seed:admin
   ```

3. Log in as that admin, open **Users**, and create **doctor** accounts (set specialization and optional availability on the doctor profile after they log in).

## API overview (all under `/api`)

| Area            | Examples |
|-----------------|----------|
| Auth            | `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-otp`, `GET /auth/me`, `PATCH /auth/otp-setting` |
| Users / doctors | `GET /users/doctors?q=&specialty=&day=`, `PATCH /users/profile`, `POST /users/change-password` |
| Admin users     | `GET/POST/PATCH/DELETE /users/admin/users/...` |
| Appointments    | `POST /appointments`, `GET /appointments`, `GET /appointments/slots/:doctorId`, `PATCH /appointments/:id/status` |
| Projects/tasks  | `POST /projects`, `GET /projects`, `GET /projects/:id`, `POST /projects/:projectId/tasks`, `PATCH /projects/tasks/:taskId` |
| Health files    | `POST /health` (multipart `file` + `label`), `GET /health/mine`, `GET /health/download/:id`, admin: `GET /health/admin/all`, `DELETE /health/:id` |
| Prescriptions   | `POST /prescriptions`, `GET /prescriptions/mine`, `GET /prescriptions/pdf/:token` (HTML mock PDF) |
| Admin           | `GET /admin/stats`, `GET /admin/export/csv` |

All protected routes expect: `Authorization: Bearer <JWT>`.

## Security notes (MVP)

- Passwords hashed with **bcrypt** (cost 12).
- **JWT** verified on each request; **last activity** updated; **30 minutes** of no API calls invalidates the session.
- **express-validator** on inputs; role checks on routes.
- 2FA is a **demo**: OTP is logged to the **server console** when enabled on an account.

## Frontend features

- Responsive layout: **navbar**, **sidebar** on dashboards, **cards**, **toasts** + alerts for notifications.
- **Dark mode** toggle (persisted in `localStorage`).
- **Patient**: profile, doctor search/filters, book slots (15/30/60 min), appointments, prescriptions (mock PDF), projects/tasks, uploads.
- **Doctor**: profile, weekly availability (minute-based blocks), accept/reject/complete appointments, mock video/chat consultation UI, projects/tasks, prescriptions.
- **Admin**: stats, user CRUD, delete uploads, CSV export.

## License

Use and modify freely for learning or as a starter for your own product.
=======
# Doctor-appointment-system
>>>>>>> fdc483869471f335c9172c427d4650924e65560c
