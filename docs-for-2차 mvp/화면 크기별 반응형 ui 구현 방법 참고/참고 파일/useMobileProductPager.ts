import { useEffect, useState } from "react";
import type { CustomerSaleProduct } from "@/entities/customer-sale-product/model/types";
import type { KioskTab } from "./types";
import { toCartKey } from "../lib/cart";

export function useMobileProductPager(activeTab: KioskTab, products: CustomerSaleProduct[]) {
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeProduct = products[activeProductIndex] ?? null;
  const activeProductKey = activeProduct ? toCartKey(activeProduct.type, activeProduct.id) : null;

  useEffect(() => {
    setActiveProductIndex(0);
  }, [activeTab, products.length]);

  const moveProduct = (delta: number) => {
    setSlideDirection(delta >= 0 ? 1 : -1);
    setActiveProductIndex((current) =>
      Math.max(0, Math.min(current + delta, products.length - 1))
    );
  };

  const finishTouch = (clientX: number) => {
    if (touchStartX == null) return;
    const deltaX = clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(deltaX) < 48) return;
    if (deltaX < 0) {
      moveProduct(1);
    } else {
      moveProduct(-1);
    }
  };

  return {
    activeProduct,
    activeProductIndex,
    activeProductKey,
    finishTouch,
    moveProduct,
    setTouchStartX,
    slideDirection,
  };
}
