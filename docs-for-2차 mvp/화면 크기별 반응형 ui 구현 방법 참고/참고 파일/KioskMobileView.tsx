import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CreditCard, Package, Phone, ReceiptText, Store } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatPrice, getTableBadgeLabel } from "../lib/format";
import { getKioskTabKey, isActiveKioskTab } from "../lib/tab";
import { useMobileProductPager } from "../model/useMobileProductPager";
import type { KioskOrderModel } from "../model/useKioskOrder";
import { KioskDialogs } from "./KioskDialogs";
import { MenuCard } from "./MenuCard";
import { OrderTypeButton } from "./OrderTypeButton";
import { StatePanel } from "./StatePanel";

export function KioskMobileView({ kiosk }: { kiosk: KioskOrderModel }) {
  const {
    activeTab,
    billableOrders,
    cart,
    cartItems,
    createOrderMutation,
    displayQuantity,
    displayTotalPrice,
    isError,
    isLoading,
    openPaymentDialog,
    openProductDetail,
    openStaffCallDialog,
    orderType,
    payableOrders,
    products,
    requestSubmitOrder,
    setActiveTab,
    setOrderType,
    tableName,
    tabs,
    toggleProductSelection,
    totalQuantity,
    updateQuantity,
    visibleCancelNotices,
    setCancelNoticesOpen,
  } = kiosk;
  const {
    activeProduct,
    activeProductIndex,
    activeProductKey,
    finishTouch,
    moveProduct,
    setTouchStartX,
    slideDirection,
  } = useMobileProductPager(activeTab, products);

  return (
    <main className="min-h-[calc(100svh-3.5rem)] bg-zinc-50 pb-44">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span
            aria-label={tableName ? `${tableName} 테이블` : "테이블 미설정"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-xl font-black leading-none text-primary-foreground tabular-nums"
          >
            {getTableBadgeLabel(tableName)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black">키오스크 주문</h1>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {tableName || "테이블명 미설정"}
            </p>
          </div>
          {visibleCancelNotices.length > 0 ? (
            <button
              type="button"
              onClick={() => setCancelNoticesOpen(true)}
              className="h-9 rounded-md border border-red-300 bg-red-50 px-3 text-xs font-black text-red-700"
            >
              취소 {visibleCancelNotices.length}
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <OrderTypeButton
            active={orderType === "dine-in"}
            icon={Store}
            label="매장"
            onClick={() => setOrderType("dine-in")}
          />
          <OrderTypeButton
            active={orderType === "takeout"}
            icon={Package}
            label="포장"
            onClick={() => setOrderType("takeout")}
          />
        </div>
      </header>

      <nav className="sticky top-[124px] z-20 flex gap-2 overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        {tabs.map((tab) => {
          const active = isActiveKioskTab(activeTab, tab);

          return (
            <button
              key={getKioskTabKey(tab)}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-10 shrink-0 rounded-md border px-4 text-sm font-black",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-zinc-300 bg-white text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="flex min-h-[calc(100svh-25rem)] items-center px-4 pb-4 pt-0">
        {isLoading ? (
          <StatePanel message="메뉴를 불러오는 중입니다." />
        ) : isError ? (
          <StatePanel message="메뉴를 불러오지 못했습니다." tone="error" />
        ) : products.length === 0 ? (
          <StatePanel
            message={
              activeTab.type === "SET"
                ? "등록된 세트 메뉴가 없습니다."
                : "표시할 메뉴가 없습니다."
            }
          />
        ) : (
          <div className="relative mx-auto w-full max-w-md">
            {products.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="이전 메뉴"
                  onClick={() => moveProduct(-1)}
                  disabled={activeProductIndex <= 0}
                  className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-300 bg-white/95 text-zinc-900 shadow-md disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="다음 메뉴"
                  onClick={() => moveProduct(1)}
                  disabled={activeProductIndex >= products.length - 1}
                  className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-300 bg-white/95 text-zinc-900 shadow-md disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
            <div
              id="kiosk-menu-list"
              className="mx-auto w-[calc(100vw-6rem)] max-w-[360px] touch-pan-y overflow-hidden pb-4"
              onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
              onTouchEnd={(event) => finishTouch(event.changedTouches[0]?.clientX ?? 0)}
              onTouchCancel={() => setTouchStartX(null)}
            >
              <AnimatePresence mode="popLayout" initial={false} custom={slideDirection}>
                {activeProduct && activeProductKey ? (
                  <motion.div
                    key={activeProductKey}
                    custom={slideDirection}
                    initial={{ x: slideDirection * 48, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: slideDirection * -48, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <MenuCard
                      product={activeProduct}
                      quantity={cart[activeProductKey]?.quantity ?? 0}
                      onMinus={() => updateQuantity(activeProduct, -1)}
                      onPlus={() => updateQuantity(activeProduct, 1)}
                      onOpenDetail={() => openProductDetail(activeProduct)}
                      onToggle={() => toggleProductSelection(activeProduct)}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            {products.length > 1 ? (
              <div className="mt-1 flex justify-center gap-1.5" aria-label="메뉴 위치">
                {products.map((product, index) => (
                  <span
                    key={`${product.type}:${product.id}:dot`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === Math.min(activeProductIndex, products.length - 1)
                        ? "w-5 bg-zinc-900"
                        : "w-1.5 bg-zinc-300",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-300 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">총 수량 {displayQuantity}개</p>
              <p className="text-2xl font-black">{formatPrice(displayTotalPrice)}원</p>
            </div>
            <div className="text-right text-xs font-semibold text-muted-foreground">
              {cartItems.length > 0 ? `선택 ${totalQuantity}개` : `접수 ${billableOrders.length}건`}
            </div>
          </div>
          <button
            type="button"
            onClick={requestSubmitOrder}
            disabled={(totalQuantity === 0 && billableOrders.length === 0) || createOrderMutation.isPending || !tableName.trim()}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ReceiptText className="h-4 w-4" />
            {createOrderMutation.isPending
              ? "접수 중"
              : billableOrders.length > 0 && totalQuantity === 0
                ? "추가 메뉴를 선택해주세요"
                : billableOrders.length > 0
                  ? "추가 주문 접수하기"
                  : "주문 접수하기"}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openPaymentDialog}
              disabled={payableOrders.length === 0 || !tableName.trim()}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-bold disabled:opacity-40"
            >
              <CreditCard className="h-4 w-4" />
              결제
            </button>
            <button
              type="button"
              onClick={openStaffCallDialog}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-bold"
            >
              <Phone className="h-4 w-4" />
              직원 호출
            </button>
          </div>
        </div>
      </section>

      <KioskDialogs kiosk={kiosk} />
    </main>
  );
}
