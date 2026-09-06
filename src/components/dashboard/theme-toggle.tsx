"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ToggleButton } from "@heroui/react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ToggleButton aria-label="Toggle theme" isIconOnly isDisabled />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <ToggleButton
      aria-label="Toggle theme"
      isIconOnly
      isSelected={isDark}
      onChange={(selected) => setTheme(selected ? "dark" : "light")}
    >
      {isDark ? "🌙" : "☀️"}
    </ToggleButton>
  );
}
