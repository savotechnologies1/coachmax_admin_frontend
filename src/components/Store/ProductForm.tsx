import React, { useState, useEffect, useRef } from "react";
import {
  Tag,
  Package,
  Image as ImageIcon,
  Info,
  LucideIcon
} from "lucide-react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import toast from "react-hot-toast";
import Select from "../form/Select";
import MultiImageDropzone from "../form/form-elements/MultiImageDropzone";
import FormHeader from "../form/FormHeader";
import FormField from "../form/FormField";
import SuccessPopup from "../SuccessPopup";
import { getStoreCategories, createStoreProduct, updateStoreProduct } from "../../api/orderApi";
import CategoryModal from "./CategoryModal";
import { z } from "zod";
import { validateWithSchema } from "../../utils/formValidation";

const productValidationSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  category: z.string().min(1, "Please select a category."),
  price: z.string().trim().refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) > 0, "A valid price is required."),
  stock: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, "Stock must be a whole number of 0 or more."),
  sizes: z.array(z.string()).min(1, "At least one size is required."),
  colors: z.string().trim().min(1, "At least one color is required."),
});

interface ProductFormData {
  name: string;
  shortHighlight: string;
  price: string;
  category: string;
  description: string;
  sizes: string[];
  colors: string;
  stock: string;
  availabilityStatus: string;
  images?: string[];
  _id?: string;
}

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
    <Icon className="h-4 w-4 text-[#0047FF]" aria-hidden="true" />
    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
  </div>
);

interface FormCardProps {
  children: React.ReactNode;
  className?: string;
}

const FormCard: React.FC<FormCardProps> = ({ children, className = "" }) => (
  <section className={`min-w-0 ${className}`}>
    {children}
  </section>
);

const sizeOptions = [
  { value: "XS", text: "Extra Small" },
  { value: "S", text: "Small" },
  { value: "M", text: "Medium" },
  { value: "L", text: "Large" },
  { value: "XL", text: "Extra Large" },
  { value: "XXL", text: "Double Extra Large" },
  { value: "One Size", text: "One Size Fits All" }
];

interface SizeInputProps {
  value: string[];
  onChange: (selected: string[]) => void;
  id: string;
  error?: string;
}

