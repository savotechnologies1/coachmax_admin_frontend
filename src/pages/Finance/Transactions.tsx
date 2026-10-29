import { formatTimestampDate } from "../../utils/dateTime";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import Pagination from "../../components/common/Pagination";
import { usePayments, useApprovePayment, useRejectPayment, useDashboardPayments } from "../../hooks/usePayments";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import toast from "react-hot-toast";
import { getMediaUrl } from "../../utils/media";
import { openMediaInNewTab } from "../../utils/privateMedia";

const formatDate = (value: string) => formatTimestampDate(value) || "N/A";

export default function Transactions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { markItemAsRead, isItemRead } = useSidebarBadges();

  const [rejectingTxnId, setRejectingTxnId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, isError } = usePayments(search, statusFilter, page, limit);
  const { data: dashboardData } = useDashboardPayments();

  const approvePaymentMutation = useApprovePayment();
  const rejectPaymentMutation = useRejectPayment();

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTxnId) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    rejectPaymentMutation.mutate(
      { id: rejectingTxnId, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setRejectingTxnId(null);
          setRejectReason("");
        }
      }
    );
  };

  const transactions: any[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.data?.transactions)
    ? data.data.transactions
    : Array.isArray(data?.transactions)
    ? data.transactions
    : Array.isArray(data)
    ? data
    : [];
  const total = data?.pagination?.total ?? data?.data?.pagination?.total ?? transactions.length;
  const totalPages = Math.max(1, data?.pagination?.pages ?? data?.data?.pagination?.pages ?? 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <PageMeta title="CoachMax | Transactions" description="Manage Transactions" />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Transactions" items={[{ name: "Finance", path: "/finance" }]} />

        {/* Dashboard Stats */}
        {dashboardData?.data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
              <p className="text-sm font-semibold text-slate-500 uppercase">Today's Collections</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-2">${dashboardData.data.todaysCollections || 0}</h3>
            </div>
            <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
              <p className="text-sm font-semibold text-slate-500 uppercase">Monthly Collections</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-2">${dashboardData.data.monthlyCollections || 0}</h3>
            </div>
            <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
              <p className="text-sm font-semibold text-slate-500 uppercase">Outstanding</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-2">${dashboardData.data.outstandingAmount || 0}</h3>
            </div>
            <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
              <p className="text-sm font-semibold text-slate-500 uppercase">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-brand-500 mt-2">{dashboardData.data.pendingPayments || 0}</h3>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-sm relative">
            <input
              type="text"
              placeholder="Search Transactions (e.g. TXN-123)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-none border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

      {/* Rejection Reason Modal */}
      <Modal isOpen={!!rejectingTxnId} onClose={() => setRejectingTxnId(null)} className="max-w-[400px] p-6 lg:p-8 rounded-none shadow-2xl">
        <h4 className="text-xl font-bold mb-2 tracking-tight">Reject Payment</h4>
        <p className="text-xs text-gray-500 mb-6 font-medium">Please provide a reason for rejecting this transaction.</p>
        <form onSubmit={handleRejectSubmit}>
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Rejection Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-none border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:border-brand-500 outline-none transition-all resize-none h-24"
              placeholder="e.g. Invalid transaction screenshot"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setRejectingTxnId(null)}>Cancel</Button>
            <Button type="submit" disabled={rejectPaymentMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white">
              {rejectPaymentMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </Modal>

        <div className="bg-white border border-slate-100 rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <table className="min-w-[950px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-[150px]">Transaction & Invoice</th>
                  <th className="py-3 px-3 min-w-[150px]">Parent/User</th>
                  <th className="py-3 px-3 min-w-[200px]">Payment Details</th>
                  <th className="py-3 px-3 min-w-[90px]">Date</th>
                  <th className="py-3 px-3 min-w-[100px]">Screenshot</th>
                  <th className="py-3 px-3 min-w-[90px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-red-500">Failed to load transactions.</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
                  </tr>
                ) : (
                  transactions.map((txn: any) => {
                    const isUnread =
                      !isItemRead("pendingPayments", txn._id) && txn.status === "PENDING";
                    return (
                      <tr
                        key={txn._id}
                        onClick={() => {
                          markItemAsRead("pendingPayments", txn._id);
                          if (txn.invoice?._id) {
                            markItemAsRead("unpaidInvoices", txn.invoice._id);
                            navigate(`/invoices/${txn.invoice._id}`);
                          }
                        }}
                        className={`border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer ${
                          isUnread ? "bg-blue-50/20 dark:bg-blue-950/10 font-bold" : ""
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span
                                className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                                title="Unread Payment Approval"
                              />
                            )}
                            <div className="font-semibold text-slate-500">
                              {txn.transactionId || (txn._id ? txn._id.substring(Math.max(0, txn._id.length - 8)) : "N/A")}
                            </div>
                          </div>
                          {txn.invoice?.invoiceNumber && (
                            <Link
                              to={`/invoices/${txn.invoice._id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                markItemAsRead("pendingPayments", txn._id);
                                markItemAsRead("unpaidInvoices", txn.invoice._id);
                              }}
                              className="text-xs font-bold text-[#0047FF] hover:underline block"
                            >
                              INV: {txn.invoice.invoiceNumber}
                            </Link>
                          )}
                        </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{txn.parent?.fullName || "N/A"}</div>
                        <div className="font-semibold text-slate-500">{txn.parent?.email}</div>
                        <div className="font-semibold text-slate-500">{txn.parent?.phone}</div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">${txn.amount || 0} <span className="font-semibold text-slate-500 text-xs">({txn.paymentMethod || "UNKNOWN"})</span></div>
                        {txn.remarks && <div className="text-xs text-slate-500 max-w-[200px] truncate" title={txn.remarks}>{txn.remarks}</div>}
                      </td>
                      <td className="py-4 px-3 font-semibold text-slate-500">{formatDate(txn.createdAt)}</td>
                      <td className="py-4 px-3">
                        {txn.paymentScreenshot ? (
                          <a
                            href={getMediaUrl(txn.paymentScreenshot)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markItemAsRead("pendingPayments", txn._id);
                              void openMediaInNewTab(txn.paymentScreenshot).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not open payment proof."));
                            }}
                            className="text-xs font-bold text-[#0047FF] hover:underline"
                          >
                            View Image
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${txn.status === "APPROVED" ? "text-emerald-600" : txn.status === "REJECTED" ? "text-rose-600" : "text-amber-500"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${txn.status === "APPROVED" ? "bg-emerald-600" : txn.status === "REJECTED" ? "bg-rose-600" : "bg-amber-500"
                              }`}
                          />
                          {txn.status || "PENDING"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {txn.status === "PENDING" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markItemAsRead("pendingPayments", txn._id);
                                approvePaymentMutation.mutate(txn._id);
                              }}
                              disabled={approvePaymentMutation.isPending || rejectPaymentMutation.isPending}
                              className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded disabled:opacity-50 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markItemAsRead("pendingPayments", txn._id);
                                setRejectingTxnId(txn._id);
                                setRejectReason("");
                              }}
                              disabled={approvePaymentMutation.isPending || rejectPaymentMutation.isPending}
                              className="px-3 py-1 text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 rounded disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }))}
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
