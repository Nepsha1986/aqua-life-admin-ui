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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields when the modal opens (matches theme-toggle.tsx precedent)
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
