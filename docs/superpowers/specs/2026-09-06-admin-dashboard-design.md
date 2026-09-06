# Admin Dashboard — Merchants & Stores

**Status:** Approved (chat, 2026-09-06)
**Author:** Claude (Sonnet 5), with Alex Nepsha

## Context

`aqua-life-backend` is an early-stage Express + Drizzle/Postgres API for a
directory of aquarium shops. It exposes exactly two CRUD resources today:

- **Merchants** (`/merchants`, no auth) — `name`, `email`
- **Stores** (`/stores`, requires Better Auth session) — `name`, `kind`
  (`physical | online | hybrid`), optional `merchantId` (FK → merchants,
  nullable), `description`, `website`, `email`, `phone`, `country`, `city`,
  `address`

Auth is Better Auth email/password, single seeded admin account, no
roles/RBAC. Session is a cookie set on the backend's origin
(`http://localhost:3000`); the admin UI runs on `http://localhost:3001` and
must send `credentials: 'include'` on every request. Because the cookie
lives on a different origin than the Next.js server, **Next's `proxy.ts`
(the renamed `middleware.ts`) cannot see it** — server-side route
protection isn't viable here, so auth-gating must stay client-side, as the
existing code already does via `useSessionGate`.

`aqua-life-admin-ui` is Next.js 16 (App Router) + React 19 + HeroUI v3 +
Tailwind v4. Today it has: `/login` (HeroUI-styled), `/stores` (pre-dates
HeroUI adoption — plain HTML + CSS module), and `/` (a client-side redirect
gate). There's no shared dashboard shell, no Merchants page, and no
data-fetching abstraction (raw `fetch` inside `useEffect`).

## Goal

Build a dashboard shell with sidebar navigation and bring the UI to parity
with 100% of current backend functionality: manage Merchants and Stores
through a consistent, modern admin UI.

## Out of scope (YAGNI)

- Roles/permissions UI (backend has none)
- Server-side pagination/filtering (backend doesn't support query params —
  it returns full lists)
- Detail pages per record (`/merchants/:id`, `/stores/:id`) — list + modal
  covers the field count for both resources today
- New automated test infrastructure (repo deliberately has none; verify
  manually via dev server + browser)
- OpenAPI-codegen'd client (2 resources doesn't justify the tooling; a
  small hand-written typed client is enough and stays honest to the actual
  Zod schemas)

## Architecture

### Routing / layout

```
src/app/
  page.tsx                     # "/" — unchanged redirect gate: authed → /overview, unauthed → /login
  login/page.tsx                # unchanged, but post-login redirect target becomes /overview
  (dashboard)/
    layout.tsx                  # Shell: sidebar + topbar, single client-side auth guard for the group
    overview/page.tsx           # summary cards: merchant count, store count, recent stores
    merchants/page.tsx          # table + create/edit modal + delete confirm
    stores/page.tsx             # table + create/edit modal (merchant picker, kind select) + delete confirm
```

