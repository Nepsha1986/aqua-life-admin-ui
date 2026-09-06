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
