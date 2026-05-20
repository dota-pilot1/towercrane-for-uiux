import { Check, CircleHelp, CreditCard, Minus, Package, Phone, Plus, ReceiptText, ShoppingBag, Store } from "lucide-react";
import type { StaffCallType } from "@/entities/staff-call/model/types";
import { cn } from "@/shared/lib/utils";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { NoticeDialog } from "@/shared/ui/NoticeDialog";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { Switch } from "@/shared/ui/Switch";
import { toCartKey } from "../lib/cart";
import { formatPrice, formatTime, getTableBadgeLabel } from "../lib/format";
import { getKioskTabKey, isActiveKioskTab } from "../lib/tab";
import { staffCallTypeLabel } from "../model/constants";
import type { KioskOrderModel } from "../model/useKioskOrder";
import { AcceptedOrdersSummary } from "./AcceptedOrdersSummary";
import { CanceledOrderSummary, OrderConfirmSummary, OrderNoticeSummary } from "./OrderSummaries";
import { MenuCard } from "./MenuCard";
import { MenuDetailDialog } from "./MenuDetailDialog";
import { OrderTypeButton } from "./OrderTypeButton";
import { PaymentModePicker } from "./PaymentModePicker";
import { PaymentReadySummary } from "./PaymentReadySummary";
import { QuantityButton } from "./QuantityButton";
import { StaffCallStatusItem } from "./StaffCallStatusItem";
import { StatePanel } from "./StatePanel";