`(dashboard)` is a route group (doesn't affect URLs) purely to share one
layout + one auth guard across `/overview`, `/merchants`, `/stores`,
instead of each page calling `useSessionGate` itself. `/stores` keeps its
current URL — no links break.

Merchants are gated behind login in the UI even though the backend leaves
`/merchants` open, for a consistent single-login admin experience.

### Data fetching

Add `@tanstack/react-query`. Rationale: two resources, same CRUD shape
(list/create/update/delete) repeated across pages — React Query removes
the boilerplate of hand-rolled loading/error state and gives "refetch list
after mutation" for free via `invalidateQueries`. A `QueryClientProvider`
wraps the app in `layout.tsx` (root).

`src/lib/api-client.ts` — small typed fetch wrapper against
`NEXT_PUBLIC_API_URL`, one function per endpoint (`listMerchants`,
`createMerchant`, `updateMerchant`, `deleteMerchant`, and the `*Store`
equivalents), all with `credentials: 'include'`. Types mirror the backend's
actual Zod schemas (read from `aqua-life-backend/src/schemas/*.schema.ts`
during implementation — this is the source of truth for field
names/optionality). A shared `ApiError` class carries status + message so
call sites can distinguish 401 (→ redirect to `/login`) from other errors
(→ inline error UI).

Per-resource hooks (`src/features/merchants/use-merchants.ts`,
`src/features/stores/use-stores.ts`) wrap the client calls in
`useQuery`/`useMutation`.

### Auth guard

Single client component (`src/lib/auth-guard.tsx` or folded into
`(dashboard)/layout.tsx`) using the existing `useSessionGate` hook pattern:
while session is loading, show a HeroUI `Spinner`; once resolved,
unauthenticated → `router.replace('/login')`, authenticated → render the
shell + children. Individual pages no longer call `useSessionGate`
themselves.

### UI / design system

Stay on HeroUI v3 + Tailwind v4 (already chosen, already partially adopted
on `/login`). Modern SaaS admin pattern:

- **Sidebar** (left, fixed): logo/app name, nav links (Overview, Merchants,
  Stores), active-route highlighting
- **Topbar**: page title, theme toggle (light/dark via HeroUI's oklch
  tokens), sign-out button
- **Tables**: HeroUI `Table` for Merchants/Stores lists, with a simple
  client-side text search/filter (no server-side pagination exists to
  hook into)
- **Forms**: HeroUI `Modal` + `Form`/`TextField`/`Select` for create/edit,
  matching the pattern already established on `/login`
- **Feedback**: HeroUI toast for success/error on mutations, inline
  `text-danger` for form validation errors (same token already used on
  `/login`)
- **Delete**: confirm via a small HeroUI `Modal` (no native `confirm()`)
- Light/dark theme toggle persisted in `localStorage` (per-viewer
  convenience, not shared state)

`/stores/page.tsx` gets rewritten from its CSS-module/plain-HTML version to
match this system — the existing fetch-in-`useEffect` logic is replaced by
the new hooks.

### Error handling

- Network/API errors on list queries → inline error state in the table
  area (HeroUI `Alert` or similar) with a retry action, not a crash
- 401 on any request → redirect to `/login` (session likely expired)
- Mutation errors (validation, 409, etc.) → surfaced in the modal via
  toast + inline message, modal stays open so the user can correct input
- Empty states (`0` merchants/stores) get a simple "no records yet" row
  instead of an empty table

### Testing / verification

No new test framework (matches existing repo convention — YAGNI). Verify
by running both the backend (`docker compose up -d` + `npm run dev` in
`aqua-life-backend`) and the admin UI (`npm run dev`, port 3001), then
driving the app in a real browser (chrome-devtools tool) through:

- Login → redirected to `/overview`, sees correct counts
- Merchants: create, edit, delete, empty state, list refreshes after each
  mutation
- Stores: create (with and without a merchant selected), edit, delete,
  `kind` select, empty state
- Session expiry / 401 → redirected to `/login`
- Sidebar nav between all three pages, active state, sign-out flow
- Light/dark theme toggle
- `npx tsc --noEmit` and `npm run lint` clean

## File plan (implementation-level, non-exhaustive)

```
src/
  app/
    layout.tsx                       # add QueryClientProvider
    page.tsx                         # update redirect target to /overview
    login/page.tsx                   # update post-login redirect to /overview
    (dashboard)/
      layout.tsx                     # Shell + auth guard
      overview/page.tsx
      merchants/page.tsx
      stores/page.tsx                # replaces old app/stores/page.tsx + .module.css
  components/
    dashboard/
      sidebar.tsx
      topbar.tsx
      theme-toggle.tsx
    merchants/
      merchant-table.tsx
      merchant-form-modal.tsx
    stores/
      store-table.tsx
      store-form-modal.tsx
  features/
    merchants/use-merchants.ts
    stores/use-stores.ts
  lib/
    api-client.ts
    auth-client.ts                   # existing, unchanged
    use-session-gate.ts              # existing, reused by the dashboard layout
    query-client.ts                  # QueryClient instance/config
```

## Open questions resolved during brainstorming

- List+modal vs detail pages → **list + modal** (chosen)
- Overview/summary landing page → **included** (chosen)
- Data fetching library → **React Query**, hand-written typed client (no
  OpenAPI codegen)
