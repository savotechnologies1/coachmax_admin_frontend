// src/components/SponsorManagement/SponsorForm.tsx
import React, { useState, useEffect } from "react";
import {
 Image as ImageIcon,
 Link as LinkIcon,
 Tag,
 Type
} from "lucide-react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import toast from "react-hot-toast";
import DropzoneComponent from "../form/form-elements/DropZone";
import { LucideIcon } from "lucide-react";
import FormHeader from "../form/FormHeader";
import FormField from "../form/FormField";
import FormActions from "../form/FormActions";
import { createSponsor, updateSponsor, Sponsor } from "../../api/sponsorApi";
import { getMediaUrl } from "../../utils/media";
import { z } from "zod";
import { validateWithSchema } from "../../utils/formValidation";

const sponsorValidationSchema = (editing: boolean) => z.object({
 title: z.string().trim().min(1, "Banner title is required."),
 subtitle: z.string().trim().min(1, "Subtitle or offer is required."),
 link: z.string().trim().min(1, "Action link is required.").url("Enter a valid link starting with https:// or http://.").refine((value) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
 }, "Enter a valid link starting with https:// or http://."),
 bannerImg: z.custom<File | null>().superRefine((file, ctx) => {
  if (!editing && !file) ctx.addIssue({ code: "custom", message: "Upload a banner image to create this sponsor." });
 }),
});

interface SectionHeaderProps {
 icon: LucideIcon;
 title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <FormHeader icon={Icon} title={title} className="mb-6 -mx-6 -mt-6 rounded-t-lg border-b border-[#082269]" />
);

interface SponsorFormProps {
 onSuccess: () => void;
 editingSponsor?: Sponsor | null;
 onCancelEdit?: () => void;
}

const SponsorForm: React.FC<SponsorFormProps> = ({ onSuccess, editingSponsor, onCancelEdit }) => {
 const [loading, setLoading] = useState(false);
 const [resetKey, setResetKey] = useState(0);
 const [formErrors, setFormErrors] = useState<Record<string, string>>({});
 const [formData, setFormData] = useState({
  title: "",
  subtitle: "",
  link: "",
  bannerImg: null as File | null,
 });

 useEffect(() => {
  if (editingSponsor) {
   setFormData({
    title: editingSponsor.title,
    subtitle: editingSponsor.subtitle,
    link: editingSponsor.link,
    bannerImg: null,
   });
  } else {
   setFormData({
    title: "",
    subtitle: "",
    link: "",
    bannerImg: null,
   });
  }
  setFormErrors({});
 }, [editingSponsor]);

 const clearFieldError = (field: string) => {
  setFormErrors((previous) => {
   if (!previous[field]) return previous;
   const next = { ...previous };
   delete next[field];
   return next;
  });
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
  if (String(value).trim()) clearFieldError(name);
  if (name === "link" && /^https?:\/\//i.test(value.trim())) clearFieldError("link");
 };

 const handleFileChange = (files: File[]) => {
  if (files.length > 0) {
   setFormData((prev) => ({ ...prev, bannerImg: files[0] }));
   clearFieldError("bannerImg");
  }
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const errors = validateWithSchema(sponsorValidationSchema(Boolean(editingSponsor)), formData).errors;
  setFormErrors(errors);
  if (Object.keys(errors).length) return;

  setLoading(true);

  try {
   const data = new FormData();
   data.append("title", formData.title);
   data.append("subtitle", formData.subtitle);
   data.append("link", formData.link);
   if (formData.bannerImg) {
    data.append("bannerImg", formData.bannerImg);
   }

   if (editingSponsor) {
    await updateSponsor(editingSponsor._id, data);
    toast.success("Sponsor updated successfully!");
   } else {
    await createSponsor(data);
    toast.success("Sponsor created successfully!");
   }

   setFormData({ title: "", subtitle: "", link: "", bannerImg: null });
   setFormErrors({});
   setResetKey(prev => prev + 1);
   onSuccess();
  } catch (err) {
   console.error("Error saving sponsor:", err);
   toast.error("Failed to save sponsor. Please try again.");
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
   <form data-coachmax-form noValidate onSubmit={handleSubmit} className="space-y-6">
    <SectionHeader icon={editingSponsor ? Tag : ImageIcon} title={editingSponsor ? "Edit Sponsor Banner" : "Add New Sponsor Banner"} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <FormField id="sponsor-title" label="Banner Title" required error={formErrors.title} className="col-span-2 md:col-span-1">
      <div className="relative">
       <Input
        placeholder="e.g., Summer Sale"
        name="title"
        id="sponsor-title"
        value={formData.title}
        onChange={handleInputChange}
        aria-required="true"
        aria-invalid={Boolean(formErrors.title)}
        aria-describedby={formErrors.title ? "sponsor-title-error" : undefined}
       />
       <Type size={18} className="absolute right-3 top-3 text-gray-400" />
      </div>
     </FormField>

     <FormField id="sponsor-subtitle" label="Subtitle / Offer" required error={formErrors.subtitle} className="col-span-2 md:col-span-1">
      <div className="relative">
       <Input
        placeholder="e.g., 50% OFF"
        name="subtitle"
        id="sponsor-subtitle"
        value={formData.subtitle}
        onChange={handleInputChange}
        aria-required="true"
        aria-invalid={Boolean(formErrors.subtitle)}
        aria-describedby={formErrors.subtitle ? "sponsor-subtitle-error" : undefined}
       />
       <Tag size={18} className="absolute right-3 top-3 text-gray-400" />
      </div>
     </FormField>

     <FormField id="sponsor-link" label="Action Link / URL" required error={formErrors.link} className="col-span-2">
      <div className="relative">
       <Input
        placeholder="e.g., https://example.com"
        name="link"
        id="sponsor-link"
        value={formData.link}
        onChange={handleInputChange}
        aria-required="true"
        aria-invalid={Boolean(formErrors.link)}
        aria-describedby={formErrors.link ? "sponsor-link-error" : undefined}
       />
       <LinkIcon size={18} className="absolute right-3 top-3 text-gray-400" />
      </div>
     </FormField>

     <FormField id="sponsor-image" label={<>Banner Image {editingSponsor && <span className="font-normal text-gray-500">(Leave empty to keep current)</span>}</>} required={!editingSponsor} error={formErrors.bannerImg} className="col-span-2">
      <DropzoneComponent
        policy="sponsorBanner"
       key={resetKey} 
       onUpload={handleFileChange} 
       previewUrl={getMediaUrl(editingSponsor?.image) || undefined}
      />
     </FormField>
    </div>

    <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-lg">
     {editingSponsor && (
      <Button
       type="button"
       variant="outline"
       onClick={onCancelEdit}
       className="rounded-none px-8 font-bold text-gray-500"
      >
       Cancel
      </Button>
     )}
     <Button
      type="submit"
      disabled={loading}
      className="rounded-none px-12 font-bold  shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
     >
      {loading ? "Saving..." : editingSponsor ? "Update Sponsor" : "Create Sponsor"}
     </Button>
    </FormActions>
   </form>
  </div>
 );
};

export default SponsorForm;
