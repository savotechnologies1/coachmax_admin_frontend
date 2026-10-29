import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ProductForm from "../../components/Store/ProductForm";
import { useStoreProductDetails } from "../../hooks/useProducts";
import toast from "react-hot-toast";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";

export default function AddProductPage() {
  return (
    <>
      <PageMeta
        title="CoachMax | Add Merchandise"
        description="Launch and manage elite athletes via new tournaments and events."
      />
      <PageBreadcrumb pageTitle="Add Product" items={[{ name: "Store", path: "/products" }, { name: "Merchandise Catalog", path: "/products" }]} />
      <ProductForm />
    </>
  );
}

export function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: res, isLoading, isError } = useStoreProductDetails(id || "");

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load product details.");
      navigate("/products");
    }
  }, [isError, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const product = res?.data || res;
  if (!product) return null;

  const productData = {
    _id: product._id,
    name: product.name || "",
    shortHighlight: product.shortHighlight || "",
    price: product.price?.toString() || "",
    category: typeof product.category === 'object' && product.category !== null ? product.category._id : (product.category || ""),
    description: product.description || "",
    sizes: product.sizes || [],
    colors: Array.isArray(product.colors) ? product.colors.join(", ") : (product.colors || ""),
    stock: product.stock?.toString() || "",
    availabilityStatus: product.availabilityStatus || "IN_STOCK",
    images: product.images || []
  };

  return (
    <>
      <PageMeta
        title="CoachMax | Edit Merchandise"
        description="Launch and manage elite athletes via new tournaments and events."
      />
      <PageBreadcrumb pageTitle="Edit Product" items={[{ name: "Store", path: "/products" }, { name: "Merchandise Catalog", path: "/products" }]} />
      <ProductForm initialData={productData} isEdit={true} />
    </>
  );
}
