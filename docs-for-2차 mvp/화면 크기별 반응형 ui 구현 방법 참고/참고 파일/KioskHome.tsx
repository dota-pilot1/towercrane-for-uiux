"use client";

import { useKioskOrder } from "./model/useKioskOrder";
import { KioskDesktopView } from "./ui/KioskDesktopView";
import { KioskMobileView } from "./ui/KioskMobileView";

export function KioskHome({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const kiosk = useKioskOrder();

  if (variant === "mobile") {
    return <KioskMobileView kiosk={kiosk} />;
  }

  return <KioskDesktopView kiosk={kiosk} />;
}
