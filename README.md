# Aqua Life Admin UI

Admin dashboard for the Aqua Life aquarium-shop directory. It lets staff sign in and manage the
directory's merchants and stores through a small CRUD UI (list, search, create, edit, delete).

Built with Next.js (App Router), HeroUI v3, TanStack Query, and Better Auth for authentication.

## Prerequisites

This app is a pure frontend — it has no database of its own and talks to the
[`aqua-life-backend`](../aqua-life-backend) API (which also hosts authentication via Better Auth)
for all data and sign-in.

Before running this app, start the backend in a sibling checkout:

```bash
cd ../aqua-life-backend
docker compose up -d   # starts Postgres (and any other backend dependencies)
npm run db:migrate      # applies database migrations
npm run seed:admin      # seeds the admin login (reads ADMIN_EMAIL/ADMIN_PASSWORD from its .env)
npm run dev             # starts the API on http://localhost:3000
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   `.env.local` requires:

   | Variable               | Description                                     |
   | ----------------------- | ------------------------------------------------ |
   | `NEXT_PUBLIC_API_URL`   | Base URL of the running `aqua-life-backend`, e.g. `http://localhost:3000` |

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs on **http://localhost:3001** (not the Next.js default of 3000, since that port is
   used by the backend).

Sign in with an admin account seeded in the backend.

## Pages

- **`/overview`** — at-a-glance counts of merchants and stores, plus the most recently added stores.
- **`/merchants`** — search, create, edit, and delete merchants.
- **`/stores`** — search, create, edit, and delete stores, each optionally linked to a merchant.

Unauthenticated visitors are redirected to `/login`; signing out returns to `/login` as well.

## Scripts

| Command             | Description                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start the dev server on port 3001             |
| `npm run build`      | Create a production build                     |
| `npm run start`      | Serve the production build                    |
| `npm run lint`       | Run ESLint                                    |
| `npx tsc --noEmit`   | Type-check the project without emitting files |
