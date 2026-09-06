# Admin Dashboard (Merchants & Stores) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dashboard shell with sidebar navigation and full CRUD (list, create, edit, delete) for the backend's two resources — Merchants and Stores — on top of the existing Next.js 16 + HeroUI v3 admin UI.

**Architecture:** A `(dashboard)` route group provides one shared layout (sidebar + topbar) with a single client-side auth guard, reusing the existing `useSessionGate` hook. A small typed `lib/api-client.ts` wraps the backend's REST endpoints; `@tanstack/react-query` hooks per resource (`features/merchants`, `features/stores`) handle fetching, caching, and mutation-triggered refetches. Each resource gets a list page composed from a `Table` component, a `Modal`-based create/edit form, and a shared `AlertDialog`-based delete confirmation.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, HeroUI v3 (`@heroui/react`), Tailwind CSS v4, Better Auth (existing), `@tanstack/react-query` 5 (new), `next-themes` (new, for light/dark toggle).

**Spec:** `docs/superpowers/specs/2026-09-06-admin-dashboard-design.md`

## Global Constraints

- Next.js 16.2.6, App Router only. `middleware.ts` is deprecated/renamed to `proxy.ts` in this version — irrelevant here anyway: the Better Auth session cookie lives on the backend's origin (`http://localhost:3000`), not the Next.js server's origin (`http://localhost:3001`), so **auth gating must stay client-side** (reuse `useSessionGate`), never a `proxy.ts`.
- HeroUI v3 only: compound components (`Card.Header`, not a `title` prop), no `<HeroUIProvider>`, use `onPress` not `onClick`, controlled overlays render `Modal.Backdrop` / `AlertDialog.Backdrop` directly with `isOpen`/`onOpenChange` (no need for the outer `<Modal>`/`<AlertDialog>` trigger wrapper when fully controlled).
- Every backend request uses `credentials: "include"` and reads the base URL from `process.env.NEXT_PUBLIC_API_URL` (already set to `http://localhost:3000` in `.env.local`).
- Dev server stays on port 3001 (`next dev -p 3001`, already in `package.json` — the backend's CORS/`trustedOrigins` hardcode this origin). Do not change it.
- Backend error responses are shaped `{ error: string, details?: unknown[] }` (see `aqua-life-backend/src/controllers/*.controller.ts`) — surface the `error` string to the user; a 204 No Content response has no body.
- No new test framework (the backend and this repo both deliberately have none). Verify each task with `npx tsc --noEmit` and `npm run lint`; verify the full feature with a manual browser pass in the final task.
- Match existing code style: double quotes, semicolons, 2-space indentation, `"use client"` at the top of client components (see `src/app/login/page.tsx`, `src/lib/use-session-gate.ts`).
- Both servers must be running to manually exercise anything past Task 1: backend via `docker compose up -d && npm run dev` in `aqua-life-backend` (port 3000), this app via `npm run dev` (port 3001).

---

### Task 1: Install dependencies and wire providers (React Query, theme, toast)

**Files:**
- Modify: `package.json` (add `@tanstack/react-query`, `next-themes`)
- Create: `src/lib/query-client.ts`
- Create: `src/lib/providers.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `makeQueryClient(): QueryClient` (from `src/lib/query-client.ts`), `Providers` component (from `src/lib/providers.tsx`) — every later client component that calls `useQuery`/`useMutation` or `toast(...)` relies on this being mounted in the root layout.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @tanstack/react-query@^5.102.8 next-themes@^0.4.6
```

- [ ] **Step 2: Create the QueryClient factory**

Create `src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
      },
    },
  });
}
```

- [ ] **Step 3: Create the Providers component**

Create `src/lib/providers.tsx`:

```tsx
"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";
import { makeQueryClient } from "./query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        {children}
        <Toast.Provider />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Wire Providers into the root layout**

Modify `src/app/layout.tsx` — add `suppressHydrationWarning` to `<html>` (required by `next-themes`) and wrap `{children}` with `Providers`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aqua Life Admin",
  description: "Admin dashboard for Aqua Life",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/query-client.ts src/lib/providers.tsx src/app/layout.tsx
git commit -m "feat: wire React Query, theme provider, and toast provider into root layout"
```

---

### Task 2: Typed API client for Merchants and Stores

**Files:**
- Create: `src/lib/api-error.ts`
- Create: `src/features/merchants/types.ts`
- Create: `src/features/stores/types.ts`
- Create: `src/lib/api-client.ts`

**Interfaces:**
- Produces: `ApiError` class (`status: number`, `message: string`); `Merchant`, `CreateMerchantInput`, `UpdateMerchantInput` types; `Store`, `StoreKind`, `storeKinds`, `CreateStoreInput`, `UpdateStoreInput` types; `merchantsApi.{list,create,update,remove}` and `storesApi.{list,create,update,remove}` — consumed by Task 3 and Task 4's hooks.

- [ ] **Step 1: Create the ApiError type**

Create `src/lib/api-error.ts`:

```ts
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
```

- [ ] **Step 2: Create Merchant types**

Create `src/features/merchants/types.ts`:

```ts
export type Merchant = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMerchantInput = {
  name: string;
  email: string;
};

export type UpdateMerchantInput = Partial<CreateMerchantInput>;
```

- [ ] **Step 3: Create Store types**

Create `src/features/stores/types.ts`:

```ts
export const storeKinds = ["physical", "online", "hybrid"] as const;

export type StoreKind = (typeof storeKinds)[number];

export type Store = {
  id: string;
  merchantId: string | null;
  name: string;
  kind: StoreKind;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreInput = {
  name: string;
  kind: StoreKind;
  merchantId?: string | null;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
};

export type UpdateStoreInput = Partial<CreateStoreInput>;
```

- [ ] **Step 4: Create the API client**

Create `src/lib/api-client.ts`:

```ts
import { ApiError } from "./api-error";
import type {
  CreateMerchantInput,
  Merchant,
  UpdateMerchantInput,
} from "@/features/merchants/types";
import type {
  CreateStoreInput,
  Store,
  UpdateStoreInput,
} from "@/features/stores/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body !== null && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    // Session likely expired: hard-redirect rather than surfacing an inline
    // error, mirroring the 401 handling the old /stores page did per-request.
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.assign("/login");
    }
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const merchantsApi = {
  list: () => request<Merchant[]>("/merchants"),
  create: (input: CreateMerchantInput) =>
    request<Merchant>("/merchants", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateMerchantInput) =>
    request<Merchant>(`/merchants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<void>(`/merchants/${id}`, { method: "DELETE" }),
};

