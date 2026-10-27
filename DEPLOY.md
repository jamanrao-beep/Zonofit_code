# ZonoFit — Hosting Guide (Hostinger only, no AWS, no Vercel)

## Layout

| Folder | Domain | What it is | Runs on |
|---|---|---|---|
| `website/` | `zonofit.com` | Public site (static pages) | Hostinger Unlimited → Node.js web app #1 |
| `gym-portal/` | `gym.zonofit.com` | Gym partner login + dashboard | Hostinger Unlimited → Node.js web app #2 |
| `admin-portal/` | `admin.zonofit.com` | Admin login + dashboard | Hostinger Unlimited → Node.js web app #3 |
| `server/` | `api.zonofit.com` | Express API + Postgres/PostGIS + uploads | **Hostinger VPS** (see below) |

> **Important:** the Unlimited web-hosting plan can run the three Next.js apps, but it
> **cannot run Postgres + PostGIS** (shared hosting only gives MySQL), and the API needs
> a long-running server with cron jobs. To get rid of AWS you also need a **Hostinger VPS**
> (KVM 1 is enough to start; KVM 2 if you want headroom). That is a separate purchase.

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

### 2.1 Before you touch AWS (data safety)

Do these **while AWS is still running**, then only delete AWS after step 2.7 passes.

```bash
# on the AWS box or anywhere that can reach the DB
pg_dump -Fc "$AWS_DATABASE_URL" -f zonofit.dump          # full database backup
aws s3 sync s3://zonofit-images ./uploads                 # all uploaded images
```

> `server/prisma/migrations/` is git-ignored, so migrations are **not** in the repo.
> Do not rely on `prisma migrate` for the new database — restore the dump instead.

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

### 2.3 Create the database and restore

```bash
sudo -u postgres psql -c "CREATE USER zonofit WITH PASSWORD 'CHANGE_ME_STRONG';"
sudo -u postgres psql -c "CREATE DATABASE zonofit OWNER zonofit;"
sudo -u postgres psql -d zonofit -c "CREATE EXTENSION IF NOT EXISTS postgis;"
pg_restore --no-owner --role=zonofit -d "postgresql://zonofit:CHANGE_ME_STRONG@localhost/zonofit" zonofit.dump
```

Postgres must listen on `localhost` only (default). Do not open port 5432.

### 2.4 Deploy the API

```bash
git clone <your-repo> /srv/zonofit && cd /srv/zonofit/server
npm install && npx prisma generate && npm run build
mkdir -p uploads && cp -r /path/to/synced/uploads/* uploads/
```

Create `/srv/zonofit/server/.env`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://zonofit:CHANGE_ME_STRONG@localhost:5432/zonofit
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
0 3 * * * root pg_dump -Fc zonofit > /var/backups/zonofit-$(date +\%F).dump && find /var/backups -name 'zonofit-*.dump' -mtime +14 -delete
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

The submitted APK calls `http://100.31.236.208`. When AWS is removed that build stops working.
In the next release, set `EXPO_PUBLIC_API_URL` to `https://api.zonofit.com` in `eas.json`
(all three profiles) and set `usesCleartextTraffic` to `false` in `app.json`.

## Known follow-ups

- `server/src/lib/jwt.ts` falls back to a hardcoded `JWT_SECRET` if the env var is missing.
  Always set it on the server (above) and remove the fallback.
- Migrations are git-ignored; commit `server/prisma/migrations` (or use a documented
  `prisma db push` flow) so new environments can be built from the repo.
- Uploads live on the VPS disk now. They are included in the Hostinger snapshot but not in
  `pg_dump` — back up `server/uploads/` as well.
