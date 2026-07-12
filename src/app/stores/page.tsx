"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import styles from "./stores.module.css";

type Store = {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  country: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function StoresPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Gate: once the session state resolves, bounce unauthenticated visitors.
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  // Fetch stores from the backend once we know we're authenticated.
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const res = await fetch(`${API_URL}/stores`, {
        credentials: "include",
      });
      if (!active) return;
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(`Failed to load stores (${res.status})`);
        return;
      }
      setStores((await res.json()) as Store[]);
    })();
    return () => {
      active = false;
    };
  }, [session, router]);

  async function onSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (isPending || !session) {
    return <main className={styles.wrap}>Loading…</main>;
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Stores</h1>
        <button className={styles.signout} onClick={onSignOut}>
          Sign out
        </button>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {stores === null && !error && <p>Loading stores…</p>}

      {stores !== null && stores.length === 0 && <p>No stores yet.</p>}

      {stores !== null && stores.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>City</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.kind}</td>
                <td>{s.city ?? "—"}</td>
                <td>{s.country ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
