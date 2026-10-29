# ZonoFit — Hosting Guide (Hostinger only, no AWS, no Vercel)

## Layout

| Folder | Domain | What it is | Runs on |
|---|---|---|---|
| `website/` | `zonofit.com` | Public site (landing & marketing) | Hostinger → Node.js web app #1 |
| `gym-portal/` | `gym.zonofit.com` | Gym partner login + dashboard | Hostinger → Node.js web app #2 |
| `admin-portal/` | `admin.zonofit.com` | Admin login + dashboard | Hostinger → Node.js web app #3 |
| `server/` | `api.zonofit.com` | Express API + MySQL + disk uploads | Hostinger (Node.js app or VPS) |

> **Database Note:** The backend has been fully migrated from PostgreSQL + PostGIS to **MySQL**.
> You can now use Hostinger's built-in managed MySQL database (under **Databases → Management** in hPanel)
> without needing PostgreSQL or PostGIS extensions. Native spherical distance calculation (`ST_Distance_Sphere`)
> is used directly.

Each portal calls its own `/api/*`, which Next proxies to `API_URL` (default
`https://api.zonofit.com`). No CORS setup is needed for the websites.

---

## Part 1 — Frontends on Hostinger Unlimited

Do this once per app. Labels in hPanel may differ slightly.

1. hPanel → **Websites → Add website → Node.js Apps** → import this GitHub repo.
2. Set the **root directory**, build and start commands:

   | App | Root directory | Build | Start |
   |---|---|---|---|
   | public | `website` | `npm install && npm run build` | `npm run start` |
   | gym | `gym-portal` | `npm install && npm run build` | `npm run start` |
   | admin | `admin-portal` | `npm install && npm run build` | `npm run start` |

   Node version: 20 or newer (Next 16 needs ≥ 20.9).
3. Add **environment variables** (they must exist at *build* time):

   | App | Variable | Value |
   |---|---|---|
   | public | `NEXT_PUBLIC_GYM_URL` | `https://gym.zonofit.com` |
   | gym | `API_URL` | `https://api.zonofit.com` |
   | gym | `NEXT_PUBLIC_SITE_URL` | `https://zonofit.com` |
   | admin | `API_URL` | `https://api.zonofit.com` |

4. Attach the domain to each app: `zonofit.com` (+ `www`), `gym.zonofit.com`,
   `admin.zonofit.com`. Hostinger issues the SSL certificates automatically.
5. Redeploy each app after changing env vars.

Test locally first if you like:

```bash
cd gym-portal && npm install && API_URL=http://localhost:3000 npm run dev   # http://localhost:3001
cd admin-portal && npm install && API_URL=http://localhost:3000 npm run dev # http://localhost:3002
cd website && npm install && npm run dev                                     # http://localhost:3000 (change port if the API runs there)
```

## Part 2 — Backend + database on a Hostinger VPS

### 2.1 Database

The live database is already MySQL on Hostinger. Do not dump Postgres into it, and do not run `prisma migrate deploy` or `prisma db push` against it. The API creates missing columns, the OTP table, the rate-limit table, and the unique phone index on boot through `ensureSchema`.

`server/prisma/migrations/` is committed. Use the baseline only on a **new empty** database:

```bash
cd server && npx prisma migrate deploy
```

### 2.2 Prepare the VPS (Ubuntu 22.04/24.04)

```bash
apt update && apt install -y nginx postgresql postgresql-contrib postgis \
  postgresql-16-postgis-3 certbot python3-certbot-nginx git ufw
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
npm i -g pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

(Replace `postgresql-16-postgis-3` with the version `apt` shows for your Ubuntu.)

### 2.2 Create the MySQL Database on Hostinger

1. In Hostinger hPanel → **Databases → Management**.
2. Click **Create MySQL Database**:
   - **Database Name**: e.g. `zonofit` (Hostinger prefixes with your account username, e.g. `u123456_zonofit`)
   - **Username**: e.g. `zonofit_user` (e.g. `u123456_zonofit`)
   - **Password**: `<YOUR_STRONG_PASSWORD>`
3. Note the MySQL Host provided by Hostinger (usually `localhost` or `127.0.0.1`).

### 2.3 Deploy the API & Initialize Database

```bash
git clone <your-repo> /srv/zonofit && cd /srv/zonofit/server
npm install && npx prisma generate && npm run build

