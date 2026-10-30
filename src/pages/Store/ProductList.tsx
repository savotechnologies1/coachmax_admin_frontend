import { useState, useEffect } from "react";
import { getStoreCategories } from "../../api/orderApi";
import { useStoreProducts } from "../../hooks/useProducts";

import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { Link } from "react-router";
import { Plus, Search, ShoppingBag } from "lucide-react";
import ProductCard from "../../components/Store/ProductCard";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const ProductList = () => {
  const { can } = useCoachAccess();
  const [activeCategoryId, setActiveCategoryId] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const limit = 8;
  const [categories, setCategories] = useState<any[]>([{ _id: "All", name: "All" }]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catRes = await getStoreCategories();
        const cats = catRes.data || catRes || [];
        setCategories([{ _id: "All", name: "All" }, ...cats]);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const { data: prodRes, isLoading } = useStoreProducts({
    search: debouncedSearchQuery.trim() || undefined,
    category: activeCategoryId !== "All" ? activeCategoryId : undefined,
    status: status !== "ALL" ? status : undefined,
    availabilityStatus: availabilityStatus !== "ALL" ? availabilityStatus : undefined,
    page,
    limit,
  });

  let products = [];
  let pagination = null;
  if (prodRes) {
    if (Array.isArray(prodRes.data)) {
      products = prodRes.data;
    } else if (prodRes.data && Array.isArray(prodRes.data.products)) {
      products = prodRes.data.products;
    } else if (Array.isArray(prodRes.products)) {
      products = prodRes.products;
    } else if (Array.isArray(prodRes)) {
      products = prodRes;
    }
    pagination = prodRes.pagination || prodRes.data?.pagination || null;
  }

  const getCategoryName = (categoryId: string | any) => {
    // Sometimes API populates category, sometimes it's just an ID
    const id = typeof categoryId === 'object' && categoryId !== null ? categoryId._id : categoryId;
    const cat = categories.find(c => c._id === id);
    return cat ? cat.name : "Uncategorized";
  };



  return (
    <>
      <PageMeta
        title="CoachMax | Merchandise Management"
        description="Manage your elite coaching and academy products."
      />
      <PageBreadcrumb
        pageTitle="Merchandise Catalog"
        items={[{ name: "Store", path: "/products" }]}
      >
        {can("store", "create") && <Link
          to="/add-product"
          className="inline-flex items-center justify-center gap-2 bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-theme-xs transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          Add Product
        </Link>}
      </PageBreadcrumb>
      <div className="space-y-6">

        {/* Header Section */}

        {/* Filters & Tools */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-none border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => {
                  setActiveCategoryId(cat._id);
                  setPage(1);
                }}
                className={`px-6 py-2 rounded-none text-xs font-bold whitespace-nowrap transition-all ${activeCategoryId === cat._id
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-105"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] sm:flex-initial sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search product..."
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-none outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-none border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {/* Availability Filter */}
            <select
              value={availabilityStatus}
              onChange={(e) => {
                setAvailabilityStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-none border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="ALL">All Availability</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="PRE_ORDER">Pre-Order</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product: any) => (
              <ProductCard key={product._id} product={product} getCategoryName={getCategoryName} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag size={40} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-bold  text-gray-900 dark:text-white">Product Not Found</h3>
            <p className="text-gray-400 text-sm mt-2 max-w-sm">No merchandise in this category. Try adding a new training kit or academy product.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6 dark:border-gray-800 dark:bg-gray-900 rounded-none shadow-sm">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center rounded-none border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNextPage}
                className="relative ml-3 inline-flex items-center rounded-none border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to <span className="font-semibold">{Math.min(page * limit, pagination.total)}</span> of{' '}
                  <span className="font-semibold">{pagination.total}</span> entries
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-none shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center rounded-none px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-t border-b border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNextPage}
                    className="relative inline-flex items-center rounded-none px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductList;