export const storesApi = {
  list: () => request<Store[]>("/stores"),
  create: (input: CreateStoreInput) =>
    request<Store>("/stores", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateStoreInput) =>
    request<Store>(`/stores/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<void>(`/stores/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-error.ts src/lib/api-client.ts src/features/merchants/types.ts src/features/stores/types.ts
git commit -m "feat: add typed API client for merchants and stores"
```

---

### Task 3: Merchants data hooks (React Query)

**Files:**
- Create: `src/features/merchants/use-merchants.ts`

**Interfaces:**
- Consumes: `merchantsApi` from `src/lib/api-client.ts` (Task 2); `Merchant`, `CreateMerchantInput`, `UpdateMerchantInput` from `src/features/merchants/types.ts` (Task 2).
- Produces: `merchantsQueryKey`, `useMerchants()`, `useCreateMerchant()`, `useUpdateMerchant()`, `useDeleteMerchant()` — consumed by the Merchants page (Task 9) and the Stores form's merchant picker (Task 10).

- [ ] **Step 1: Create the hooks**

Create `src/features/merchants/use-merchants.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { merchantsApi } from "@/lib/api-client";
import type { CreateMerchantInput, UpdateMerchantInput } from "./types";

export const merchantsQueryKey = ["merchants"] as const;

export function useMerchants() {
  return useQuery({
    queryKey: merchantsQueryKey,
    queryFn: merchantsApi.list,
  });
}

export function useCreateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMerchantInput) => merchantsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey });
    },
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMerchantInput }) =>
      merchantsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey });
    },
  });
}

export function useDeleteMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => merchantsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey });
    },
  });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/merchants/use-merchants.ts
git commit -m "feat: add merchants React Query hooks"
```

---

### Task 4: Stores data hooks (React Query)

**Files:**
- Create: `src/features/stores/use-stores.ts`

**Interfaces:**
- Consumes: `storesApi` from `src/lib/api-client.ts` (Task 2); `Store`, `CreateStoreInput`, `UpdateStoreInput` from `src/features/stores/types.ts` (Task 2).
- Produces: `storesQueryKey`, `useStores()`, `useCreateStore()`, `useUpdateStore()`, `useDeleteStore()` — consumed by the Stores page (Task 10).

- [ ] **Step 1: Create the hooks**

Create `src/features/stores/use-stores.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storesApi } from "@/lib/api-client";
import type { CreateStoreInput, UpdateStoreInput } from "./types";

