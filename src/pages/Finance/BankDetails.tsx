import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { getBankDetails, updateBankDetails, BankDetailsData } from "../../api/financeApi";
import toast from "react-hot-toast";
import PaymentSettings from "../../components/finance/PaymentSettings";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { getMediaUrl } from "../../utils/media";
import { z } from "zod";
import FormField from "../../components/form/FormField";
import FormActions from "../../components/form/FormActions";
import FormSection from "../../components/form/FormSection";
import { validateWithSchema } from "../../utils/formValidation";

const bankDetailsSchema = z.object({
  accountName: z.string().trim().max(120, "Account name must be 120 characters or fewer."),
  accountNumber: z.string().trim().max(34, "Account number must be 34 characters or fewer."),
  bankName: z.string().trim().max(120, "Bank name must be 120 characters or fewer."),
  iban: z.string().trim().refine((value) => !value || /^[A-Za-z]{2}\d{2}[A-Za-z0-9 ]{11,30}$/.test(value), "Enter a valid IBAN."),
  swiftCode: z.string().trim().refine((value) => !value || /^[A-Za-z0-9]{8}(?:[A-Za-z0-9]{3})?$/.test(value), "SWIFT/BIC must be 8 or 11 letters and numbers."),
  branch: z.string().trim().max(120, "Branch must be 120 characters or fewer."),
  instructions: z.string().trim().max(1000, "Instructions must be 1000 characters or fewer."),
});


