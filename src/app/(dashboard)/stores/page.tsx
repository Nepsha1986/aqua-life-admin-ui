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
