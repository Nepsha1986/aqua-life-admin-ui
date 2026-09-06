"use client";

import { Spinner } from "@heroui/react";
import { useSessionGate } from "@/lib/use-session-gate";

export default function Home() {
  // Admin-only app: the root has no content of its own — route visitors to the
  // dashboard when signed in, or to the login page when signed out.
  useSessionGate({ authedRedirect: "/overview", unauthedRedirect: "/login" });

  return (
    <main className="grid min-h-[100dvh] place-items-center p-6">
      <Spinner aria-label="Loading" />
    </main>
  );
}
