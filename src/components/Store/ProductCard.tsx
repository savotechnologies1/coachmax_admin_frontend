import React, { useState } from "react";
import { Edit3, Trash2, ChevronLeft, ChevronRight, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useDeleteStoreProduct } from "../../hooks/useProducts";
import { toast } from "react-hot-toast";
import { getMediaUrl, MEDIA_PLACEHOLDER } from "../../utils/media";
import { useCoachAccess } from "../../hooks/useCoachAccess";

interface ProductCardProps {
  product: any;
  getCategoryName: (category: any) => string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, getCategoryName }) => {
  const { can } = useCoachAccess();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const deleteStoreMutation = useDeleteStoreProduct();

  const images = product.images && product.images.length > 0
    ? product.images
    : [MEDIA_PLACEHOLDER];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const getImageUrl = (imagePath: string) => {
    return getMediaUrl(imagePath);
  };

  const handleDeleteConfirm = () => {
    deleteStoreMutation.mutate(product._id, {
      onSuccess: () => {
        toast.success(`"${product.name}" deleted successfully.`);
        setShowDeleteModal(false);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || err.message || "Failed to delete product.");
        setShowDeleteModal(false);
      },
    });
  };

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        aria-label={`View details and sales for ${product.name}`}
        onClick={() => navigate(`/products/${product._id}`)}
        onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); navigate(`/products/${product._id}`); } }}
        className="group bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 relative flex flex-col h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >

        {/* Out of Stock Label */}
        {product.availabilityStatus === "OUT_OF_STOCK" && (
          <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg">
            Out of Stock
          </div>
        )}
        {product.availabilityStatus === "PRE_ORDER" && (
          <div className="absolute top-4 left-4 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg">
            Pre-order
          </div>
        )}

        {/* Status Toggle / Actions Overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          {can("store", "edit") && <Link to={`/edit-product/${product._id}`} onClick={(event) => event.stopPropagation()} className="p-2 bg-white text-gray-800 rounded-none shadow-xl hover:bg-brand-500 hover:text-white transition-all">
            <Edit3 size={16} />
          </Link>}
          {can("store", "delete") && <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="p-2 bg-white text-red-500 rounded-none shadow-xl hover:bg-red-500 hover:text-white transition-all"
            title="Delete product"
          >
            <Trash2 size={16} />
          </button>}
        </div>

        <div className="h-64 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
          <img
            src={getImageUrl(images[currentImageIndex])}
            onError={(event) => { if (!event.currentTarget.src.endsWith(MEDIA_PLACEHOLDER)) event.currentTarget.src = MEDIA_PLACEHOLDER; }}
            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            alt={product.name}
          />

          {/* Image Carousel Controls */}
          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handlePrevImage}
                className="p-1.5 bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white rounded-full hover:bg-white dark:hover:bg-black transition-colors shadow-md"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextImage}
                className="p-1.5 bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white rounded-full hover:bg-white dark:hover:bg-black transition-colors shadow-md"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Carousel Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {images.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? "w-4 bg-brand-500" : "w-1.5 bg-gray-300 dark:bg-gray-600"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-brand-500">{getCategoryName(product.category)}</span>
          </div>
          <h4 className="text-xl font-bold tracking-wide text-gray-900 dark:text-white mb-2 line-clamp-1 truncate">{product.name}</h4>
          {product.status === "INACTIVE" && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-none mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
              DELETED
            </span>
          )}
          <p className="text-gray-400 text-xs font-medium mb-4 line-clamp-2 min-h-[32px]">{product.shortHighlight || product.description}</p>

          <div className="flex items-center justify-between gap-3 pt-4 mt-auto border-t border-gray-50 dark:border-gray-800">
            <div>
              <span className="text-xs font-bold text-gray-400 block mb-0.5">Starting at</span>
              <span className="text-xl font-bold text-brand-600 block tracking-tighter">${product.price} AUD</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600">Details & sales <ArrowUpRight size={14} /></span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-none shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 mx-auto mb-5">
              <AlertTriangle size={28} className="text-red-500" />
            </div>

            {/* Text */}
            <h3 className="text-base font-bold text-center text-slate-800 dark:text-white mb-2 uppercase tracking-wider">
              Delete Product
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">"{product.name}"</span>?{" "}
              This action cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteStoreMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteStoreMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors rounded-none shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteStoreMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