export default function BankDetails() {
  const [formData, setFormData] = useState<BankDetailsData>({
    accountName: "",
    accountNumber: "",
    bankName: "",
    iban: "",
    swiftCode: "",
    branch: "",
    instructions: "",
    isActive: true,
    qrCodeImage: null,
  });
  const [existingQrUrl, setExistingQrUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getBankDetails();
        if (data && data.data) {
          const bd = Array.isArray(data.data) ? data.data[0] : data.data;
          if (bd) {
            setFormData({
              accountName: bd.accountName || "",
              accountNumber: bd.accountNumber || "",
              bankName: bd.bankName || "",
              iban: bd.iban || "",
              swiftCode: bd.swiftCode || "",
              branch: bd.branch || "",
              instructions: bd.instructions || "",
              isActive: bd.isActive ?? true,
              qrCodeImage: null,
            });
            if (bd.qrCodeImage) {
              setExistingQrUrl(bd.qrCodeImage);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch bank details", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        let normalized: File;
        try { normalized = await normalizeUploadImage(files[0]); } catch (reason) { setFormErrors((previous) => ({ ...previous, qrCodeImage: reason instanceof Error ? reason.message : "Could not convert this image." })); return; }
        const validationError = await validateUploadFile(normalized, "qrCode");
        if (validationError) {
          setFormErrors((previous) => ({ ...previous, qrCodeImage: validationError }));
          (e.target as HTMLInputElement).value = "";
          return;
        }
        setFormData((prev) => ({ ...prev, qrCodeImage: normalized }));
        setFormErrors((previous) => { const next = { ...previous }; delete next.qrCodeImage; return next; });
      }
    } else {
      setFormData((prev) => {
        const updated = { ...prev, [name]: value };
        setFormErrors((previous) => {
          if (!(name in previous)) return previous;
          const nextErrors = validateWithSchema(bankDetailsSchema, updated).errors;
          if (nextErrors[name]) return { ...previous, [name]: nextErrors[name] };
          const next = { ...previous }; delete next[name]; return next;
        });
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWithSchema(bankDetailsSchema, formData);
    setFormErrors(validation.errors);
    if (!validation.success) {
      const firstField = Object.keys(validation.errors)[0].replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      document.getElementById(`bank-${firstField}`)?.focus();
      return;
    }
    setIsSubmitting(true);
    try {
      await updateBankDetails(formData);
      toast.success("Bank details updated successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update bank details");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-slate-500">Loading...</div>;
  }

  return (
    <>
      <PageMeta title="CoachMax | Bank Details" description="Manage Bank Details" />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Bank Details" items={[{ name: "Finance", path: "/finance" }]} />
        <PaymentSettings />
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <form data-coachmax-form noValidate onSubmit={handleSubmit} className="space-y-4">
            <FormSection title="Bank account information" contentClassName="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="bank-account-name" label="Account Name" error={formErrors.accountName}>
                <input id="bank-account-name" type="text" name="accountName" value={formData.accountName} onChange={handleChange} aria-invalid={Boolean(formErrors.accountName)} aria-describedby={formErrors.accountName ? "bank-account-name-error" : undefined} />
              </FormField>
              <FormField id="bank-account-number" label="Account Number" error={formErrors.accountNumber}>
                <input id="bank-account-number" type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} aria-invalid={Boolean(formErrors.accountNumber)} aria-describedby={formErrors.accountNumber ? "bank-account-number-error" : undefined} />
              </FormField>
              <FormField id="bank-bank-name" label="Bank Name" error={formErrors.bankName}>
                <input id="bank-bank-name" type="text" name="bankName" value={formData.bankName} onChange={handleChange} aria-invalid={Boolean(formErrors.bankName)} aria-describedby={formErrors.bankName ? "bank-bank-name-error" : undefined} />
              </FormField>
              <FormField id="bank-iban" label="IBAN" error={formErrors.iban}>
                <input id="bank-iban" type="text" name="iban" value={formData.iban} onChange={handleChange} aria-invalid={Boolean(formErrors.iban)} aria-describedby={formErrors.iban ? "bank-iban-error" : undefined} />
              </FormField>
              <FormField id="bank-swift-code" label="Swift Code" error={formErrors.swiftCode}>
                <input id="bank-swift-code" type="text" name="swiftCode" value={formData.swiftCode} onChange={handleChange} aria-invalid={Boolean(formErrors.swiftCode)} aria-describedby={formErrors.swiftCode ? "bank-swift-code-error" : undefined} />
              </FormField>
              <FormField id="bank-branch" label="Branch" error={formErrors.branch}>
                <input id="bank-branch" type="text" name="branch" value={formData.branch} onChange={handleChange} aria-invalid={Boolean(formErrors.branch)} aria-describedby={formErrors.branch ? "bank-branch-error" : undefined} />
              </FormField>
              <FormField id="bank-instructions" label="Instructions" error={formErrors.instructions} className="col-span-1 md:col-span-2">
                <textarea id="bank-instructions" name="instructions" value={formData.instructions} onChange={handleChange} rows={4} placeholder="Add payment instructions for parents and players…" aria-invalid={Boolean(formErrors.instructions)} aria-describedby={formErrors.instructions ? "bank-instructions-error" : undefined} />
              </FormField>
              <FormField id="bank-qr-code" label="QR Code Image" hint="JPEG, PNG, WebP, HEIC/HEIF · max 2MB" error={formErrors.qrCodeImage} className="col-span-1 md:col-span-2">
                <input id="bank-qr-code" type="file" name="qrCodeImage" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleChange} aria-invalid={Boolean(formErrors.qrCodeImage)} aria-describedby={formErrors.qrCodeImage ? "bank-qr-code-error" : "bank-qr-code-hint"} />
                {existingQrUrl && <img src={getMediaUrl(existingQrUrl)} alt="QR Code" className="mt-2 h-20 object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaUrl(); }} />}
              </FormField>
            </FormSection>
            <FormActions className="-mx-5 -mb-5 mt-5 rounded-b-lg">
              <button type="submit" disabled={isSubmitting} className="rounded-none bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none disabled:opacity-50">
                {isSubmitting ? "Saving..." : "Save Bank Details"}
              </button>
            </FormActions>
          </form>
        </div>
      </div>
    </>
  );
}
