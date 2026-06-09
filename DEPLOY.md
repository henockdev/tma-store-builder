# Deploy TMA Store Builder for 0 ETB

Three free services, ~15 minutes total. Follow the steps **in order**.

---

## 1. MongoDB Atlas (Free M0 cluster)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. Click **Build a Database** → choose **Shared (M0, Free)** → pick a region close to Ethiopia (e.g. **Mumbai** or **Frankfurt**).
3. Name the cluster `tma-store-builder` → **Create**.
4. **Database Access** → **Add New Database User**
   - Username: `tma_admin` (or anything)
   - Password: click **Autogenerate**, **copy it** — you'll need it next.
   - Privileges: `Read and write to any database`.
5. **Network Access** → **Add IP Address** → `0.0.0.0/0` (allow from anywhere — fine for free tier demo).
6. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://tma_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   **Replace `<password>` with the real password you generated.** Save this — it's your `MONGODB_URI`.

> Atlas creates indexes automatically on first run via `config/db.go::createIndexes`, but the M0 cluster only allows ~500 writes/sec, plenty for a single merchant.

---

## 2. Chapa (Payments)

1. Sign up at <https://dashboard.chapa.co/> (or the test dashboard at <https://test.chapa.co/>).
2. **Settings → API Keys** → copy your **Secret Key** (`CHASECK_…`).
3. **Settings → Webhooks** → add a webhook URL:
   ```
   https://<your-render-api>.onrender.com/api/v1/chapa/webhook
   ```
   Chapa currently only delivers webhooks to whitelisted URLs on live mode — for dev, polling `GET /api/v1/orders/:id` after the customer returns is enough.
4. Save the secret key — it's your `CHAPA_SECRET_KEY`. For now, the test keys work for local development; switch to live keys when you go to production.

> Telebirr, CBE Birr, and bank cards are all routed through Chapa's standard checkout; the customer picks the method inside Chapa's hosted page.

---

## 3. Backend → Render (Free Web Service)

1. Push the project to a private GitHub repo:
   ```bash
   cd tma-store-builder
   git init && git add . && git commit -m "init"
   git branch -M main
   git remote add origin git@github.com:henockdev/tma-store-builder
   git push -u origin main
   ```
2. Sign up at <https://render.com> with GitHub.
3. **New +** → **Web Service** → pick your repo → **Important: set Root Directory to `backend`**.
4. **Runtime:** `Docker` (Render auto-detects the `Dockerfile`).
5. **Instance Type:** `Free`.
6. **Environment Variables** (add all of these):
   | Key                  | Value                                                                                  |
   |----------------------|----------------------------------------------------------------------------------------|
   | `PORT`               | `8080`                                                                                 |
   | `CORS_ORIGINS`       | `*` (or your Vercel domain, e.g. `https://tma-store.vercel.app`)                       |
   | `MONGODB_URI`        | the connection string from step 1                                                     |
   | `MONGODB_DB`         | `tma_store_builder`                                                                    |
   | `JWT_SECRET`         | run `openssl rand -hex 32` and paste                                                  |
   | `CHAPA_SECRET_KEY`   | from step 2                                                                            |
   | `CHAPA_WEBHOOK_SECRET` | run `openssl rand -hex 32` and paste (optional, for signature validation)           |
7. Click **Create Web Service**. Wait ~3 min for the first build. Render will give you a URL like:
   ```
   https://tma-store-api.onrender.com
   ```
8. Test it: `curl https://tma-store-api.onrender.com/health` → expect `{"status":"ok",...}`.

> **Free tier note:** Render spins down after 15 min of no traffic; the first request after sleep takes ~30 s. For production uptime, upgrade to the $7/mo plan or use a cron-job pinger (e.g. UptimeRobot hitting `/health` every 14 min).

---

## 4. Frontend → Vercel (Free Hobby)

1. Sign up at <https://vercel.com> with GitHub.
2. **Add New → Project** → import the same repo.
3. **Framework Preset:** Next.js (auto-detected).
4. **Root Directory:** `frontend` (click **Edit** and set it).
5. **Environment Variables:**
   | Key                       | Value                                       |
   |---------------------------|---------------------------------------------|
   | `NEXT_PUBLIC_API_BASE_URL`| `https://tma-store-api.onrender.com`        |
6. Click **Deploy**. Vercel gives you a URL like:
   ```
   https://tma-store-builder.vercel.app
   ```
7. Test:
   - `https://tma-store-builder.vercel.app` → landing page
   - `https://tma-store-builder.vercel.app/admin/login` → merchant sign in
   - Create an account, then `https://tma-store-builder.vercel.app/admin/products` to add products.
   - The public storefront is `https://tma-store-builder.vercel.app/store/<your-slug>`.

> **Custom domain (optional):** In Vercel → Project → Settings → Domains. Free `.vercel.app` is fine for testing.

---

## 5. Wire up the Telegram bot

1. Talk to **@BotFather** on Telegram → `/newbot` → follow prompts.
2. `/setdomain` → set your Vercel domain (required for the WebApp SDK to work).
3. `/setmenubutton` → pick your bot → set:
   - Button text: `Open Store`
   - URL: `https://tma-store-builder.vercel.app/store/<merchant-slug>`
4. Share your bot with customers. When they tap **Open Store**, the WebApp opens with the merchant's catalog.

For multi-merchant: store `<merchant-slug>` in your bot's database and dynamically generate the menu button URL per merchant (or use a single landing page that asks for a slug).

---

## 6. Go-live checklist

- [ ] MongoDB IP whitelist tightened (or use VPC peering — overkill for free tier)
- [ ] Chapa switched from test keys to **live** keys
- [ ] Render `CORS_ORIGINS` set to your exact Vercel domain (not `*`)
- [ ] JWT_SECRET rotated to a strong random value
- [ ] Vercel `NEXT_PUBLIC_API_BASE_URL` matches the live Render URL
- [ ] Telegram bot domain set to your Vercel domain
- [ ] Test a real Telebirr payment end-to-end (Chapa test mode only sends sandbox money)

**Total monthly cost: 0 ETB.** 🎉
