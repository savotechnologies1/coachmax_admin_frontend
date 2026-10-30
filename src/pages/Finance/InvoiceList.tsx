import { formatDateOnly } from "../../utils/dateTime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import Pagination from "../../components/common/Pagination";
import { useInvoices, useUpdateInvoice } from "../../hooks/useInvoices";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const formatDate = (value: string) => formatDateOnly(value) || "N/A";

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  PAID: { dot: "bg-emerald-500", text: "text-emerald-600" },
  UNPAID: { dot: "bg-amber-500", text: "text-amber-500" },
  OVERDUE: { dot: "bg-rose-500", text: "text-rose-600" },
};

export default function InvoiceList() {
  const { can } = useCoachAccess();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { markItemAsRead, isItemRead } = useSidebarBadges();

  const { data, isLoading, isError } = useInvoices(search, paymentStatus, page, limit);
  const updateInvoiceMutation = useUpdateInvoice();

  const invoices: any[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.data?.invoices)
      ? data.data.invoices
      : Array.isArray(data?.invoices)
        ? data.invoices
        : Array.isArray(data)
          ? data
          : [];
  const total = data?.pagination?.total ?? data?.data?.pagination?.total ?? invoices.length;
  const totalPages = Math.max(1, data?.pagination?.pages ?? data?.data?.pagination?.pages ?? 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>, invoiceId: string) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    updateInvoiceMutation.mutate({ id: invoiceId, payload: { paymentStatus: newStatus } });
  };

  return (
    <>
      <PageMeta title="CoachMax | Invoices" description="Manage Invoices" />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Invoices" items={[{ name: "Finance", path: "/finance" }]} />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-sm relative">
            <input
              type="text"
              placeholder="Search by Invoice # (e.g. INV-2026)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={paymentStatus}
              onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
              className="rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="ALL">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <table className="min-w-[700px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Parent/Player</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-4">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading invoices...</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-red-500">Failed to load invoices.</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No invoices found.</td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => {
                    const st = STATUS_STYLES[inv.paymentStatus] || STATUS_STYLES["UNPAID"];
                    const isPending = updateInvoiceMutation.isPending && (updateInvoiceMutation.variables as any)?.id === inv._id;
                    return (
                      <tr
                        key={inv._id}
                        onClick={() => {
                          markItemAsRead("unpaidInvoices", inv._id);
                          navigate(`/invoices/${inv._id}`);
                        }}
                        className={`border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-all ${
                          !isItemRead("unpaidInvoices", inv._id) && inv.paymentStatus !== "PAID"
                            ? "bg-blue-50/20 dark:bg-blue-950/10 font-bold"
                            : ""
                        }`}
                      >
                        <td className="py-4 px-4 font-semibold text-[#0047FF]">
                          <div className="flex items-center gap-2">
                            {!isItemRead("unpaidInvoices", inv._id) && inv.paymentStatus !== "PAID" && (
                              <span
                                className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                                title="Unread Invoice"
                              />
                            )}
                            <span>
                              {inv.invoiceNumber || (inv._id ? inv._id.substring(Math.max(0, inv._id.length - 8)) : "N/A")}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{inv.parent?.fullName || "N/A"}</div>
                          <div className="font-semibold text-slate-500">{inv.players?.map((p: any) => p.fullName).join(", ")}</div>
                        </td>
                        <td className="py-4 px-3 font-semibold text-slate-500">{inv.type}</td>
                        <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">${inv.totalAmount || inv.amount || 0}</td>
                        <td className="py-4 px-3 font-semibold text-slate-500">{formatDate(inv.dueDate)}</td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            <select
                              value={inv.paymentStatus || "UNPAID"}
                              onChange={(e) => handleStatusChange(e, inv._id)}
                              disabled={isPending || !can("invoices", "edit")}
                              className={`text-xs font-bold border rounded-none px-2 py-1 outline-none cursor-pointer transition-all disabled:opacity-50
                                ${st.text}
                                border-slate-200 dark:border-slate-700
                                bg-white dark:bg-slate-900
                                hover:border-[#0047FF] focus:border-[#0047FF]
                              `}
                            >
                              <option value="UNPAID">UNPAID</option>
                              <option value="PAID">PAID</option>
                              <option value="OVERDUE">OVERDUE</option>
                            </select>
                            {isPending && (
                              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#0047FF] rounded-full animate-spin" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
              limitOptions={[10, 20, 50, 100]}
            />
          )}
        </div>
      </div>
    </>
  );
}
