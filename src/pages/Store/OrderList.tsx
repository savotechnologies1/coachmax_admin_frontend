import { formatTimestampDate } from "../../utils/dateTime";
import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import {
  Search,
  Filter,
  Eye,
  ShoppingBag,
  Clock,
  MapPin,
  Truck,
  MoreVertical
} from "lucide-react";
import { Link } from "react-router";
import { getOrders } from "../../api/orderApi";
import toast from "react-hot-toast";

const OrderList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit] = useState(5);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getOrders({ search: searchTerm, page, limit, status: statusFilter });
      if (res.success) {
        setOrders(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalOrders(res.pagination?.total || 0);
      } else {
        toast.error("Failed to fetch orders.");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("An error occurred while fetching orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [page, limit, searchTerm, statusFilter]);

  const getStatusStyle = (status: any) => {
    switch (status?.toUpperCase()) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-400";
      case "ACCEPTED": return "bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400";
      case "SHIPPED":
      case "DELIVERED": return "bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400";
      case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const formatId = (id: string) => {
    return id ? id.slice(-6).toUpperCase() : "";
  };

  return (
    <>
      <PageMeta
        title="CoachMax | Store Orders"
        description="Monitor and manage all merchandise orders and pickups."
      />
      <div className="space-y-6">
        <PageBreadcrumb
          pageTitle="Customer Orders"
          items={[{ name: "Store", path: "/products" }]}
        />

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "New Orders", value: totalOrders.toString(), icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
            { label: "Pending", value: "-", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
            { label: "Pickup Ready", value: "-", icon: MapPin, color: "text-green-500", bg: "bg-green-50 dark:bg-green-500/10" },
            { label: "Total Revenue", value: "-", icon: Truck, color: "text-brand-500", bg: "bg-brand-50 dark:bg-brand-500/10" }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-none border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-none ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 ">{stat.label}</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative group w-full sm:w-80">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                placeholder="Search Order ID or Name..."
                className="pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-none text-sm font-medium border border-transparent focus:border-brand-500 outline-none w-full transition-all"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-none text-xs font-bold text-gray-500 border border-transparent focus:border-brand-500 outline-none transition-all"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-none text-xs font-bold  text-gray-500 hover:text-brand-500 transition-colors">
                <Filter size={16} /> Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 ">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 ">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 ">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 ">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 ">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 ">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold  text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order) => {
                    const orderType = order.shippingAddress ? "Delivery" : "Pickup";
                    return (
                      <tr key={order._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold text-brand-500 ">#{formatId(order._id)}</span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{order.parent?.fullName || "Unknown"}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            {orderType === "Pickup" ? <MapPin size={14} className="text-gray-400" /> : <Truck size={14} className="text-gray-400" />}
                            <span className="text-xs font-bold text-gray-500">{orderType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold capitalize ${getStatusStyle(order.status)} underline decoration-2 underline-offset-4`}>
                            {order.status?.toLowerCase() || "unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold text-gray-900 dark:text-white ">${order.totalAmount} AUD</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-medium text-gray-400">
                            {formatTimestampDate(order.createdAt)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/order-details/${order._id}`}
                              className="p-2 bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-none hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                            >
                              <Eye size={16} />
                            </Link>
                            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400 font-bold text-sm">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-gray-50/30 dark:bg-gray-800/30 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400  ">
              Showing {orders.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalOrders)} of {totalOrders} orders
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-500 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-brand-500 rounded-none text-[10px] font-bold text-white shadow-xl shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderList;