export const storesQueryKey = ["stores"] as const;

export function useStores() {
  return useQuery({
    queryKey: storesQueryKey,
    queryFn: storesApi.list,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStoreInput) => storesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStoreInput }) =>
      storesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
    },
  });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/stores/use-stores.ts
git commit -m "feat: add stores React Query hooks"
```

---

### Task 5: Dashboard shell components (sidebar, topbar, theme toggle)

**Files:**
- Create: `src/components/dashboard/nav-items.ts`
- Create: `src/components/dashboard/sidebar.tsx`
- Create: `src/components/dashboard/theme-toggle.tsx`
- Create: `src/components/dashboard/topbar.tsx`

**Interfaces:**
- Consumes: `authClient` from `src/lib/auth-client.ts` (existing).
- Produces: `NAV_ITEMS`, `Sidebar`, `Topbar`, `ThemeToggle` — consumed by the dashboard layout (Task 6).

- [ ] **Step 1: Create the shared nav items list**

Create `src/components/dashboard/nav-items.ts`:

```ts
export const NAV_ITEMS = [
  { href: "/overview", label: "Overview" },
  { href: "/merchants", label: "Merchants" },
  { href: "/stores", label: "Stores" },
] as const;
```

- [ ] **Step 2: Create the Sidebar**

Create `src/components/dashboard/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@heroui/react";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-foreground">
        Aqua Life Admin
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent-soft-foreground"
                  : "text-muted hover:bg-default hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create the ThemeToggle**

Create `src/components/dashboard/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ToggleButton } from "@heroui/react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ToggleButton aria-label="Toggle theme" isIconOnly isDisabled />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <ToggleButton
      aria-label="Toggle theme"
      isIconOnly
      isSelected={isDark}
      onChange={(selected) => setTheme(selected ? "dark" : "light")}
    >
      {isDark ? "🌙" : "☀️"}
    </ToggleButton>
  );
}
```

- [ ] **Step 4: Create the Topbar**

