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
