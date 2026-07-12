"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

type SessionGateOptions = {
  /** Where to send a visitor who IS authenticated (e.g. away from /login). */
  authedRedirect?: string;
  /** Where to send a visitor who is NOT authenticated (e.g. to /login). */
  unauthedRedirect?: string;
};

/**
 * Shared client-side auth guard. Waits for the session to resolve, then
 * redirects based on auth state. Returns the resolved session so callers can
 * render their own loading / authenticated UI.
 */
export function useSessionGate({
  authedRedirect,
  unauthedRedirect,
}: SessionGateOptions = {}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    if (session && authedRedirect) {
      router.replace(authedRedirect);
    } else if (!session && unauthedRedirect) {
      router.replace(unauthedRedirect);
    }
  }, [isPending, session, authedRedirect, unauthedRedirect, router]);

  return { session, isPending };
}
