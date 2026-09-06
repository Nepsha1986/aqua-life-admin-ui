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
