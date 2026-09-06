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
