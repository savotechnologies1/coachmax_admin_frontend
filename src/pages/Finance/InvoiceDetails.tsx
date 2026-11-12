import { formatDateOnly, formatTimestampDate, formatDateTime } from "../../utils/dateTime";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { useInvoiceAuditLogs, useInvoiceDetails, useUpdateInvoice } from "../../hooks/useInvoices";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const formatDate = (value: string) => formatDateOnly(value) || "N/A";



export default function InvoiceDetails() {
  const { id } = useParams();
  const { data, isLoading, isError } = useInvoiceDetails(id || "");
  const { data: auditData } = useInvoiceAuditLogs(id || "");
  const updateInvoiceMutation = useUpdateInvoice();
  const { can } = useCoachAccess();
  const { markItemAsRead } = useSidebarBadges();
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustedTotal, setAdjustedTotal] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

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
  const invoiceTotal = Number(inv.totalAmount ?? inv.amount ?? 0);
  const adjustmentAmount = Number(inv.adminAdjustmentAmount || 0);
  const adjustmentHistory = (auditData?.data || []).filter((entry: any) => entry.action === "INVOICE_AMOUNT_ADJUSTED");
  const canAdjustAmount = can("invoices", "edit") && inv.status === "ACTIVE" && inv.paymentStatus !== "PAID" && inv.paymentStatus !== "PAYMENT_PENDING";

  const openAdjustmentForm = () => {
    setAdjustedTotal(invoiceTotal.toFixed(2));
    setAdjustmentReason("");
    setIsAdjusting(true);
  };

  const saveAmountAdjustment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    updateInvoiceMutation.mutate({
      id,
      payload: { totalAmount: Number(adjustedTotal), adjustmentReason: adjustmentReason.trim() },
    }, {
      onSuccess: () => setIsAdjusting(false),
    });
  };

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
                        inv.paymentMethod === "ADMIN_MANUAL" ? "Admin recorded receipt" :
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
              {adjustmentAmount !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Admin adjustment / discount</span>
                  <span className={`font-medium ${adjustmentAmount < 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {adjustmentAmount < 0 ? "-" : "+"}${Math.abs(adjustmentAmount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-100 dark:border-gray-700 pt-3">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-[#0047FF]">${invoiceTotal.toFixed(2)}</span>
              </div>
              {canAdjustAmount && !isAdjusting && (
                <button
                  type="button"
                  onClick={openAdjustmentForm}
                  className="mt-2 w-full border border-[#0047FF] px-4 py-2 text-sm font-semibold text-[#0047FF] hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  Edit invoice amount
                </button>
              )}
            </div>
          </div>

          {isAdjusting && (
            <form onSubmit={saveAmountAdjustment} className="mb-8 border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-950/10">
              <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Adjust invoice amount</h4>
              <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
                Current total: ${invoiceTotal.toFixed(2)}. The admin reason is saved to this invoice’s audit history.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  New total
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={adjustedTotal}
                    onChange={(event) => setAdjustedTotal(event.target.value)}
                    className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Admin note (required)
                  <textarea
                    required
                    minLength={8}
                    maxLength={500}
                    value={adjustmentReason}
                    onChange={(event) => setAdjustmentReason(event.target.value)}
                    placeholder="Joined halfway through the term — 50% discount"
                    rows={3}
                    className="mt-1 w-full resize-y border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAdjusting(false)} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateInvoiceMutation.isPending || !adjustmentReason.trim() || Number(adjustedTotal) === invoiceTotal}
                  className="bg-[#0047FF] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateInvoiceMutation.isPending ? "Saving…" : "Save amount and note"}
                </button>
              </div>
            </form>
          )}

          {/* Notes */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{inv.notes || inv.description || "No additional notes."}</p>
          </div>

          {adjustmentHistory.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Admin amount adjustment history</p>
              <div className="space-y-3">
                {adjustmentHistory.map((entry: any) => (
                  <div key={entry._id} className="border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${Number(entry.oldValue?.totalAmount || 0).toFixed(2)} → ${Number(entry.newValue?.totalAmount || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.user?.name || entry.actorName || entry.user?.email || "Admin"} · {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{entry.newValue?.reason || "No reason recorded."}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
