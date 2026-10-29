import { formatTimestampDate, formatDateOnly } from "../../utils/dateTime";
import { useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { useOrderDetails, useUpdateOrderStatus } from "../../hooks/useOrders";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { getMediaUrl } from "../../utils/media";

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useOrderDetails(id as string);
  const updateStatusMutation = useUpdateOrderStatus();
  const { markItemAsRead } = useSidebarBadges();

  useEffect(() => {
    if (id) {
      markItemAsRead("orders", id);
    }
  }, [id, markItemAsRead]);

  if (isLoading) return <div className="p-8 text-center text-slate-500 font-semibold">Loading order details...</div>;
  if (isError || !data?.data) return <div className="p-8 text-center text-rose-500 font-semibold">Failed to load order details or order not found.</div>;

  const order = data.data;

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({ id: order._id, data: { status: newStatus } });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    updateStatusMutation.mutate({ id: order._id, data: { paymentStatus: newPaymentStatus } });
  };

  return (
    <>
      <PageMeta title={`CoachMax | Order ${order.orderNumber || order._id.substring(order._id.length - 8)}`} description="Order Details" />
      <div className="space-y-6">
        <PageBreadcrumb 
          pageTitle={`Order Details: ${order.orderNumber || order._id.substring(order._id.length - 8)}`} 
          items={[{ name: "Store", path: "/products" }, { name: "Orders", path: "/orders" }]} 
        />

        <div className="bg-white dark:bg-gray-800 rounded-none border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 dark:border-gray-700 pb-8 mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">ORDER</h1>
              <p className="text-sm font-semibold text-gray-400 mt-1">#{order.orderNumber || order._id.substring(order._id.length - 8)}</p>
            </div>
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Status</span>
                <select
                  value={order.status || "PENDING"}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updateStatusMutation.isPending}
                  className={`rounded-none border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${
                    order.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : 
                    order.status === "CANCELLED" ? "text-rose-600 border-rose-200 bg-rose-50" : 
                    "text-amber-600 border-amber-200 bg-amber-50"
                  }`}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Payment</span>
                <select
                  value={order.paymentStatus || "PENDING"}
                  onChange={(e) => handlePaymentStatusChange(e.target.value)}
                  disabled={updateStatusMutation.isPending}
                  className={`rounded-none border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${
                    order.paymentStatus === "PAID" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : 
                    order.paymentStatus === "FAILED" ? "text-rose-600 border-rose-200 bg-rose-50" : 
                    "text-amber-600 border-amber-200 bg-amber-50"
                  }`}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3">Placed: {formatTimestampDate(order.createdAt)}</p>
              {order.paymentMethod && <p className="text-sm font-semibold text-gray-500 mt-1">Payment Method: {order.paymentMethod}</p>}
            </div>
          </div>

          {/* Customer & Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Customer (Parent) Info</h3>
              {order.parent ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {order.parent.fullName}
                      {order.parent.relationship && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">{order.parent.relationship}</span>
                      )}
                    </p>
                    <p className="text-sm font-semibold text-gray-500">{order.parent.email}</p>
                    <p className="text-sm font-semibold text-gray-500">Phone: {order.parent.phone}</p>
                    {order.parent.emergencyContact && <p className="text-sm font-semibold text-gray-500">Emergency: {order.parent.emergencyContact}</p>}
                  </div>
                  {(order.parent.address || order.parent.city) && (
                    <div className="text-sm font-semibold text-gray-500 mt-2">
                      <p>{order.parent.address}</p>
                      <p>{order.parent.city}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-500">N/A</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Shipping / Invoice Details</h3>
              
              <div className="space-y-4">
                {order.shippingAddress && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Delivery Address</p>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">{order.shippingAddress}</p>
                  </div>
                )}
                
                {order.invoice && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-none border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Linked Invoice</p>
                    <p className="text-sm font-bold text-[#0047FF]">{order.invoice.invoiceNumber}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-1">Due Date: {formatDateOnly(order.invoice.dueDate)}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-1">Status: {order.invoice.status} / {order.invoice.paymentStatus}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-10">
            <div className="grid grid-cols-12 gap-4 border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
              <div className="col-span-6 md:col-span-8"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Item</span></div>
              <div className="col-span-3 md:col-span-2 text-right"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Qty</span></div>
              <div className="col-span-3 md:col-span-2 text-right"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Price</span></div>
            </div>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-6">
                {order.items.map((item: any, idx: number) => {
                  const productImage = item.product?.images?.[0] 
                    ? getMediaUrl(item.product.images[0])
                    : null;

                  return (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-6 md:col-span-8 flex items-start gap-4">
                        {productImage ? (
                          <img src={productImage} alt={item.product?.name} className="w-16 h-16 object-cover border border-slate-100 dark:border-slate-700" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                            <span className="text-[10px] text-slate-400">No Img</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{item.product?.name || item.title || "Product"}</p>
                          {item.product?.category?.name && (
                            <p className="text-xs font-bold text-brand-500 uppercase mt-0.5">{item.product.category.name}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-gray-500">
                            {item.selectedSize && <span>Size: <strong className="text-gray-700 dark:text-gray-300">{item.selectedSize}</strong></span>}
                            {item.selectedColor && <span>Color: <strong className="text-gray-700 dark:text-gray-300">{item.selectedColor}</strong></span>}
                          </div>
                          {item.description && <p className="text-xs font-semibold text-gray-500 mt-1">{item.description}</p>}
                        </div>
                      </div>
                      <div className="col-span-3 md:col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">x {item.quantity || 1}</p>
                      </div>
                      <div className="col-span-3 md:col-span-2 text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">${item.price || item.amount || 0}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-500">No items found for this order.</p>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="w-full md:w-1/3 space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>${order.subtotal || order.totalAmount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                <span>Shipping</span>
                <span>${order.shippingCost || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-rose-500">
                <span>Discount</span>
                <span>-${order.discount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-100 dark:border-gray-700">
                <span>Total</span>
                <span>${order.totalAmount || 0}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order Notes</h3>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