# Push database schema to your MySQL database:
npx prisma db push

# (Optional) Seed default membership plans and data:
npm run db:seed

# Prepare uploads directory for user avatars and gym photos
mkdir -p uploads
```

### 2.4 Environment Variables for the Server

Create `/srv/zonofit/server/.env` (or set in Hostinger Node.js app environment variables):

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:3306/<DB_NAME>"
JWT_SECRET=<long random string, e.g. `openssl rand -hex 48`>   # REQUIRED - never leave unset
PUBLIC_API_URL=https://api.zonofit.com
ALLOWED_ORIGINS=https://zonofit.com,https://gym.zonofit.com,https://admin.zonofit.com
FAST2SMS_API_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
ADMIN_EMAIL=...        # only used by seed-admin.ts
ADMIN_PASSWORD=...     # only used by seed-admin.ts
```

Start it:

```bash
pm2 start dist/index.js --name zonofit-api && pm2 save && pm2 startup
curl http://localhost:3000/health
```

### 2.5 HTTPS for the API

DNS: add an **A record** `api` → your VPS IP, then:

```nginx
# /etc/nginx/sites-available/api.zonofit.com
server {
    server_name api.zonofit.com;
    client_max_body_size 6m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/api.zonofit.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.zonofit.com
```

### 2.6 Fix old image links

Existing rows still point at S3. After the uploads are copied:

```sql
UPDATE users
SET "avatarUrl" = regexp_replace("avatarUrl", '^https://[^/]+/', 'https://api.zonofit.com/uploads/')
WHERE "avatarUrl" LIKE '%amazonaws.com%';
```

Other image URLs entered by admins (marketplace, trial gyms) may also be S3 links —
search for `amazonaws.com` in the admin pages' data and re-point or re-upload them.

### 2.7 Backups (must do — the DB holds money)

```bash
# /etc/cron.d/zonofit-backup  (daily 03:00, keep 14 days)
# Use the Hostinger MySQL user. Do not put the password in this file.
0 3 * * * root mysqldump --single-transaction u907802241_zonofit > /var/backups/zonofit-$(date +\%F).sql && find /var/backups -name 'zonofit-*.sql' -mtime +14 -delete
```

Also enable Hostinger's weekly VPS snapshots, and copy dumps off the server regularly.

### 2.8 Verify, then cut over

1. `https://api.zonofit.com/health` returns `{"status":"ok"}`.
2. Log in at `gym.zonofit.com` and `admin.zonofit.com`.
3. Load a few pages in each dashboard; upload an avatar from the app.
4. Point the DNS for `zonofit.com`, `gym.` and `admin.` at Hostinger (remove the Vercel records).
5. Delete the Vercel project.
6. Only now delete AWS (EC2, RDS if any, S3 bucket, Elastic IP). Keep the final dump.

## Part 3 — Mobile app (later)

The source app, website, and gym portal now call `https://api.zonofit.com`.
Phones that already have the old APK still call the previous server until you ship a new build.
`usesCleartextTraffic` is false in `app.json`.

## Known follow-ups

- The API refuses to start unless `JWT_SECRET` is a unique value of at least 32 characters.
  Put that value only in the Hostinger `server/.env`. Old tokens stop working after the secret changes.
- Copy `server/.env` onto the host. From `server/`, run `npm run rotate-admin` so the live admin hash matches `ADMIN_PASSWORD`. Until that script runs, the old admin password still works.
- In the Hostinger panel, set a new MySQL password and update `DATABASE_URL` on the host. Create new Razorpay keys and a new Fast2SMS key, then set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `FAST2SMS_API_KEY`. Do not put those values in git. Restart the API afterwards.
- Email codes are sent from `zonofitofficial@gmail.com`. Put the 16-letter Google app password in the host `server/.env` as `GMAIL_APP_PASSWORD`. Optional `GMAIL_USER` overrides the sender. Do not put that password in git.
- The committed baseline migration is for a new empty database only. The existing Hostinger database uses `ensureSchema` on boot. Do not run `prisma migrate deploy` or `prisma db push` against it.
- Uploads live on the server disk. `mysqldump` does not include them. Back up `server/uploads/` as well.
