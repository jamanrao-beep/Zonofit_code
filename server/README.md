# ZonoFit Server

Node.js + Express + TypeScript backend with Prisma ORM and PostgreSQL + PostGIS.

## Architecture

```
server/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client singleton
│   │   └── constants.ts      # Credit ↔ INR constants (single source of truth)
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   └── errorHandler.ts   # Global error handler
│   └── routes/
│       ├── auth.ts           # Auth endpoints
│       ├── users.ts          # User profile
│       ├── membership.ts     # Membership plans & activation
│       ├── credits.ts        # Credit balance, transactions, conversion
│       ├── gyms.ts           # Gym discovery (PostGIS spatial queries)
│       ├── bookings.ts       # Visit booking (atomic credit deduction)
│       └── checkin.ts        # QR check-in verification
└── prisma/
    ├── schema.prisma         # Database schema
    └── seed.ts               # Dev seed data
```

## Prerequisites

1. **PostgreSQL 14+** with **PostGIS extension**

   ```sql
   CREATE DATABASE zonofit;
   \c zonofit
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

2. **Node.js 20+**

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET (or related custom env variables)
```

### 3. Run database migrations

```bash
npm run db:migrate
```

> This creates all tables and enables the PostGIS extension via Prisma.

### 4. Seed development data

```bash
npm run db:seed
```

> Seeds 3 membership plans and 5 Mumbai gyms with PostGIS coordinates.

### 5. Start dev server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | ❌ | Health check |
| POST | `/api/auth/signup` | ❌ | Sign up new user |
| POST | `/api/auth/signin` | ❌ | Sign in user |
| POST | `/api/auth/verify` | ❌ | Verify OTP |
| GET | `/api/users/me` | ✅ | Full user profile + stats |
| PATCH | `/api/users/me` | ✅ | Update profile |
| GET | `/api/membership/plans` | ❌ | List membership plans |
| GET | `/api/membership/me` | ✅ | Current membership |
| POST | `/api/membership/activate` | ✅ | Activate after payment |
| GET | `/api/credits/balance` | ✅ | Authoritative credit balance |
| GET | `/api/credits/transactions` | ✅ | Transaction history |
| POST | `/api/credits/convert` | ✅ | Convert credits → INR cash |
| POST | `/api/credits/purchase` | ✅ | Record post-payment credit add |
| GET | `/api/gyms` | ✅ | List/search gyms (PostGIS near-me) |
| GET | `/api/gyms/:id` | ✅ | Gym detail + today's slots |
| GET | `/api/gyms/explore/near-primary` | ✅ | Gyms near user's primary gym |
| POST | `/api/bookings` | ✅ | Create booking (deducts credits) |
| GET | `/api/bookings` | ✅ | Booking history |
| GET | `/api/bookings/today` | ✅ | Today's active booking |
| DELETE | `/api/bookings/:id` | ✅ | Cancel + refund |
| POST | `/api/checkin/verify` | ✅ | Verify QR check-in |
| GET | `/api/checkin/pass/:bookingId` | ✅ | Get QR pass data |

## Credit System

- **1 Credit = ₹10** (display / fitness value)
- **1 Credit = ₹8** (when converting to withdrawable INR)
- All credit mutations are atomic DB transactions — never client-side
- Constants defined in `src/lib/constants.ts` — never duplicated

## PostGIS Spatial Queries

Gym discovery uses PostGIS for accurate, index-backed spatial queries:

```sql
-- Find gyms within 5KM of user's location
SELECT name, ST_Distance(location::geography, ST_MakePoint(lng, lat)::geography) as distance_m
FROM gyms
WHERE ST_DWithin(location::geography, ST_MakePoint(lng, lat)::geography, 5000)
ORDER BY distance_m;
```

The `location` column is `geometry(Point, 4326)` — SRID 4326 is WGS84 (standard GPS coordinates).