Create `src/components/dashboard/topbar.tsx`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title =
    NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Dashboard";

  async function onSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button variant="tertiary" size="sm" onPress={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/nav-items.ts src/components/dashboard/sidebar.tsx src/components/dashboard/theme-toggle.tsx src/components/dashboard/topbar.tsx
git commit -m "feat: add dashboard sidebar, topbar, and theme toggle components"
```

---

### Task 6: Dashboard route group layout, auth guard, and redirect updates

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx:25`

**Interfaces:**
- Consumes: `useSessionGate` from `src/lib/use-session-gate.ts` (existing); `Sidebar`, `Topbar` from Task 5.
- Produces: the `(dashboard)` layout shell — every page created in Tasks 8-10 lives under this route group and assumes it is already authenticated when it renders.

- [ ] **Step 1: Create the dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
"use client";

import { Spinner } from "@heroui/react";
import { useSessionGate } from "@/lib/use-session-gate";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isPending } = useSessionGate({ unauthedRedirect: "/login" });

  if (isPending || !session) {
    return (
      <main className="grid min-h-[100dvh] place-items-center p-6">
        <Spinner aria-label="Loading" />
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the root redirect gate**

Modify `src/app/page.tsx` — change the authenticated redirect target from `/stores` to `/overview`:

```tsx
"use client";

import { Spinner } from "@heroui/react";
import { useSessionGate } from "@/lib/use-session-gate";

export default function Home() {
  // Admin-only app: the root has no content of its own — route visitors to the
  // dashboard when signed in, or to the login page when signed out.
  useSessionGate({ authedRedirect: "/overview", unauthedRedirect: "/login" });

  return (
    <main className="grid min-h-[100dvh] place-items-center p-6">
      <Spinner aria-label="Loading" />
    </main>
  );
}
```

- [ ] **Step 3: Update the login page's post-login redirect**

Modify `src/app/login/page.tsx` line 25 — change `router.push("/stores")` to `router.push("/overview")`:

```tsx
    router.push("/overview");
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Manual check (requires both servers running — see Global Constraints): visit `http://localhost:3001/overview` while signed out → redirected to `/login`. Sign in → the browser navigates to `/overview`. Note: since no `page.tsx` exists under `(dashboard)/overview` yet (that's Task 8), this currently renders Next's default not-found page, not the sidebar — that's expected at this point; this step is only verifying the *redirect* logic and that the layout file doesn't break the build. The sidebar/topbar shell itself gets verified visually in Task 8, once a real page exists under the route group to render it.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx src/app/page.tsx src/app/login/page.tsx
git commit -m "feat: add dashboard layout with auth guard, update post-login redirect to /overview"
```

---

### Task 7: Shared delete-confirmation dialog

**Files:**
- Create: `src/components/dashboard/delete-confirm-dialog.tsx`

**Interfaces:**
- Produces: `DeleteConfirmDialog` component with props `{ isOpen: boolean; onOpenChange: (isOpen: boolean) => void; title: string; description: string; isPending: boolean; onConfirm: () => void }` — consumed by the Merchants page (Task 9) and Stores page (Task 10).

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/delete-confirm-dialog.tsx`:

```tsx
"use client";

import { AlertDialog, Button } from "@heroui/react";

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  isPending: boolean;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  isPending,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>{description}</p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button variant="tertiary" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="danger" isPending={isPending} onPress={onConfirm}>
              Delete
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/delete-confirm-dialog.tsx
git commit -m "feat: add shared delete-confirmation dialog"
```

---

### Task 8: Overview page

**Files:**
- Create: `src/app/(dashboard)/overview/page.tsx`

**Interfaces:**
- Consumes: `useMerchants` (Task 3), `useStores` (Task 4).

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/overview/page.tsx`:

```tsx
"use client";

import { Card, Spinner } from "@heroui/react";
import { useMerchants } from "@/features/merchants/use-merchants";
import { useStores } from "@/features/stores/use-stores";

export default function OverviewPage() {
  const merchants = useMerchants();
  const stores = useStores();

  const recentStores = stores.data
    ? [...stores.data]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 5)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Title>Merchants</Card.Title>
            <Card.Description>Total registered merchants</Card.Description>
          </Card.Header>
          <Card.Content>
            {merchants.isLoading ? (
              <Spinner size="sm" aria-label="Loading merchants" />
            ) : (
              <p className="text-3xl font-semibold text-foreground">
                {merchants.data?.length ?? 0}
              </p>
            )}
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Stores</Card.Title>
            <Card.Description>Total listed stores</Card.Description>
          </Card.Header>
          <Card.Content>
            {stores.isLoading ? (
              <Spinner size="sm" aria-label="Loading stores" />
            ) : (
              <p className="text-3xl font-semibold text-foreground">
                {stores.data?.length ?? 0}
              </p>
            )}
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Recent stores</Card.Title>
          <Card.Description>Most recently added stores</Card.Description>
        </Card.Header>
        <Card.Content>
          {recentStores.length === 0 ? (
            <p className="text-sm text-muted">No stores yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentStores.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-muted">{s.city ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manual check (both servers running): sign in, land on `/overview` and this time see the full dashboard shell — sidebar with "Overview / Merchants / Stores" (Overview highlighted as active) and a topbar with the page title, theme toggle, and sign-out button — wrapping two count cards (0 for both on a fresh database) and a "No stores yet." recent-stores card. This is the first point where Task 6's layout is actually visible end-to-end, since it needs a real page under the route group to render.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/overview/page.tsx
git commit -m "feat: add dashboard overview page with merchant/store counts"
```

---

### Task 9: Merchants page (table, form modal, delete)

**Files:**
- Create: `src/components/merchants/merchant-table.tsx`
- Create: `src/components/merchants/merchant-form-modal.tsx`
- Create: `src/app/(dashboard)/merchants/page.tsx`

**Interfaces:**
- Consumes: `useMerchants`, `useCreateMerchant`, `useUpdateMerchant`, `useDeleteMerchant` (Task 3); `DeleteConfirmDialog` (Task 7); `Merchant` type (Task 2).

- [ ] **Step 1: Create the merchant table**

Create `src/components/merchants/merchant-table.tsx`:

```tsx
"use client";

import { Alert, Button, EmptyState, Spinner, Table } from "@heroui/react";
import type { Merchant } from "@/features/merchants/types";

type MerchantTableProps = {
  merchants: Merchant[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (merchant: Merchant) => void;
  onDelete: (merchant: Merchant) => void;
};

export function MerchantTable({
  merchants,
  isLoading,
  error,
  onEdit,
  onDelete,
}: MerchantTableProps) {
  if (error) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Failed to load merchants</Alert.Title>
          <Alert.Description>{error.message}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <Table className="min-h-[240px]">
      <Table.ScrollContainer>
        <Table.Content aria-label="Merchants" className="h-full min-w-[520px]">
          <Table.Header>
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column>Email</Table.Column>
            <Table.Column>Actions</Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() =>
              isLoading ? (
                <EmptyState className="flex h-full w-full items-center justify-center py-10">
                  <Spinner aria-label="Loading merchants" />
                </EmptyState>
              ) : (
                <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-10 text-center">
                  <span className="text-sm text-muted">No merchants yet.</span>
                </EmptyState>
              )
            }
          >
            {merchants.map((merchant) => (
              <Table.Row key={merchant.id} id={merchant.id}>
                <Table.Cell>{merchant.name}</Table.Cell>
                <Table.Cell>{merchant.email}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => onEdit(merchant)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onPress={() => onDelete(merchant)}
                    >
                      Delete
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
```

- [ ] **Step 2: Create the merchant form modal**

Create `src/components/merchants/merchant-form-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, Label, Modal, TextField, toast } from "@heroui/react";
import {
  useCreateMerchant,
  useUpdateMerchant,
} from "@/features/merchants/use-merchants";
import type { Merchant } from "@/features/merchants/types";

type MerchantFormModalProps = {
  isOpen: boolean;
  merchant: Merchant | null;
  onOpenChange: (isOpen: boolean) => void;
};

export function MerchantFormModal({
  isOpen,
  merchant,
  onOpenChange,
}: MerchantFormModalProps) {
  const isEditing = merchant !== null;
  const createMerchant = useCreateMerchant();
  const updateMerchant = useUpdateMerchant();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(merchant?.name ?? "");
      setEmail(merchant?.email ?? "");
      setError(null);
    }
  }, [isOpen, merchant]);

  const isPending = createMerchant.isPending || updateMerchant.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing) {
        await updateMerchant.mutateAsync({
          id: merchant.id,
          input: { name, email },
        });
        toast.success("Merchant updated");
      } else {
        await createMerchant.mutateAsync({ name, email });
        toast.success("Merchant created");
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {isEditing ? "Edit merchant" : "New merchant"}
            </Modal.Heading>
          </Modal.Header>
          <Form onSubmit={onSubmit} validationBehavior="aria">
            <Modal.Body>
              <div className="flex flex-col gap-4">
                <TextField isRequired name="name" value={name} onChange={setName}>
                  <Label>Name</Label>
                  <Input placeholder="Acme" variant="secondary" />
                </TextField>
                <TextField
                  isRequired
                  name="email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                >
                  <Label>Email</Label>
                  <Input placeholder="a@acme.com" variant="secondary" />
                </TextField>
                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" isPending={isPending}>
                {isEditing ? "Save changes" : "Create merchant"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
```

- [ ] **Step 3: Create the merchants page**

Create `src/app/(dashboard)/merchants/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Button, Label, SearchField, toast } from "@heroui/react";
import {
  useDeleteMerchant,
  useMerchants,
} from "@/features/merchants/use-merchants";
import type { Merchant } from "@/features/merchants/types";
import { MerchantTable } from "@/components/merchants/merchant-table";
import { MerchantFormModal } from "@/components/merchants/merchant-form-modal";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";

export default function MerchantsPage() {
  const merchants = useMerchants();
  const deleteMerchant = useDeleteMerchant();
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<{
    open: boolean;
    merchant: Merchant | null;
  }>({ open: false, merchant: null });
  const [deletingMerchant, setDeletingMerchant] = useState<Merchant | null>(
    null
  );

  const filtered = useMemo(() => {
    const list = merchants.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [merchants.data, search]);

  async function handleDelete() {
    if (!deletingMerchant) return;
    try {
      await deleteMerchant.mutateAsync(deletingMerchant.id);
      toast.success("Merchant deleted");
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : "Failed to delete merchant"
      );
    } finally {
      setDeletingMerchant(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SearchField aria-label="Search merchants" value={search} onChange={setSearch}>
          <Label className="sr-only">Search merchants</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-[280px]" placeholder="Search merchants..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button onPress={() => setFormState({ open: true, merchant: null })}>
          New merchant
        </Button>
      </div>

      <MerchantTable
        merchants={filtered}
        isLoading={merchants.isLoading}
        error={merchants.error}
        onEdit={(merchant) => setFormState({ open: true, merchant })}
        onDelete={(merchant) => setDeletingMerchant(merchant)}
      />

      <MerchantFormModal
        isOpen={formState.open}
        merchant={formState.merchant}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
      />

      <DeleteConfirmDialog
        isOpen={deletingMerchant !== null}
        onOpenChange={(open) => !open && setDeletingMerchant(null)}
        title="Delete merchant?"
        description={
          deletingMerchant
            ? `This will permanently delete "${deletingMerchant.name}". Stores linked to this merchant will be unlinked, not deleted.`
            : ""
        }
        isPending={deleteMerchant.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Manual check (both servers running): go to `/merchants`. Click "New merchant", fill name/email, submit → toast "Merchant created", row appears in the table. Click "Edit" on that row, change the name, submit → toast "Merchant updated", table reflects the new name. Type into the search field → table filters to matching rows. Click "Delete" → confirmation dialog appears with the merchant's name; confirm → toast "Merchant deleted", row disappears.

- [ ] **Step 5: Commit**

```bash
git add src/components/merchants/merchant-table.tsx src/components/merchants/merchant-form-modal.tsx src/app/\(dashboard\)/merchants/page.tsx
git commit -m "feat: add merchants list, create/edit, and delete UI"
```

---

### Task 10: Stores page (table, form modal, delete) and removal of the old page

**Files:**
- Create: `src/components/stores/store-table.tsx`
- Create: `src/components/stores/store-form-modal.tsx`
- Create: `src/app/(dashboard)/stores/page.tsx`
- Delete: `src/app/stores/page.tsx`
- Delete: `src/app/stores/stores.module.css`

**Interfaces:**
- Consumes: `useStores`, `useCreateStore`, `useUpdateStore`, `useDeleteStore` (Task 4); `useMerchants` (Task 3, for the merchant picker); `DeleteConfirmDialog` (Task 7); `Store`, `StoreKind`, `storeKinds` types (Task 2).

- [ ] **Step 1: Create the store table**

Create `src/components/stores/store-table.tsx`:

```tsx
"use client";

import { Alert, Button, Chip, EmptyState, Spinner, Table } from "@heroui/react";
import type { Store, StoreKind } from "@/features/stores/types";

type StoreTableProps = {
  stores: Store[];
  merchantNameById: Record<string, string>;
  isLoading: boolean;
  error: Error | null;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
};

const KIND_COLOR: Record<StoreKind, "accent" | "success" | "warning"> = {
  physical: "accent",
  online: "success",
  hybrid: "warning",
};

export function StoreTable({
  stores,
  merchantNameById,
  isLoading,
  error,
  onEdit,
  onDelete,
}: StoreTableProps) {
  if (error) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Failed to load stores</Alert.Title>
          <Alert.Description>{error.message}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <Table className="min-h-[240px]">
      <Table.ScrollContainer>
        <Table.Content aria-label="Stores" className="h-full min-w-[720px]">
          <Table.Header>
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column>Kind</Table.Column>
            <Table.Column>Merchant</Table.Column>
            <Table.Column>City</Table.Column>
            <Table.Column>Country</Table.Column>
            <Table.Column>Actions</Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() =>
              isLoading ? (
                <EmptyState className="flex h-full w-full items-center justify-center py-10">
                  <Spinner aria-label="Loading stores" />
                </EmptyState>
              ) : (
                <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-10 text-center">
                  <span className="text-sm text-muted">No stores yet.</span>
                </EmptyState>
              )
            }
          >
            {stores.map((store) => (
              <Table.Row key={store.id} id={store.id}>
                <Table.Cell>{store.name}</Table.Cell>
                <Table.Cell>
                  <Chip size="sm" variant="soft" color={KIND_COLOR[store.kind]}>
                    {store.kind}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  {store.merchantId
                    ? merchantNameById[store.merchantId] ?? "—"
                    : "—"}
                </Table.Cell>
                <Table.Cell>{store.city ?? "—"}</Table.Cell>
                <Table.Cell>{store.country ?? "—"}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => onEdit(store)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onPress={() => onDelete(store)}
                    >
                      Delete
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
```

- [ ] **Step 2: Create the store form modal**

Create `src/components/stores/store-form-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Key } from "@heroui/react";
import {
  Button,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { useMerchants } from "@/features/merchants/use-merchants";
import { useCreateStore, useUpdateStore } from "@/features/stores/use-stores";
import { storeKinds, type Store, type StoreKind } from "@/features/stores/types";

const NO_MERCHANT = "none";

const KIND_LABELS: Record<StoreKind, string> = {
  physical: "Physical",
  online: "Online",
  hybrid: "Hybrid",
};

type StoreFormModalProps = {
  isOpen: boolean;
  store: Store | null;
  onOpenChange: (isOpen: boolean) => void;
};

export function StoreFormModal({ isOpen, store, onOpenChange }: StoreFormModalProps) {
  const isEditing = store !== null;
  const merchants = useMerchants();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<StoreKind>("physical");
  const [merchantId, setMerchantId] = useState<string>(NO_MERCHANT);
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(store?.name ?? "");
      setKind(store?.kind ?? "physical");
      setMerchantId(store?.merchantId ?? NO_MERCHANT);
      setDescription(store?.description ?? "");
      setWebsite(store?.website ?? "");
      setEmail(store?.email ?? "");
      setPhone(store?.phone ?? "");
      setCountry(store?.country ?? "");
      setCity(store?.city ?? "");
      setAddress(store?.address ?? "");
      setError(null);
    }
  }, [isOpen, store]);

  const isPending = createStore.isPending || updateStore.isPending;

  function buildInput() {
    return {
      name,
      kind,
      merchantId: merchantId === NO_MERCHANT ? null : merchantId,
      description: description || undefined,
      website: website || undefined,
      email: email || undefined,
      phone: phone || undefined,
      country: country || undefined,
      city: city || undefined,
      address: address || undefined,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing) {
        await updateStore.mutateAsync({ id: store.id, input: buildInput() });
        toast.success("Store updated");
      } else {
        await createStore.mutateAsync(buildInput());
        toast.success("Store created");
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[520px]" scroll="inside">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{isEditing ? "Edit store" : "New store"}</Modal.Heading>
          </Modal.Header>
          <Form onSubmit={onSubmit} validationBehavior="aria">
            <Modal.Body>
              <div className="flex flex-col gap-4">
                <TextField isRequired name="name" value={name} onChange={setName}>
                  <Label>Name</Label>
                  <Input placeholder="Reef Center" variant="secondary" />
                </TextField>

                <Select
                  isRequired
                  placeholder="Select kind"
                  value={kind}
                  onChange={(value: Key | null) =>
                    setKind((value as StoreKind) ?? "physical")
                  }
                >
                  <Label>Kind</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {storeKinds.map((k) => (
                        <ListBox.Item key={k} id={k} textValue={KIND_LABELS[k]}>
                          {KIND_LABELS[k]}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  placeholder="Select merchant"
                  value={merchantId}
                  onChange={(value: Key | null) =>
                    setMerchantId((value as string) ?? NO_MERCHANT)
                  }
                >
                  <Label>Merchant</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id={NO_MERCHANT} textValue="No merchant">
                        No merchant
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {(merchants.data ?? []).map((m) => (
                        <ListBox.Item key={m.id} id={m.id} textValue={m.name}>
                          {m.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField name="city" value={city} onChange={setCity}>
                  <Label>City</Label>
                  <Input placeholder="Austin" variant="secondary" />
                </TextField>

                <TextField name="country" value={country} onChange={setCountry}>
                  <Label>Country</Label>
                  <Input placeholder="USA" variant="secondary" />
                </TextField>

                <TextField name="address" value={address} onChange={setAddress}>
                  <Label>Address</Label>
                  <Input placeholder="123 Reef St" variant="secondary" />
                </TextField>

                <TextField name="website" type="url" value={website} onChange={setWebsite}>
                  <Label>Website</Label>
                  <Input placeholder="https://example.com" variant="secondary" />
                </TextField>

                <TextField name="email" type="email" value={email} onChange={setEmail}>
                  <Label>Email</Label>
                  <Input placeholder="hello@reefcenter.com" variant="secondary" />
                </TextField>

                <TextField name="phone" value={phone} onChange={setPhone}>
                  <Label>Phone</Label>
                  <Input placeholder="+1 555 0100" variant="secondary" />
                </TextField>

                <TextField name="description" value={description} onChange={setDescription}>
                  <Label>Description</Label>
                  <TextArea
                    placeholder="A short description of the store"
                    variant="secondary"
                  />
                </TextField>

                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" isPending={isPending}>
                {isEditing ? "Save changes" : "Create store"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
```

- [ ] **Step 3: Create the stores page**

Create `src/app/(dashboard)/stores/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Button, Label, SearchField, toast } from "@heroui/react";
import { useMerchants } from "@/features/merchants/use-merchants";
import { useDeleteStore, useStores } from "@/features/stores/use-stores";
import type { Store } from "@/features/stores/types";
import { StoreTable } from "@/components/stores/store-table";
import { StoreFormModal } from "@/components/stores/store-form-modal";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";

export default function StoresPage() {
  const stores = useStores();
  const merchants = useMerchants();
  const deleteStore = useDeleteStore();
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<{
    open: boolean;
    store: Store | null;
  }>({ open: false, store: null });
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);

  const merchantNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of merchants.data ?? []) {
      map[m.id] = m.name;
    }
    return map;
  }, [merchants.data]);

  const filtered = useMemo(() => {
    const list = stores.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        (s.country ?? "").toLowerCase().includes(q)
    );
  }, [stores.data, search]);

  async function handleDelete() {
    if (!deletingStore) return;
    try {
      await deleteStore.mutateAsync(deletingStore.id);
      toast.success("Store deleted");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Failed to delete store");
    } finally {
      setDeletingStore(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SearchField aria-label="Search stores" value={search} onChange={setSearch}>
          <Label className="sr-only">Search stores</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-[280px]" placeholder="Search stores..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button onPress={() => setFormState({ open: true, store: null })}>
          New store
        </Button>
      </div>

      <StoreTable
        stores={filtered}
        merchantNameById={merchantNameById}
        isLoading={stores.isLoading}
        error={stores.error}
        onEdit={(store) => setFormState({ open: true, store })}
        onDelete={(store) => setDeletingStore(store)}
      />

      <StoreFormModal
        isOpen={formState.open}
        store={formState.store}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
      />

      <DeleteConfirmDialog
        isOpen={deletingStore !== null}
        onOpenChange={(open) => !open && setDeletingStore(null)}
        title="Delete store?"
        description={
          deletingStore
            ? `This will permanently delete "${deletingStore.name}".`
            : ""
        }
        isPending={deleteStore.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 4: Delete the old stores page and its CSS module**

```bash
git rm src/app/stores/page.tsx src/app/stores/stores.module.css
rmdir src/app/stores 2>/dev/null || true
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Manual check (both servers running): go to `/stores`. Click "New store", fill name, pick a kind, optionally pick a merchant (create one on `/merchants` first if the list is empty), submit → toast "Store created", row appears with the right kind chip and merchant name. Edit it, change kind and merchant, save → table updates. Search filters by name/city/country. Delete → confirm dialog → row disappears. Confirm the old `/stores` route no longer exists as a standalone page (it's now inside the dashboard shell with the same URL).

- [ ] **Step 6: Commit**

```bash
git add src/components/stores/store-table.tsx src/components/stores/store-form-modal.tsx src/app/\(dashboard\)/stores/page.tsx
git commit -m "feat: add stores list, create/edit, and delete UI; migrate off the old CSS-module page"
```

---

### Task 11: Full manual verification pass and README update

**Files:**
- Modify: `README.md`

**Interfaces:** None — this task only verifies and documents.

- [ ] **Step 1: Start both servers**

In `aqua-life-backend`: `docker compose up -d && npm run dev` (port 3000).
In this repo: `npm run dev` (port 3001).

- [ ] **Step 2: Full click-through in a real browser**

Using the browser (chrome-devtools tool), walk through:
1. Visit `http://localhost:3001/` signed out → redirected to `/login`.
2. Sign in with the seeded admin credentials → redirected to `/overview`.
3. Sidebar navigation: click Overview, Merchants, Stores — active link highlights correctly, topbar title updates.
4. Merchants: create, edit, search, delete (per Task 9's manual check).
5. Stores: create (with and without a merchant), edit, search, delete (per Task 10's manual check).
6. Toggle the theme button — page switches between light and dark, persists across a page reload.
7. Sign out from the topbar → redirected to `/login`; try visiting `/overview` directly afterward → redirected back to `/login`.
8. Stop the backend (`docker compose stop` is not required — instead, temporarily kill `npm run dev` in the backend) and reload `/merchants` → an inline error state is shown instead of a crash; restart the backend and reload → data loads normally again.

- [ ] **Step 3: Run final checks**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 4: Update the README**

Replace the boilerplate `README.md` with project-specific instructions: what this app is (admin UI for the Aqua Life aquarium-shop directory), prerequisites (the `aqua-life-backend` running via `docker compose up -d && npm run dev`), required `.env.local` (`NEXT_PUBLIC_API_URL`), `npm run dev` (port 3001), and a one-line summary of the pages (`/overview`, `/merchants`, `/stores`).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: replace boilerplate README with project-specific setup instructions"
```
