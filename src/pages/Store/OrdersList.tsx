import { formatTimestampDate } from "../../utils/dateTime";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { EffectiveOrderPaymentStatus, OrderStatus, StoreOrderListItem } from "../../api/orderApi";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import Pagination from "../../components/common/Pagination";
import { useOrders, useUpdateOrderStatus } from "../../hooks/useOrders";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const orderStatuses: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const paymentStatuses: EffectiveOrderPaymentStatus[] = ["PENDING", "PAYMENT_PENDING", "PAID", "FAILED", "REFUNDED"];
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

const statusStyle = (status: string) => {
  if (["PAID", "DELIVERED"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["FAILED", "REFUNDED", "CANCELLED"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["PROCESSING", "SHIPPED"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const statusLabel = (status: string) => status.replace(/_/g, " ");
const displayedPaymentStatus = (order: StoreOrderListItem): EffectiveOrderPaymentStatus => {
  if (order.effectivePaymentStatus) return order.effectivePaymentStatus;
  if (order.paymentStatus === "FAILED" || order.paymentStatus === "REFUNDED") return order.paymentStatus;
  if (order.invoice?.paymentStatus === "PAID") return "PAID";
  if (order.invoice?.paymentStatus === "PAYMENT_PENDING") return "PAYMENT_PENDING";
  return order.paymentStatus || "PENDING";
};

export default function OrdersList() {
  const [search, setSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const { markItemAsRead, isItemRead } = useSidebarBadges();
  const { can } = useCoachAccess();
  const updateStatus = useUpdateOrderStatus();
  const canEditOrders = can("orders", "edit");

  const { data, isLoading, isError } = useOrders({ search, status: orderStatusFilter, paymentStatus: paymentStatusFilter, page, limit });

  const orders = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages || 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <PageMeta title="CoachMax | Orders" description="Manage Store Orders" />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Orders" items={[{ name: "Store", path: "/products" }]} />

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 max-w-sm relative">
            <input 
              type="text" 
              aria-label="Search orders"
              placeholder="Search customer, email or invoice"
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Order status
              <select
                value={orderStatusFilter}
                onChange={(e) => { setOrderStatusFilter(e.target.value); setPage(1); }}
                className="rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="ALL">All order statuses</option>
                {orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Payment status
              <select
                value={paymentStatusFilter}
                onChange={(e) => { setPaymentStatusFilter(e.target.value); setPage(1); }}
                className="rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="ALL">All payment statuses</option>
                {paymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Order status</th>
                  <th className="py-3 px-4">Payment status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading orders...</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-red-500">Failed to load orders.</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No orders found.</td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const orderStatus = order.status || "PENDING";
                    const paymentStatus = displayedPaymentStatus(order);
                    const paymentLocked = paymentStatus === "PAID" || paymentStatus === "REFUNDED";
                    const orderId = order.orderNumber || order._id.slice(-8).toUpperCase();
                    const isUnread =
                      !isItemRead("orders", order._id) &&
                      (order.status === "PENDING" || order.status === "PROCESSING");
                    return (
                      <tr
                        key={order._id}
                        className={`border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all ${
                          isUnread ? "bg-blue-50/30 dark:bg-blue-950/10 font-bold" : ""
                        }`}
                      >
                        <td className="py-4 px-4 font-semibold text-[#0047FF]">
                          <Link to={`/orders/${order._id}`} onClick={() => markItemAsRead("orders", order._id)} className="inline-flex items-center gap-2 hover:underline">
                            {isUnread && (
                              <span
                                className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                                title="Unread Order"
                              />
                            )}
                            <span>{orderId}</span>
                          </Link>
                        </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{order.parent?.fullName || "N/A"}</div>
                        <div className="font-semibold text-slate-500">{order.parent?.email || ""}</div>
                      </td>
                      <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">{money.format(order.totalAmount || 0)}</td>
                      <td className="py-4 px-3 font-semibold text-slate-500">{formatTimestampDate(order.createdAt)}</td>
                      <td className="py-4 px-4">
                        {canEditOrders ? (
                          <select
                            aria-label={`Order status for ${orderId}`}
                            value={orderStatus}
                            disabled={updateStatus.isPending}
                            onChange={(event) => {
                              if (event.target.value !== orderStatus) updateStatus.mutate({ id: order._id, data: { status: event.target.value } });
                            }}
                            className={`w-full min-w-36 border px-2 py-1.5 font-bold outline-none focus:border-blue-500 disabled:opacity-60 ${statusStyle(orderStatus)}`}
                          >
                            {orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                          </select>
                        ) : <span className={`inline-flex border px-2 py-1.5 font-bold ${statusStyle(orderStatus)}`}>{statusLabel(orderStatus)}</span>}
                      </td>
                      <td className="py-4 px-4">
                        {canEditOrders ? (
                          <select
                            aria-label={`Payment status for ${orderId}`}
                            title={paymentLocked ? "Use Finance to refund or correct an approved payment" : undefined}
                            value={paymentStatus}
                            disabled={updateStatus.isPending || paymentLocked}
                            onChange={(event) => {
                              const next = event.target.value;
                              if (next !== paymentStatus && next !== "PAYMENT_PENDING" && next !== "REFUNDED") {
                                updateStatus.mutate({ id: order._id, data: { paymentStatus: next } });
                              }
                            }}
                            className={`w-full min-w-40 border px-2 py-1.5 font-bold outline-none focus:border-blue-500 disabled:opacity-60 ${statusStyle(paymentStatus)}`}
                          >
                            <option value="PENDING" disabled={paymentStatus === "PAYMENT_PENDING"}>PENDING</option>
                            <option value="PAYMENT_PENDING" disabled>PAYMENT PENDING</option>
                            <option value="PAID">PAID</option>
                            <option value="FAILED" disabled={paymentStatus === "PAYMENT_PENDING"}>FAILED</option>
                            <option value="REFUNDED" disabled>REFUNDED</option>
                          </select>
                        ) : <span className={`inline-flex border px-2 py-1.5 font-bold ${statusStyle(paymentStatus)}`}>{statusLabel(paymentStatus)}</span>}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
          
          {pagination && pagination.total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={pagination.total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
              limitOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      </div>
    </>
  );
}
