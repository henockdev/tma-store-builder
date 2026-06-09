# TMA Store Builder

A production-ready Telegram Mini App store builder designed for high-end merchants in Ethiopia.

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS — hosted on Vercel Free Tier
- **Backend:** Go (Fiber) — hosted on Render Free Tier
- **Database:** MongoDB Atlas Free Tier (M0)
- **Payments:** Chapa (Telebirr · CBE Birr · bank cards)
- **i18n:** English + አማርኛ (Amharic) with proper Nyala / Noto Sans Ethiopic fonts
- **UI:** Midnight black + polished metallic gold, mobile-first Telegram WebApp viewport

## Project structure

```
tma-store-builder/
├── backend/                  # Go + Fiber API
│   ├── main.go               # Entry, CORS, rate limit, routing
│   ├── config/               # MongoDB + Chapa config
│   ├── models/               # Merchant, Product, Order (BSON schemas)
│   ├── handlers/             # products, orders, merchants, chapa
│   ├── middleware/           # JWT auth
│   ├── utils/                # slug + random token
│   ├── Dockerfile
│   └── go.mod
└── frontend/                 # Next.js 14 (App Router, TS)
    ├── src/app/              # /, /store/[slug], /admin/*
    ├── src/components/       # ProductCard, CartDrawer, CheckoutModal, etc.
    ├── src/lib/              # i18n, cart, api client, telegram, format
    ├── src/locales/          # en.json, am.json
    ├── tailwind.config.js    # Midnight gold palette
    └── package.json
```

## Run locally

### Backend

```bash
cd backend
cp .env.example .env          # fill in values
go mod download
go run .
# API at http://localhost:8080
```

### Frontend

```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
npm install
npm run dev
# UI at http://localhost:3000
```

## Free-tier deployment (0 ETB)

See **[DEPLOY.md](./DEPLOY.md)** for the full step-by-step guide (Render + MongoDB Atlas + Vercel).

## API reference

| Method | Path                                  | Auth   | Description                          |
|--------|---------------------------------------|--------|--------------------------------------|
| GET    | /health                               | —      | Health check                         |
| GET    | /api/v1/store/:slug                   | —      | Public store profile                 |
| GET    | /api/v1/store/:slug/products          | —      | Public catalog                       |
| GET    | /api/v1/product/:id                   | —      | Single product                       |
| POST   | /api/v1/orders                        | —      | Create order (checkout)              |
| GET    | /api/v1/orders/:id                    | —      | Order status (for polling)           |
| POST   | /api/v1/chapa/initialize              | —      | Start Chapa payment                  |
| POST   | /api/v1/chapa/webhook                 | sig    | Chapa callback (auto-marks paid)     |
| POST   | /api/v1/merchants/register            | —      | Create store + JWT                   |
| POST   | /api/v1/merchants/login               | —      | Sign in + JWT                        |
| GET    | /api/v1/merchant/me                   | JWT    | My profile                           |
| GET    | /api/v1/merchant/products             | JWT    | My products                          |
| POST   | /api/v1/merchant/products             | JWT    | Add product                          |
| PUT    | /api/v1/merchant/products/:id         | JWT    | Edit product                         |
| DELETE | /api/v1/merchant/products/:id         | JWT    | Delete product                       |
| GET    | /api/v1/merchant/orders               | JWT    | My orders                            |
| PATCH  | /api/v1/merchant/orders/:id/status    | JWT    | Advance order status                 |
| GET    | /api/v1/merchant/stats                | JWT    | Dashboard aggregates                 |

## Telegram bot integration

After deploying, set up a Telegram bot (via @BotFather) and add a **Menu Button** with the URL:

```
https://<your-vercel-domain>/store/<merchant-slug>
```

Replace `<merchant-slug>` per merchant (or pass it dynamically in your bot's deep-link logic).
