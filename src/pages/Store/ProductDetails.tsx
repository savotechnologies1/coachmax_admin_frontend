import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink, Package, ShoppingCart, Users, Wallet, Clock3, Pencil } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { useProductInsights } from "../../hooks/useProducts";
import { formatTimestampDate } from "../../utils/dateTime";
import { getMediaUrl, MEDIA_PLACEHOLDER } from "../../utils/media";

const money = (minor: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format((minor || 0) / 100);
const price = (amount: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount || 0);

const statusColor = (value: string) => {
  const status = String(value || "").toUpperCase();
  if (["PAID", "DELIVERED", "ACTIVE", "IN_STOCK"].includes(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["CANCELLED", "REFUNDED", "FAILED", "INACTIVE", "OUT_OF_STOCK"].includes(status)) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const Status = ({ value }: { value: string }) => <span className={`inline-flex border px-2 py-1 text-[11px] font-bold ${statusColor(value)}`}>{String(value || "Unknown").replace(/_/g, " ")}</span>;

export default function ProductDetails() {
  const { id = "" } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const { data, isLoading, isError, error, refetch } = useProductInsights(id, page);

  if (isLoading && !data) return <div role="status" className="p-8 text-center text-slate-500">Loading product and sales…</div>;
  if (isError || !data) return <div role="alert" className="p-8 text-center text-rose-600">{error?.message || "Product details could not be loaded."} <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">Retry</button></div>;

  const { product, summary, orders, pagination } = data;
  const images = product.images?.length ? product.images : [MEDIA_PLACEHOLDER];
  const imageUrl = getMediaUrl(images[Math.min(activeImage, images.length - 1)]);
  const metricCards = [
    { label: "Orders placed", value: String(summary.orderCount), icon: ShoppingCart, detail: `${summary.unitsOrdered} units ordered` },
    { label: "Units sold", value: String(summary.unitsSold), icon: Package, detail: "Paid, non-cancelled orders" },
    { label: "Paid revenue", value: money(summary.paidRevenueMinor), icon: Wallet, detail: "Gross product sales" },
    { label: "Paid buyers", value: String(summary.buyerCount), icon: Users, detail: "Unique parent accounts" },
    { label: "Awaiting payment", value: money(summary.pendingRevenueMinor), icon: Clock3, detail: "Pending, non-cancelled orders" },
  ];

  return <>
    <PageMeta title={`${product.name} | CoachMax Store`} description={`Product details and sales for ${product.name}`} />
    <PageBreadcrumb pageTitle={product.name} items={[{ name: "Store", path: "/products" }, { name: "Merchandise Catalog", path: "/products" }]}>
      <Link to="/products" className="inline-flex min-h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><ArrowLeft size={15} /> Back to catalog</Link>
      <Link to={`/edit-product/${product._id}`} className="inline-flex min-h-10 items-center gap-2 bg-[#0047FF] px-4 text-xs font-bold text-white hover:bg-blue-700"><Pencil size={14} /> Edit product</Link>
    </PageBreadcrumb>

    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metricCards.map((metric) => <div key={metric.label} className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</span><metric.icon size={17} className="text-[#0047FF]" /></div>
        <strong className="mt-2 block text-xl text-slate-900 dark:text-white">{metric.value}</strong>
        <span className="mt-1 block text-[11px] text-slate-500">{metric.detail}</span>
      </div>)}
    </div>

    <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
      <section className="border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Product images">
        <div className="aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800">
          <img src={imageUrl} alt={product.name} onError={(event) => { if (!event.currentTarget.src.endsWith(MEDIA_PLACEHOLDER)) event.currentTarget.src = MEDIA_PLACEHOLDER; }} className="h-full w-full object-contain" />
        </div>
        {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Show product image ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)} className={`h-16 w-16 shrink-0 border p-1 ${activeImage === index ? "border-[#0047FF]" : "border-slate-200 dark:border-slate-700"}`}><img src={getMediaUrl(image)} alt="" onError={(event) => { if (!event.currentTarget.src.endsWith(MEDIA_PLACEHOLDER)) event.currentTarget.src = MEDIA_PLACEHOLDER; }} className="h-full w-full object-contain" /></button>)}</div>}
      </section>
      <section className="border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="product-information-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div><p className="text-xs font-semibold text-[#0047FF]">{product.category?.name || "Uncategorized"}</p><h2 id="product-information-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Product information</h2><p className="mt-1 text-sm text-slate-500">{product.shortHighlight || "No short highlight added."}</p></div>
          <strong className="text-xl text-[#0047FF]">{price(product.price)}</strong>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-5 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Current stock</dt><dd className="mt-1 font-bold text-slate-900 dark:text-white">{product.stock}</dd></div>
          <div><dt className="text-xs text-slate-500">Availability</dt><dd className="mt-1"><Status value={product.availabilityStatus} /></dd></div>
          <div><dt className="text-xs text-slate-500">Catalog status</dt><dd className="mt-1"><Status value={product.status} /></dd></div>
          <div><dt className="text-xs text-slate-500">Sizes</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{product.sizes?.length ? product.sizes.join(", ") : "Not specified"}</dd></div>
          <div><dt className="text-xs text-slate-500">Colors</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{product.colors?.length ? product.colors.join(", ") : "Not specified"}</dd></div>
          <div><dt className="text-xs text-slate-500">Added</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{formatTimestampDate(product.createdAt)}</dd></div>
        </dl>
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{product.description || "No description added."}</p></div>
      </section>
    </div>

    <section className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-labelledby="product-orders-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700"><div><h2 id="product-orders-title" className="text-base font-bold text-slate-900 dark:text-white">Orders and buyers</h2><p className="mt-0.5 text-xs text-slate-500">Amounts use the product price saved on each order. Paid revenue excludes cancelled and refunded orders.</p></div><span className="text-xs font-semibold text-slate-500">{summary.cancelledOrders} cancelled · {summary.refundedOrders} refunded</span></div>
      {orders.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No orders contain this product yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-[#031549] text-white"><tr><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Ordered</th><th className="px-4 py-3">Qty / variant</th><th className="px-4 py-3">Product total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Details</th></tr></thead><tbody>{orders.map((order) => <tr key={order._id} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><td className="px-4 py-3"><strong className="block text-slate-900 dark:text-white">{order.parent?.fullName || "Buyer unavailable"}</strong>{order.parent?.email && <a href={`mailto:${order.parent.email}`} className="mt-0.5 block text-[#0047FF] hover:underline">{order.parent.email}</a>}{order.parent?.phone && <span className="block text-slate-500">{order.parent.phone}</span>}</td><td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatTimestampDate(order.createdAt)}</td><td className="px-4 py-3"><strong>{order.quantity}</strong>{order.variants.map((variant, index) => <span key={index} className="block text-slate-500">{[variant.size, variant.color].filter(Boolean).join(" / ") || "Standard"}{order.variants.length > 1 ? ` ×${variant.quantity}` : ""}</span>)}</td><td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{money(order.lineTotalMinor)}</td><td className="px-4 py-3"><Status value={order.paymentStatus} /></td><td className="px-4 py-3"><Status value={order.orderStatus} /></td><td className="px-4 py-3"><Link to={`/orders/${order._id}`} className="inline-flex items-center gap-1 font-semibold text-[#0047FF] hover:underline">{order.invoice?.invoiceNumber || `#${order._id.slice(-8)}`} <ExternalLink size={12} /></Link></td></tr>)}</tbody></table></div>}
      {pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs dark:border-slate-700"><span className="text-slate-500">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total} orders</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Previous</button><span className="font-semibold">{page} / {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Next</button></div></div>}
    </section>
  </>;
}
