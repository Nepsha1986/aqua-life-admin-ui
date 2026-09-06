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
