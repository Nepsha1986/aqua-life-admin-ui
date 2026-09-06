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
