"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KioskHome } from "@/features/kiosk/KioskHome";

export default function CustomerPage() {
  const router = useRouter();

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const routeToMobile = () => {
      if (mobileQuery.matches) {
        router.replace("/customer/mobile");
      }
    };

    routeToMobile();
    mobileQuery.addEventListener("change", routeToMobile);
    return () => mobileQuery.removeEventListener("change", routeToMobile);
  }, [router]);

  return <KioskHome />;
}
