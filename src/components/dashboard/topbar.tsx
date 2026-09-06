"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title =
    NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Dashboard";

  async function onSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button variant="tertiary" size="sm" onPress={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