export function KioskDesktopView({ kiosk }: { kiosk: KioskOrderModel }) {
  const {
    activeOrdersLoading,
    activeStaffCalls,
    activeTab,
    acceptedOrders,
    acknowledgeCanceledOrdersMutation,
    acknowledgeVisibleCancelNotices,
    basicRequestSelected,
    billableOrders,
    cancelNoticesOpen,
    cancelOrderMutation,
    cancelStaffCallMutation,
    canceledOrder,
    cart,
    cartItems,
    closePaymentDialog,
    completedOrder,
    confirmSettingsPassword,
    createOrderMutation,
    createStaffCallMutation,
    closeProductDetail,
    detailProduct,
    displayQuantity,
    displayTotalPrice,
    draftHeaderNavVisible,
    isError,
    isLoading,
    openPaymentDialog,
    openProductDetail,
    openSettingsPasswordDialog,
    openStaffCallDialog,
    orderConfirmOpen,
    orderType,
    orderTypeLabel,
    payableOrders,
    paymentDialogOpen,
    paymentGuideCopy,
    paymentLaunching,
    paymentSelectionMode,
    products,
    requestSubmitOrder,
    requestTossPayment,
    selectPaymentMode,
    selectedPaymentOrderIds,
    selectedPaymentOrders,
    selectedPaymentTotalPrice,
    setActiveTab,
    setBasicRequestSelected,
    setCancelNoticesOpen,
    setCanceledOrder,
    setCompletedOrder,
    setDraftHeaderNavVisible,
    setOrderConfirmOpen,
    setOrderType,
    setSettingsOpen,
    setSettingsPassword,
    setSettingsPasswordError,
    setSettingsPasswordOpen,
    setStaffCallDialogOpen,
    setStaffCallMessage,
    setStaffCallType,
    settingsOpen,
    settingsPassword,
    settingsPasswordError,
    settingsPasswordOpen,
    staffCallDialogOpen,
    staffCallMessage,
    staffCallType,
    submitOrder,
    tableName,
    tabs,
    togglePaymentOrder,
    toggleProductSelection,
    totalPrice,
    totalQuantity,
    updateCartItemQuantity,
    updateKioskHeaderNavMutation,
    updateQuantity,
    visibleCancelNotices,
  } = kiosk;
  return (
    <main className="min-h-[calc(100svh-3.5rem)] overflow-y-auto bg-zinc-50 px-4 py-4 lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
      <div className="mx-auto grid min-h-0 max-w-7xl gap-4 lg:h-full lg:grid-cols-[1fr_360px]">
        <section className="flex min-w-0 flex-col gap-4 lg:overflow-hidden">
          <div className="flex flex-shrink-0 flex-col gap-4 rounded-lg border border-zinc-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                aria-label={tableName ? `${tableName} 테이블` : "테이블 미설정"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-2xl font-black leading-none text-primary-foreground tabular-nums"
              >
                {getTableBadgeLabel(tableName)}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">키오스크 주문</h1>
                <p className="text-sm text-muted-foreground">
                  {tableName || "테이블명 미설정"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-[360px]">
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
          </div>

          <div className="flex-shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {tabs.map((tab) => {
              const active = isActiveKioskTab(activeTab, tab);

              return (
                <button
                  key={getKioskTabKey(tab)}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`h-12 rounded-md border px-3 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-zinc-300 bg-white text-foreground hover:bg-zinc-50"
                  }`}
                >
                  <span className="line-clamp-1">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="min-h-[320px] lg:flex-1 lg:overflow-y-auto lg:pr-1">
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
            ) : activeTab.type !== "ALL" ? (
              <div id="kiosk-menu-list" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => {
                  const key = toCartKey(product.type, product.id);
                  return (
                    <MenuCard
                      key={key}
                      product={product}
                      quantity={cart[key]?.quantity ?? 0}
                      onMinus={() => updateQuantity(product, -1)}
                      onPlus={() => updateQuantity(product, 1)}
                      onOpenDetail={() => openProductDetail(product)}
                      onToggle={() => toggleProductSelection(product)}
                    />
                  );
                })}
              </div>
            ) : (
              <div id="kiosk-menu-list" className="space-y-6">
                {(() => {
                  const groups: { label: string; items: typeof products }[] = [];
                  for (const product of products) {
                    const label =
                      product.type === "SALE_MENU_SET"
                        ? "세트 메뉴"
                        : (product.category?.name ?? "기타");
                    const last = groups[groups.length - 1];
                    if (last && last.label === label) {
                      last.items.push(product);
                    } else {
                      groups.push({ label, items: [product] });
                    }
                  }
                  return groups.map((group) => (
                    <div key={group.label}>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="text-base font-black tracking-normal text-foreground">{group.label}</span>
                        <div className="flex-1 border-t border-zinc-300" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((product) => {
                          const key = toCartKey(product.type, product.id);
                          return (
                            <MenuCard
                              key={key}
                              product={product}
                              quantity={cart[key]?.quantity ?? 0}
                              onMinus={() => updateQuantity(product, -1)}
                              onPlus={() => updateQuantity(product, 1)}
                              onOpenDetail={() => openProductDetail(product)}
                              onToggle={() => toggleProductSelection(product)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </section>

        <aside className="flex flex-col lg:h-full lg:overflow-hidden">
          <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm lg:h-full">
            <div className="flex items-center justify-between border-b border-zinc-300 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">주문 내역</h2>
              </div>
              <div className="flex items-center gap-2">
                {visibleCancelNotices.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCancelNoticesOpen(true)}
                    className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    취소({visibleCancelNotices.length})
                  </button>
                ) : null}
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {orderTypeLabel}
                </span>
              </div>
            </div>

            <>
                <div className="flex-1 divide-y divide-border overflow-y-auto">
                  {acceptedOrders.length > 0 && (
                    <AcceptedOrdersSummary
                      orders={acceptedOrders}
                      cancelingOrderId={cancelOrderMutation.variables ?? null}
                      onCancelOrder={(orderId) => cancelOrderMutation.mutate(orderId)}
                    />
                  )}
                  {cartItems.length === 0 ? (
                    acceptedOrders.length === 0 && (
                      <div className="flex h-44 items-center justify-center bg-zinc-50 text-sm text-muted-foreground">
                        {activeOrdersLoading ? "주문 내역을 불러오는 중입니다" : "선택한 메뉴가 없습니다"}
                      </div>
                    )
                  ) : (
                    <section className="bg-white">
                      <div className="flex items-center justify-between bg-zinc-50 px-4 py-3">
                        <p className="text-sm font-bold">
                          {billableOrders.length > 0 ? "추가 주문" : "선택한 메뉴"}
                        </p>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                          {totalQuantity}개
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-200 border-t border-zinc-300">
                        {cartItems.map((item) => (
                          <div key={item.key} className="bg-background px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatPrice(item.price)}원
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-bold">
                                {formatPrice(item.price * item.quantity)}원
                              </span>
                            </div>
                            {item.type === "SALE_MENU_SET" && item.components.length > 0 && (
                              <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-2">
                                {item.components.map((component) => (
                                  <div
                                    key={`${item.key}:${component.name}:${component.quantity}`}
                                    className="flex min-h-5 items-center justify-between gap-2 text-xs"
                                  >
                                    <span className="min-w-0 truncate text-muted-foreground">
                                      {component.name}
                                    </span>
                                    <span className="shrink-0 font-semibold text-foreground">
                                      x{component.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <QuantityButton
                                label="감소"
                                onClick={() => updateCartItemQuantity(item, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </QuantityButton>
                              <span className="flex h-8 w-9 items-center justify-center rounded-md bg-muted text-sm font-bold">
                                {item.quantity}
                              </span>
                              <QuantityButton
                                label="증가"
                                onClick={() => updateCartItemQuantity(item, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </QuantityButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <div className="space-y-3 border-t border-zinc-300 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">수량</span>
                    <span className="font-semibold">{displayQuantity}개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      총 금액
                    </span>
                    <span className="text-2xl font-bold">{formatPrice(displayTotalPrice)}원</span>
                  </div>

                  <button
                    type="button"
                    onClick={requestSubmitOrder}
                    disabled={(totalQuantity === 0 && billableOrders.length === 0) || createOrderMutation.isPending || !tableName.trim()}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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

                  {activeStaffCalls.length > 0 ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3">
                      <div className="flex items-center gap-2 text-rose-800">
                        <Phone className="h-4 w-4" />
                        <p className="text-sm font-bold">직원 호출 중</p>
                      </div>
                      <div className="mt-2 space-y-2">
                        {activeStaffCalls.map((call) => (
                          <StaffCallStatusItem
                            key={call.id}
                            call={call}
                            onCancel={() => cancelStaffCallMutation.mutate(call.id)}
                            canceling={
                              cancelStaffCallMutation.isPending &&
                              cancelStaffCallMutation.variables === call.id
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={openPaymentDialog}
                      disabled={payableOrders.length === 0 || !tableName.trim()}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CreditCard className="h-4 w-4" />
                      결제
                      {payableOrders.length > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                          {payableOrders.length}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={openStaffCallDialog}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Phone className="h-4 w-4" />
                      직원 호출
                      {activeStaffCalls.length > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                          {activeStaffCalls.length}
                        </span>
                      ) : null}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 rounded-md border border-dashed border-border bg-background p-3">
                    <div className="flex min-w-0 gap-2">
                      <button
                        type="button"
                        aria-label="로그인바 설정"
                        title="로그인바 설정"
                        onClick={openSettingsPasswordDialog}
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <CircleHelp className="h-4 w-4" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{paymentGuideCopy.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {paymentGuideCopy.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
            </>
          </div>
        </aside>
      </div>
      <ConfirmDialog
        open={orderConfirmOpen}
        title={billableOrders.length > 0 ? "추가 주문을 접수할까요?" : "주문을 접수할까요?"}
        description="접수 후 주방에 주문 요청이 전달됩니다."
        confirmText={createOrderMutation.isPending ? "접수 중" : "주문 접수"}
        cancelText="다시 확인"
        loading={createOrderMutation.isPending}
        onCancel={() => setOrderConfirmOpen(false)}
        onConfirm={submitOrder}
      >
        <OrderConfirmSummary
          tableName={tableName}
          orderTypeLabel={orderTypeLabel}
          items={cartItems}
          totalQuantity={totalQuantity}
          totalPrice={totalPrice}
        />
      </ConfirmDialog>
      <NoticeDialog
        open={!!completedOrder}
        title="주문이 접수되었습니다"
        tone="success"
        confirmText="확인"
        onConfirm={() => setCompletedOrder(null)}
      >
        {completedOrder && (
          <OrderNoticeSummary order={completedOrder} tableName={tableName} />
        )}
      </NoticeDialog>
      <NoticeDialog
        open={!!canceledOrder}
        title="주문이 취소되었습니다"
        tone="info"
        confirmText="확인"
        onConfirm={() => {
          setCanceledOrder(null);
          if (tableName.trim()) {
            acknowledgeCanceledOrdersMutation.mutate();
          }
        }}
      >
        {canceledOrder && (
          <CanceledOrderSummary order={canceledOrder} tableName={tableName} />
        )}
      </NoticeDialog>
      <ConfirmDialog
        open={paymentDialogOpen}
        title={paymentSelectionMode ? "결제할 주문을 확인해주세요" : "결제 방식을 선택해주세요"}
        description={
          paymentSelectionMode
            ? "선택한 주문 묶음에 대해 토스 결제창을 한 번만 엽니다."
            : "단건은 주문 1건만 결제하고, 다건은 여러 주문을 한 번에 묶어 결제합니다."
        }
        confirmText={
          !paymentSelectionMode
            ? "결제 방식 선택"
            : paymentLaunching
              ? "결제창 여는 중"
              : "테스트 결제하기"
        }
        cancelText={paymentSelectionMode ? "방식 변경" : "닫기"}
        loading={paymentLaunching}
        confirmDisabled={!paymentSelectionMode || selectedPaymentOrders.length === 0 || selectedPaymentTotalPrice <= 0}
        onCancel={closePaymentDialog}
        onConfirm={() => {
          if (!paymentSelectionMode) return;
          void requestTossPayment();
        }}
      >
        {paymentSelectionMode ? (
          <PaymentReadySummary
            mode={paymentSelectionMode}
            orders={payableOrders}
            selectedOrderIds={selectedPaymentOrderIds}
            tableName={tableName}
            totalPrice={selectedPaymentTotalPrice}
            onToggleOrder={togglePaymentOrder}
          />
        ) : (
          <PaymentModePicker
            orders={payableOrders}
            onSelectMode={selectPaymentMode}
          />
        )}
      </ConfirmDialog>
      <NoticeDialog
        open={cancelNoticesOpen}
        title="취소 안내"
        tone="error"
        confirmText="확인"
        onConfirm={acknowledgeVisibleCancelNotices}
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            취소된 주문입니다.
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {visibleCancelNotices.map((notice) => (
              <div
                key={notice.key}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-red-700">
                  <span className="min-w-0 truncate">
                    {notice.orderNo ? `주문번호: ${notice.orderNo}` : "취소된 주문"}
                  </span>
                  <span className="shrink-0">
                    {formatTime(notice.receivedAt.toISOString())}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-red-800">{notice.message}</p>
                {notice.items.length > 0 ? (
                  <div className="mt-3 divide-y divide-red-100 rounded-md border border-red-100 bg-white/70">
                    {notice.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {formatPrice(item.unitPrice)}원 x {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-foreground">
                          {formatPrice(item.lineTotal)}원
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-md border border-red-100 bg-white/70 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    취소된 메뉴 정보는 주문 내역 동기화 후 표시됩니다.
                  </p>
                )}
                {notice.totalAmount != null ? (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-red-100 px-3 py-2 text-red-800">
                    <span className="text-xs font-bold">
                      취소 수량 {notice.totalQuantity ?? notice.items.reduce((sum, item) => sum + item.quantity, 0)}개
                    </span>
                    <span className="text-sm font-black">{formatPrice(notice.totalAmount)}원</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </NoticeDialog>
      {staffCallDialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-3xl rounded-lg border border-border bg-background p-5 shadow-xl">
            <h2 className="text-lg font-black">직원 호출</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tableName ? `${tableName}에서 직원을 호출합니다.` : "테이블명이 필요합니다."}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <section className="rounded-md border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-black">기본 요청</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {(["물", "냅킨", "앞접시", "그릇 치워주세요"] as const).map((item) => {
                    const checked = basicRequestSelected.has(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setBasicRequestSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(item)) next.delete(item);
                            else next.add(item);
                            return next;
                          });
                        }}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-md border bg-background px-3 text-left text-sm font-bold transition-colors",
                          checked
                            ? "border-primary text-primary"
                            : "border-border hover:bg-accent",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background",
                          )}
                        >
                          {checked ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-md border border-border bg-background p-4">
                <h3 className="text-sm font-black">직원 호출</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["GENERAL", "REFILL", "QUESTION", "PAYMENT", "OTHER"] as StaffCallType[]).map((type) => {
                    const selected = staffCallType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setStaffCallType(type)}
                        className={cn(
                          "h-11 rounded-md border text-sm font-bold transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        {staffCallTypeLabel[type]}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={staffCallMessage}
                  onChange={(event) => setStaffCallMessage(event.target.value)}
                  rows={4}
                  maxLength={200}
                  placeholder={
                    staffCallType === "OTHER" && basicRequestSelected.size === 0
                      ? "필요한 도움을 입력해주세요. (필수)"
                      : "추가 메시지를 입력해주세요. (선택)"
                  }
                  className="mt-3 w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </section>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={createStaffCallMutation.isPending}
                onClick={() => {
                  setStaffCallDialogOpen(false);
                  setStaffCallMessage("");
                  setStaffCallType("GENERAL");
                  setBasicRequestSelected(new Set());
                }}
                className="h-10 rounded-md border border-border px-4 text-sm font-bold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={
                  createStaffCallMutation.isPending ||
                  !tableName.trim() ||
                  (
                    basicRequestSelected.size === 0 &&
                    staffCallType === "OTHER" &&
                    !staffCallMessage.trim()
                  )
                }
                onClick={() => createStaffCallMutation.mutate()}
                className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createStaffCallMutation.isPending ? "요청 중" : "요청하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {settingsPasswordOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              confirmSettingsPassword();
            }}
            className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
          >
            <h2 className="text-lg font-black">로그인바 설정</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              로그인바 표시를 변경하려면 관리자 비밀번호를 입력해주세요.
            </p>
            <div className="mt-4">
              <label className="text-sm font-bold" htmlFor="kiosk-settings-password">
                비밀번호
              </label>
              <div className="mt-2">
                <PasswordInput
                  id="kiosk-settings-password"
                  value={settingsPassword}
                  autoFocus
                  onChange={(event) => {
                    setSettingsPassword(event.target.value);
                    setSettingsPasswordError("");
                  }}
                  invalid={!!settingsPasswordError}
                  className="h-11"
                />
              </div>
              {settingsPasswordError ? (
                <p className="mt-2 text-xs font-semibold text-destructive">
                  {settingsPasswordError}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsPasswordOpen(false);
                  setSettingsPassword("");
                  setSettingsPasswordError("");
                }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                확인
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {settingsOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-xl">
            <h2 className="text-lg font-black">로그인바 설정</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              키오스크 화면의 상단 로그인바 표시 방식을 조정합니다.
            </p>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-md border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-black">로그인바 출력 여부</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  끄면 키오스크 화면에서 상단 로그인/로그아웃 바가 숨겨집니다.
                </p>
              </div>
              <Switch
                checked={draftHeaderNavVisible}
                onCheckedChange={setDraftHeaderNavVisible}
                aria-label="로그인바 출력 여부"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={updateKioskHeaderNavMutation.isPending}
                onClick={() => {
                  setSettingsOpen(false);
                  setSettingsPassword("");
                  setSettingsPasswordError("");
                }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                disabled={updateKioskHeaderNavMutation.isPending}
                onClick={() => updateKioskHeaderNavMutation.mutate()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {updateKioskHeaderNavMutation.isPending ? "저장 중" : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <MenuDetailDialog product={detailProduct} onClose={closeProductDetail} />
    </main>
  );
}
