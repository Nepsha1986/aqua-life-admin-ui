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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields when the modal opens (matches theme-toggle.tsx precedent)
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
      <Modal.Container scroll="inside">
        <Modal.Dialog className="sm:max-w-[520px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{isEditing ? "Edit store" : "New store"}</Modal.Heading>
          </Modal.Header>
          <Form
            onSubmit={onSubmit}
            validationBehavior="aria"
            className="flex min-h-0 flex-1 flex-col"
          >
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
