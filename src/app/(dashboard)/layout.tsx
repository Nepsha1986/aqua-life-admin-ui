"use client";

import { Spinner } from "@heroui/react";
import { useSessionGate } from "@/lib/use-session-gate";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isPending } = useSessionGate({ unauthedRedirect: "/login" });

  if (isPending || !session) {
    return (
      <main className="grid min-h-[100dvh] place-items-center p-6">
        <Spinner aria-label="Loading" />
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
