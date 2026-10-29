import { formatDateOnly, formatTimestampDate, formatDateTime } from "../../utils/dateTime";
import { useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { useInvoiceDetails } from "../../hooks/useInvoices";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";

const formatDate = (value: string) => formatDateOnly(value) || "N/A";



export default function InvoiceDetails() {
  const { id } = useParams();
  const { data, isLoading, isError } = useInvoiceDetails(id || "");
  const { markItemAsRead } = useSidebarBadges();

  useEffect(() => {
    if (id) {
      markItemAsRead("unpaidInvoices", id);
    }
  }, [id, markItemAsRead]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading invoice details...</div>;
  }

  if (isError || !data?.data) {
    return <div className="p-8 text-center text-red-500">Failed to load invoice details.</div>;
  }

  const inv = data.data;

  return (
    <>
      <PageMeta title={`Invoice ${inv.invoiceNumber}`} description="Invoice details" />
      <div className="space-y-6">
        <PageBreadcrumb
          pageTitle={`Invoice ${inv.invoiceNumber || inv._id.substring(inv._id.length - 8)}`}
          items={[{ name: "Finance", path: "/finance" }, { name: "Invoices", path: "/invoices" }]}
        />

        <div className="bg-white dark:bg-gray-800 rounded-none border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 dark:border-gray-700 pb-8 mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">INVOICE</h1>
              <p className="text-sm font-medium text-gray-500">#{inv.invoiceNumber || inv._id}</p>
            </div>
            <div className="text-left md:text-right space-y-1">
              <p className="text-sm text-gray-500">Status</p>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${inv.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" :
                  inv.paymentStatus === "OVERDUE" ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                }`}>
                {inv.paymentStatus || "UNPAID"}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">Issued: {formatTimestampDate(inv.createdAt)}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Due Date: {formatDate(inv.dueDate)}</p>
              <p className="text-sm text-gray-500">Type: {inv.type}</p>
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bill To</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {inv.parent?.fullName || "N/A"}
                {inv.parent?.relationship && <span className="text-xs font-normal text-gray-500 ml-2">({inv.parent.relationship})</span>}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{inv.parent?.email}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{inv.parent?.phone}</p>
              {inv.parent?.emergencyContact && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2"><span className="font-medium text-gray-700 dark:text-gray-300">Emergency:</span> {inv.parent.emergencyContact}</p>
              )}
            </div>
            <div className="md:text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Players</p>
              <div className="space-y-2">
                {inv.players?.map((p: any) => (
                  <div key={p._id} className="text-sm font-medium text-gray-900 dark:text-white">
                    {p.fullName} {p.gender && <span className="text-xs text-gray-500 font-normal">({p.gender})</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Details (Only if Paid) */}
          {inv.paymentStatus === "PAID" && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-none mb-8">
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Payment Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Payment Method</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">
                    {inv.paymentMethod === "COD" ? "Cash on Delivery (COD)" :
                      inv.paymentMethod === "ONLINE" ? "Online Payment" :
                        inv.paymentMethod || "N/A"}
                  </span>
                </div>

                {inv.paymentMethod === "ONLINE" && (inv.transactionId || inv.transaction?.transactionId || inv.transaction?._id || inv.transactionRef || inv.paymentDetails) && (
                  <div>
                    <span className="text-gray-500 block">Transaction Reference</span>
                    <span className="font-semibold text-[#0047FF]">
                      {inv.transactionId ||
                        inv.transaction?.transactionId ||
                        inv.transaction?._id ||
                        inv.transactionRef ||
                        inv.paymentDetails}
                    </span>
                  </div>
                )}

                {inv.verifiedBy && (
                  <div>
                    <span className="text-gray-500 block">Verified By</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {inv.verifiedBy.name || inv.verifiedBy.email}
                    </span>
                  </div>
                )}

                {inv.verifiedAt && (
                  <div>
                    <span className="text-gray-500 block">Verified Date</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {formatDateTime(inv.verifiedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Item Title</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-r-lg">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {inv.items?.map((item: any) => (
                  <tr key={item._id || Math.random()}>
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{item.title}</td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{item.description}</td>
                    <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">${item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">${inv.subtotal || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-500">-${inv.discount || 0}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-100 dark:border-gray-700 pt-3">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-[#0047FF]">${inv.totalAmount || inv.amount || 0}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{inv.notes || inv.description || "No additional notes."}</p>
          </div>
        </div>
      </div>
    </>
  );
}