const SizeInput: React.FC<SizeInputProps> = ({ value, onChange, id, error }) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (size: string) => {
    if (!value.includes(size)) {
      onChange([...value, size]);
    }
    setInputValue("");
    setIsOpen(false);
  };

  const handleRemove = (sizeToRemove: string) => {
    onChange(value.filter((size) => size !== sizeToRemove));
  };

  const handleAddCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  };

  const filteredOptions = sizeOptions.filter(
    (opt) =>
      opt.text.toLowerCase().includes(inputValue.toLowerCase()) ||
      opt.value.toLowerCase().includes(inputValue.toLowerCase())
  ).filter((opt) => !value.includes(opt.value));

  const showCustomOption =
    inputValue.trim().length > 0 &&
    !sizeOptions.some((opt) => opt.value.toLowerCase() === inputValue.trim().toLowerCase()) &&
    !value.some((size) => size.toLowerCase() === inputValue.trim().toLowerCase());

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <div className="flex flex-wrap gap-2">
        {value.map((size) => {
          const label = sizeOptions.find((opt) => opt.value === size)?.text || size;
          return (
            <div
              key={size}
              className="group flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 py-1 pl-2.5 pr-2 text-sm text-gray-800 dark:text-white/90"
            >
              <span className="flex-initial max-w-full text-xs font-semibold">{label} ({size})</span>
              <button
                type="button"
                onClick={() => handleRemove(size)}
                className="pl-2 text-gray-500 hover:text-red-500 transition-colors"
                aria-label={`Remove ${label}`}
              >
                <svg className="fill-current" width="12" height="12" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <input
          type="text"
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-options`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-label="Search sizes or type a custom size"
          placeholder="Search sizes or type custom size..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onKeyDownCapture={(event) => {
            if (event.key === "ArrowDown" && isOpen) {
              event.preventDefault();
              requestAnimationFrame(() => dropdownRef.current?.querySelector<HTMLButtonElement>("[role='option']")?.focus());
            }
          }}
          className="h-11 w-full rounded-none border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-white dark:bg-gray-900 text-gray-850 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 transition-all"
        />
        <button
          type="button"
          aria-label={isOpen ? "Close sizes" : "Open sizes"}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div id={`${id}-options`} role="listbox" aria-label="Available sizes" className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {showCustomOption && (
            <button
              type="button"
              role="option"
              aria-selected="false"
              onClick={handleAddCustom}
              className="px-4 py-2.5 text-sm font-bold text-brand-500 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 cursor-pointer border-b border-gray-100 dark:border-gray-800 flex justify-between items-center transition-colors group"
            >
              <span>Add custom size: "{inputValue.trim()}"</span>
              <span className="text-[10px] bg-brand-50 text-brand-500 group-hover:bg-white/20 group-hover:text-white px-2 py-0.5 rounded transition-colors">Enter</span>
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 cursor-pointer flex justify-between items-center transition-colors group"
              >
                <span>{opt.text}</span>
                <span className="text-xs text-gray-400 group-hover:text-white/80 font-bold transition-colors">{opt.value}</span>
              </button>
            ))
          ) : (
            !showCustomOption && (
              <div className="px-4 py-3 text-xs text-gray-500 text-center">
                No matching standard sizes. Type to add a custom size.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

interface ProductFormProps {
  initialData?: ProductFormData | null;
  isEdit?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData = null, isEdit = false }) => {
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ value: string, label: string }[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    shortHighlight: "",
    price: "",
    category: "",
    description: "",
    sizes: [],
    colors: "",
    stock: "0",
    availabilityStatus: "IN_STOCK"
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (data: ProductFormData) => {
    return validateWithSchema(productValidationSchema, data).errors;
  };

  const isFormValid = Object.keys(validate(formData)).length === 0;

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...(initialData as typeof formData) }));
      if (initialData.images) {
        setExistingImages(initialData.images);
      }
    }
  }, [initialData]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await getStoreCategories();
      const data = response.data || response;
      const formatted = data.map((item: any) => ({
        value: item.uuid || item.id || item._id,
        label: item.name
      }));
      setCategories(formatted);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to fetch categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      setFormErrors(validate(updated));
      return updated;
    });
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setFormErrors(validate(formData));
  };

  const handleSizesChange = (selectedSizes: string[]) => {
    setFormData(prev => {
      const updated = { ...prev, sizes: selectedSizes };
      setFormErrors(validate(updated));
      return updated;
    });
    setTouched(prev => ({ ...prev, sizes: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(formData);
    setFormErrors(errors);
    // Touch all validated fields
    setTouched({ name: true, category: true, price: true, sizes: true, colors: true });
    if (Object.keys(errors).length > 0) {
      const firstInvalidField = Object.keys(errors)[0];
      document.getElementById(`product-${firstInvalidField}`)?.focus();
      return;
    }

    const payload = new FormData();
    setIsSubmitting(true);
    payload.append("name", formData.name.trim());
    payload.append("shortHighlight", formData.shortHighlight);
    payload.append("description", formData.description);
    payload.append("category", formData.category);
    payload.append("price", formData.price);
    payload.append("stock", formData.stock);
    payload.append("availabilityStatus", formData.availabilityStatus);

    payload.append("sizes", JSON.stringify(formData.sizes));

    if (formData.colors) {
      const colorsArray = formData.colors.split(",").map(c => c.trim()).filter(Boolean);
      payload.append("colors", JSON.stringify(colorsArray));
    }

    if (images.length > 0) {
      images.forEach(file => {
        payload.append("images", file);
      });
    }

    if (isEdit) {
      payload.append("existingImages", JSON.stringify(existingImages));
      existingImages.forEach(img => {
        payload.append("existingImages[]", img);
      });
    }

    try {
      if (isEdit) {
        const productId = formData._id || initialData?._id;
        if (!productId) {
          toast.error("Product ID is missing for update.");
          return;
        }
        await updateStoreProduct(productId, payload);
        toast.success("Merchandise updated successfully!");
        setShowSuccessPopup(true);
      } else {
        await createStoreProduct(payload);
        toast.success("Merchandise added successfully!");
        setShowSuccessPopup(true);
      }
    } catch (error: any) {
      console.error("Failed to save product:", error);
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save product.";
      toast.error(backendMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <form data-coachmax-form noValidate onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-gray-900">
        <FormHeader
          icon={Package}
          title={isEdit ? "Edit Merchandise Product" : "Add New Product"}
          description={isEdit ? "Update product details, images, and stock." : "Create and manage store merchandise and training kits."}
          className="border-b border-[#082269]"
        />
        <div className="grid grid-cols-1 gap-7 p-5 sm:p-6 lg:grid-cols-12">

        {/* Left Column: Basic Details & Pricing */}
        <div className="space-y-7 lg:col-span-7">
          <FormCard>
            <SectionHeader icon={Tag} title="Core Product Identity" />
            <div className="space-y-5">
              <FormField id="product-name" label="Product Name" required error={touched.name ? formErrors.name : undefined}>
                <Input
                  id="product-name"
                  placeholder="e.g., CM Training Kit - Personalized"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur("name")}
                  aria-required="true"
                  aria-invalid={Boolean(touched.name && formErrors.name)}
                  aria-describedby={touched.name && formErrors.name ? "product-name-error" : undefined}
                />
              </FormField>
              <div>
                  <Label htmlFor="product-highlight">Short Highlight (Subtitle) <span className="text-xs font-normal text-gray-500">(optional)</span></Label>
                <Input
                    id="product-highlight"
                  placeholder="e.g., Jersey + Shorts + Sock Sleeve"
                  name="shortHighlight"
                  value={formData.shortHighlight}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <FormField id="product-price" label="Price (AUD)" required error={touched.price ? formErrors.price : undefined}>
                  <div className="relative">
                    <Input
                      id="product-price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="90.00"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur("price")}
                      aria-required="true"
                      aria-invalid={Boolean(touched.price && formErrors.price)}
                      aria-describedby={touched.price && formErrors.price ? "product-price-error" : undefined}
                    />
                    <span className="absolute right-3 top-3.5 text-[10px] font-bold text-gray-400">AUD</span>
                  </div>
                </FormField>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <Label htmlFor="product-category">Category <span className="text-error-600">*</span></Label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[10px] font-bold text-brand-500 hover:underline"
                    >
                      Manage Categories
                    </button>
                  </div>
                  <Select
                    id="product-category"
                    aria-label="Product category"
                    aria-required
                    aria-invalid={Boolean(touched.category && formErrors.category)}
                    aria-describedby={touched.category && formErrors.category ? "product-category-error" : undefined}
                    options={categories}
                    value={formData.category}
                    onChange={(val: string) => {
                      setFormData(prev => {
                        const updated = { ...prev, category: val };
                        setFormErrors(validate(updated));
                        return updated;
                      });
                      setTouched(prev => ({ ...prev, category: true }));
                    }}
                  />
                  {touched.category && formErrors.category && (
                    <p id="product-category-error" role="alert" className="text-xs text-error-600 font-semibold mt-1">{formErrors.category}</p>
                  )}
                </div>
              </div>
            </div>
          </FormCard>

          <FormCard>
            <SectionHeader icon={Info} title="Extended Description" />
            <FormField id="product-description" label="Description" hint="Optional">
            <textarea
              id="product-description"
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-none p-5 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-400"
              placeholder="Detailed product specifics, material info, or sizing guide..."
              rows={8}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            ></textarea>
            </FormField>
          </FormCard>
        </div>

        {/* Right Column: Inventory & Media */}
        <div className="space-y-7 lg:col-span-5">
          <FormCard>
            <SectionHeader icon={Package} title="Inventory & Stock" />
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-sizes">Available Sizes <span className="text-error-600">*</span></Label>
                  <SizeInput
                    id="product-sizes"
                    value={formData.sizes}
                    onChange={handleSizesChange}
                    error={touched.sizes ? formErrors.sizes : undefined}
                  />
                  {touched.sizes && formErrors.sizes && (
                    <p id="product-sizes-error" role="alert" className="text-xs text-error-600 font-semibold mt-1">{formErrors.sizes}</p>
                  )}
                </div>
                <FormField id="product-colors" label="Colors" required error={touched.colors ? formErrors.colors : undefined}>
                  <Input
                    id="product-colors"
                    placeholder="e.g., Red, Blue"
                    name="colors"
                    value={formData.colors}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("colors")}
                    aria-required="true"
                    aria-invalid={Boolean(touched.colors && formErrors.colors)}
                    aria-describedby={touched.colors && formErrors.colors ? "product-colors-error" : undefined}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField id="product-stock" label="Starting Stock" error={touched.stock ? formErrors.stock : undefined}>
                  <Input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="50"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("stock")}
                    aria-invalid={Boolean(touched.stock && formErrors.stock)}
                    aria-describedby={touched.stock && formErrors.stock ? "product-stock-error" : undefined}
                  />
                </FormField>
                <div>
                  <Label htmlFor="product-availability">Availability Status</Label>
                  <Select
                    id="product-availability"
                    aria-label="Availability status"
                    options={[
                      { value: "IN_STOCK", label: "In Stock" },
                      { value: "OUT_OF_STOCK", label: "Out of Stock" },
                      { value: "PRE_ORDER", label: "Pre-order" }
                    ]}
                    value={formData.availabilityStatus}
                    onChange={(val: string) => setFormData(prev => ({ ...prev, availabilityStatus: val }))}
                  />
                </div>
              </div>
            </div>
          </FormCard>

          <FormCard>
            <SectionHeader icon={ImageIcon} title="Product Visuals" />
            <div className="space-y-4">
              <div className="bg-brand-50 dark:bg-brand-900/20 p-3 border border-brand-100 dark:border-brand-800 text-xs">
                <p className="font-bold text-brand-800 dark:text-brand-300 mb-1">
                  Recommended for CoachMax / Sports Products
                </p>
                <p className="text-brand-700 dark:text-brand-400 font-medium">Optional · 1:1 square · 1200 × 1200 px crop · JPEG, PNG, WebP, HEIC/HEIF · max 5MB per image</p>
              </div>
              <MultiImageDropzone
                maxFiles={5}
                policy="storeProduct"
                initialImages={existingImages}
                onRemoveInitial={(url) => setExistingImages(prev => prev.filter(img => img !== url))}
                onUpload={(files: File[]) => setImages(files)}
              />
            </div>
          </FormCard>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg py-4 font-bold shadow-2xl shadow-brand-500/30 active:scale-95 transition-all text-base disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : isEdit ? "Update Merchandise" : "Publish to Store"}
            </Button>
            {!isFormValid && (
              <p className="text-xs text-center text-slate-500 font-medium" aria-live="polite">
                Fill in all required fields to enable publishing.
              </p>
            )}
          </div>
        </div>
        </div>
      </form>

      {showSuccessPopup && (
        <SuccessPopup
          message={`Fantastic! The ${formData.name || "item"} has been ${isEdit ? "updated" : "added"} to the CoachMax merchandise catalog.`}
          onClose={() => setShowSuccessPopup(false)}
        />
      )}

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesUpdated={fetchCategories}
      />
    </div>
  );
};

export default ProductForm;
