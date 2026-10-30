import React, { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { getAllCoaches, createCoach, updateCoach, deleteCoach, changeCoachPassword, toggleCoachActive } from "../../api/adminApi";
import { toast } from "react-hot-toast";
import { User, Mail, Phone, Lock, ShieldCheck } from "../../icons/lucide-icons";
import { Eye, EyeOff, Pencil, ShieldCheck as ShieldCheckIcon, X } from "lucide-react";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import FormHeader from "../form/FormHeader";
import { requiredText, validateWithSchema } from "../../utils/formValidation";
import { z } from "zod";
import Pagination from "../common/Pagination";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const coachContactSchema = z.object({
  fullName: requiredText("Full name"),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().refine((value) => value.replace(/\D/g, "").length >= 7, "Enter a valid phone number."),
});
const coachPasswordSchema = z.string()
  .min(8, "Use at least 8 characters with uppercase, lowercase, and a special character.")
  .regex(/[A-Z]/, "Use at least 8 characters with uppercase, lowercase, and a special character.")
  .regex(/[a-z]/, "Use at least 8 characters with uppercase, lowercase, and a special character.")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Use at least 8 characters with uppercase, lowercase, and a special character.");
const coachCreateSchema = coachContactSchema.extend({
  password: coachPasswordSchema,
  confirmPassword: requiredText("Password confirmation"),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});
const coachUpdatePasswordSchema = z.object({
  password: coachPasswordSchema,
  confirmPassword: requiredText("Password confirmation"),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

const CoachManagement: React.FC = () => {
  const { can } = useCoachAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [coachFormErrors, setCoachFormErrors] = useState<Record<string, string>>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const clearCoachFormError = (field: string, isValid: boolean) => {
    if (!isValid) return;
    setCoachFormErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const getDataArray = (res: any) => {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  };

  const { data: coachesData, isLoading: loading } = useQuery({
    queryKey: ["coaches", page, limit],
    queryFn: () => getAllCoaches({ page, limit }),
  });
  const coaches = getDataArray(coachesData);
  const totalCoaches = coachesData?.pagination?.total ?? coaches.length;
  const totalPages = Math.max(1, coachesData?.pagination?.totalPages || 1);

  const createMutation = useMutation({
    mutationFn: createCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach created");
      setIsModalOpen(false);
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCoach(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach information updated successfully");
      setIsModalOpen(false);
      setIsModalOpen(false);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => changeCoachPassword(id, data),
    onSuccess: () => {
      toast.success("Coach password updated successfully");
      setIsModalOpen(false);
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach deleted");
      setDeleteModalId(null);
      setDeleteModalId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleCoachActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach access updated successfully");
    },
    onError: () => {
      toast.error("Failed to update coach access");
    }
  });

  const handleOpenAdd = () => {
    setFormData({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setCoachFormErrors({});
    setIsEditing(false);
    setSelectedCoachId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coach: any) => {
    setFormData({
      fullName: coach.fullName || coach.name || "",
      email: coach.email || "",
      phone: coach.phone || coach.mobile || "",
      password: "",
      confirmPassword: "",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setProfileImageFile(null);
    setProfileImagePreview(getMediaUrl(coach.profileImage, getMediaFallback(coach.fullName || coach.name || "Coach")));
    setCoachFormErrors({});
    setIsEditing(true);
    setSelectedCoachId(coach._id);
    setIsModalOpen(true);
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let normalized: File;
    try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
    const validationError = await validateUploadFile(normalized, "profile");
    if (validationError) {
      toast.error(validationError);
      e.target.value = "";
      return;
    }
    setProfileImageFile(normalized);
    setProfileImagePreview(URL.createObjectURL(normalized));
  };



  const confirmDelete = () => {
    if (deleteModalId) {
      deleteMutation.mutate(deleteModalId);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const symbols = "!@#$%^&*";
    const random = (str: string) => str[Math.floor(Math.random() * str.length)];
    const p = random(caps) + random(chars) + random(symbols) + Math.random().toString(36).slice(-5);
    setFormData({ ...formData, password: p, confirmPassword: p });
    clearCoachFormError("password", true);
    clearCoachFormError("confirmPassword", true);
  };

  const handleToggleAccess = (coach: any) => {
    const nextActive = coach.isActive === false ? true : false;
    toggleMutation.mutate({
      id: coach._id,
      isActive: nextActive,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWithSchema(coachCreateSchema, formData);
    setCoachFormErrors(validation.errors);
    if (!validation.success) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    if (profileImageFile) {
      const payload = new FormData();
      payload.append("name", formData.fullName);
      payload.append("fullName", formData.fullName);
      payload.append("email", formData.email);
      payload.append("phone", formData.phone);
      payload.append("mobile", formData.phone);
      payload.append("password", formData.password);
      payload.append("profileImage", profileImageFile);
      createMutation.mutate(payload);
      return;
    }

    createMutation.mutate({
      name: formData.fullName,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      mobile: formData.phone,
      password: formData.password,
    });
  };

  const handleUpdateInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId) return;

    const validation = validateWithSchema(coachContactSchema, formData);
    setCoachFormErrors(validation.errors);
    if (!validation.success) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    if (profileImageFile) {
      const payload = new FormData();
      payload.append("name", formData.fullName);
      payload.append("fullName", formData.fullName);
      payload.append("email", formData.email);
      payload.append("phone", formData.phone);
      payload.append("mobile", formData.phone);
      payload.append("profileImage", profileImageFile);
      updateMutation.mutate({ id: selectedCoachId, data: payload });
      return;
    }

    updateMutation.mutate({
      id: selectedCoachId,
      data: {
        name: formData.fullName,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        mobile: formData.phone,
      },
    });
  };

  const handleUpdatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId) return;

    const validation = validateWithSchema(coachUpdatePasswordSchema, formData);
    setCoachFormErrors(validation.errors);
    if (!validation.success) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    changePasswordMutation.mutate({ id: selectedCoachId, data: { password: formData.password } });
  };

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-none border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Coaching Staff</h3>
          <p className="text-xs text-gray-500 font-medium">Manage certified academy coaches</p>
        </div>
        {can("coaches", "create") && <Button onClick={handleOpenAdd} size="sm">Add Coach</Button>}
      </div>

      <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
        <Table>
          <TableHeader className="sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableCell isHeader>Coach Detail</TableCell>
              <TableCell isHeader>Email</TableCell>
              <TableCell isHeader>Phone</TableCell>
              <TableCell isHeader>Access</TableCell>
              <TableCell isHeader className="text-center">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
                  <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Staff...</span>
                </div>
              </TableCell></TableRow>
            ) : coaches.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-gray-500 font-medium italic">No coaching staff records found.</TableCell></TableRow>
            ) : (
              coaches.map((coach: any) => (
                <TableRow key={coach._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={getMediaUrl(coach.profileImage, getMediaFallback(coach.fullName || coach.name || "Coach"))}
                        alt={coach.fullName || coach.name || "Coach"}
                        className="w-10 h-10 rounded-full object-cover border border-brand-100 shadow-sm"
                      />
                      <div className="flex flex-col">
                        <button type="button" onClick={() => navigate(`/coaches/${coach._id}`)} className="w-fit text-left font-bold text-sm text-gray-900 hover:text-brand-600 dark:text-white/90 tracking-tight">
                          {coach.fullName || coach.name || "N/A"}
                        </button>
                        <span className="text-[10px] font-bold text-brand-500 uppercase flex items-center gap-1"><ShieldCheck size={10} /> Certified Coach</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {coach.email ? (
                      <a
                        href={`mailto:${coach.email}`}
                        className="flex items-center gap-2 text-xs text-[#0047FF] hover:underline font-bold lowercase"
                      >
                        <Mail size={14} className="text-[#0047FF]" /> {coach.email}
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium lowercase">
                        <Mail size={14} className="text-gray-300" /> N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-gray-900 font-bold tracking-tight">
                      <Phone size={12} className="text-brand-500" /> {coach.phone || coach.mobile || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAccess(coach)}
                        disabled={toggleMutation.isPending || !can("coaches", "edit")}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
                          coach.isActive !== false ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            coach.isActive !== false ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${coach.isActive !== false ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                        {coach.isActive !== false ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => navigate(`/coaches/${coach._id}`)} title="View coach details" aria-label={`View ${coach.fullName || coach.name || "coach"} details`} className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"><Eye size={14} /></button>
                      {can("coaches", "edit") && <button onClick={() => handleOpenEdit(coach)} title="Modify" className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"><Pencil size={14} /></button>}
                      {/* <button onClick={() => handleDeleteClick(coach._id)} title="Remove" className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalCoaches}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
        limitOptions={[10, 20, 50, 100]}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className={`overflow-x-hidden rounded-xl p-6 shadow-2xl transition-all lg:p-8 ${isEditing ? "w-[95%] max-w-[1000px] bg-gray-50/50" : "max-w-[500px] bg-white"}`}>
        {isEditing ? (
          <div className="space-y-6">
            <FormHeader icon={ShieldCheckIcon} title="Modify Coach" description="Update staff details and access settings." className="-mx-6 -mt-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information Card */}
              <div className="bg-white rounded-none border border-gray-200 p-6 shadow-sm flex flex-col h-full">
                <h5 className="font-bold text-gray-800 mb-1">Coach Information</h5>
                <p className="text-xs text-gray-500 mb-6">Manage profile details and contact information.</p>
                <form data-coachmax-form noValidate onSubmit={handleUpdateInfoSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="coach-edit-full-name" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Full Name *</label>
                      <input
                        id="coach-edit-full-name"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => { const value = e.target.value; setFormData({ ...formData, fullName: value }); clearCoachFormError("fullName", Boolean(value.trim())); }}
                        className="w-full rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                        placeholder="John Coach"
                        aria-required="true"
                        aria-invalid={Boolean(coachFormErrors.fullName)}
                        aria-describedby={coachFormErrors.fullName ? "coach-edit-full-name-error" : undefined}
                      />
                      {coachFormErrors.fullName && <p id="coach-edit-full-name-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.fullName}</p>}
                    </div>
                    <div>
                      <label htmlFor="coach-edit-email" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Email Identity *</label>
                      <input
                        id="coach-edit-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => { const value = e.target.value; setFormData({ ...formData, email: value }); clearCoachFormError("email", /^\S+@\S+\.\S+$/.test(value.trim())); }}
                        className="w-full rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                        placeholder="coach@academy.com"
                        aria-required="true"
                        aria-invalid={Boolean(coachFormErrors.email)}
                        aria-describedby={coachFormErrors.email ? "coach-edit-email-error" : undefined}
                      />
                      {coachFormErrors.email && <p id="coach-edit-email-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="coach-edit-phone" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Mobile Access *</label>
                      <input
                        id="coach-edit-phone"
                        type="text"
                        value={formData.phone}
                        onChange={(e) => { const value = e.target.value; setFormData({ ...formData, phone: value }); clearCoachFormError("phone", value.replace(/\D/g, "").length >= 7); }}
                        className="w-full rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                        placeholder="+61 000 000 000"
                        aria-required="true"
                        aria-invalid={Boolean(coachFormErrors.phone)}
                        aria-describedby={coachFormErrors.phone ? "coach-edit-phone-error" : undefined}
                      />
                      {coachFormErrors.phone && <p id="coach-edit-phone-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.phone}</p>}
                    </div>
                    <div className="flex items-center gap-3 rounded-none border border-gray-200 bg-gray-50 p-3">
                      <button type="button" onClick={() => profileImageInputRef.current?.click()} className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-brand-200 bg-white">
                        <img src={profileImagePreview || getMediaFallback(formData.fullName || "Coach")} alt="Coach preview" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(formData.fullName || "Coach"); }} />
                      </button>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">Coach Image</label>
                        <button type="button" onClick={() => profileImageInputRef.current?.click()} className="mt-1 text-xs font-bold text-brand-500 hover:underline">Choose image</button>
                        <p className="mt-1 text-[10px] text-gray-500">JPEG, PNG, WebP, HEIC/HEIF · max 5MB</p>
                        <input ref={profileImageInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleProfileImageChange} className="hidden" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-6 border-t border-gray-100 flex justify-end">
                    <Button type="submit" disabled={updateMutation.isPending} className="px-6 h-11 rounded-none text-sm font-medium">
                      {updateMutation.isPending ? "Updating..." : "Update Information"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Security & Password Card */}
              <div className="bg-white rounded-none border border-gray-200 p-6 shadow-sm flex flex-col h-full">
                <h5 className="font-bold text-gray-800 mb-1">Security & Password</h5>
                <p className="text-xs text-gray-500 mb-6">Update coach login credentials securely.</p>
                <form id="coach-edit-password-form" data-coachmax-form noValidate onSubmit={handleUpdatePasswordSubmit}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="coach-edit-password" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">New Password *</label>
                        <button type="button" onClick={generatePassword} className="text-[10px] font-bold text-brand-500 hover:text-brand-600 transition-colors uppercase tracking-widest">
                          Suggest Password
                        </button>
                      </div>
                      <div className="relative">
                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="coach-edit-password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => { const value = e.target.value; setFormData({ ...formData, password: value }); clearCoachFormError("password", value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[!@#$%^&*(),.?":{}|<>]/.test(value)); }}
                          className="w-full rounded-none border border-gray-200 bg-gray-50 pl-10 pr-10 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                          placeholder="••••••••"
                          aria-required="true"
                          aria-invalid={Boolean(coachFormErrors.password)}
                          aria-describedby={coachFormErrors.password ? "coach-edit-password-error" : "coach-edit-password-help"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {coachFormErrors.password && <p id="coach-edit-password-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.password}</p>}
                      <p id="coach-edit-password-help" className="mt-1 text-xs text-gray-500">Use at least 8 characters with uppercase, lowercase, and a special character.</p>
                    </div>
                    <div>
                      <label htmlFor="coach-edit-confirm-password" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Confirm Password *</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="coach-edit-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => { const value = e.target.value; setFormData({ ...formData, confirmPassword: value }); clearCoachFormError("confirmPassword", Boolean(value) && value === formData.password); }}
                          className="w-full rounded-none border border-gray-200 bg-gray-50 pl-10 pr-10 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                          placeholder="Confirm Password"
                          aria-required="true"
                          aria-invalid={Boolean(coachFormErrors.confirmPassword)}
                          aria-describedby={coachFormErrors.confirmPassword ? "coach-edit-confirm-password-error" : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {coachFormErrors.confirmPassword && <p id="coach-edit-confirm-password-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.confirmPassword}</p>}
                    </div>
                    <p className="text-[10px] text-yellow-600 mt-2 ml-1 font-medium italic">
                      Updating password will immediately replace the coach's existing password.
                    </p>
                  </div>
                  <div className="mt-auto pt-6 border-t border-gray-100 flex justify-end">
                    <Button type="submit" disabled={changePasswordMutation.isPending} className="px-6 h-11 rounded-none text-sm font-medium">
                      {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
            <FormHeader icon={ShieldCheckIcon} title="New Staff Registration" description="Coordinate the administrative credentials for academy staff." className="-mx-6 -mt-6 mb-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8" />
            <form id="coach-create-form" data-coachmax-form noValidate onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="coach-full-name" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Full Name *</label>
                  <input
                    id="coach-full-name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, fullName: value }); clearCoachFormError("fullName", Boolean(value.trim())); }}
                    className="w-full rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                    placeholder="John Coach"
                    aria-required="true"
                    aria-invalid={Boolean(coachFormErrors.fullName)}
                    aria-describedby={coachFormErrors.fullName ? "coach-full-name-error" : undefined}
                  />
                  {coachFormErrors.fullName && <p id="coach-full-name-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.fullName}</p>}
                </div>
                <div>
                  <label htmlFor="coach-email" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Email Identity *</label>
                  <input
                    id="coach-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, email: value }); clearCoachFormError("email", /^\S+@\S+\.\S+$/.test(value.trim())); }}
                    className="w-full rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                    placeholder="coach@academy.com"
                    aria-required="true"
                    aria-invalid={Boolean(coachFormErrors.email)}
                    aria-describedby={coachFormErrors.email ? "coach-email-error" : undefined}
                  />
                  {coachFormErrors.email && <p id="coach-email-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="coach-phone" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Mobile Access *</label>
                  <input
                    id="coach-phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, phone: value }); clearCoachFormError("phone", value.replace(/\D/g, "").length >= 7); }}
                    className="w-full rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                    placeholder="+61 000 000 000"
                    aria-required="true"
                    aria-invalid={Boolean(coachFormErrors.phone)}
                    aria-describedby={coachFormErrors.phone ? "coach-phone-error" : undefined}
                  />
                  {coachFormErrors.phone && <p id="coach-phone-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.phone}</p>}
                </div>
                <div className="flex items-center gap-3 rounded-none border border-gray-200 bg-gray-50 p-3">
                  <button type="button" onClick={() => profileImageInputRef.current?.click()} className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-brand-200 bg-white">
                    <img src={profileImagePreview || getMediaFallback(formData.fullName || "Coach")} alt="Coach preview" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(formData.fullName || "Coach"); }} />
                  </button>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">Coach Image <span className="normal-case font-normal">(optional)</span></label>
                    <button type="button" onClick={() => profileImageInputRef.current?.click()} className="mt-1 text-xs font-bold text-brand-500 hover:underline">Choose image</button>
                    <p className="mt-1 text-[10px] text-gray-500">Square image · 512 × 512 px recommended · JPEG, PNG, WebP, HEIC/HEIF · max 5MB</p>
                    <input ref={profileImageInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleProfileImageChange} className="hidden" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="coach-password" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">Secure Password *</label>
                    <button type="button" onClick={generatePassword} className="text-[10px] font-bold text-brand-500 hover:text-brand-600 transition-colors uppercase tracking-widest">
                      Suggest Password
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="coach-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => { const value = e.target.value; setFormData({ ...formData, password: value }); clearCoachFormError("password", value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[!@#$%^&*(),.?":{}|<>]/.test(value)); }}
                      className="w-full rounded-none border border-gray-200 bg-gray-50 pl-10 pr-10 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                      placeholder="Target Password"
                      aria-required="true"
                      aria-invalid={Boolean(coachFormErrors.password)}
                      aria-describedby={coachFormErrors.password ? "coach-password-error" : "coach-password-help"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {coachFormErrors.password && <p id="coach-password-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.password}</p>}
                  <p id="coach-password-help" className="mt-1 text-xs text-gray-500">Use at least 8 characters with uppercase, lowercase, and a special character.</p>
                </div>
                <div>
                  <label htmlFor="coach-confirm-password" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="coach-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => { const value = e.target.value; setFormData({ ...formData, confirmPassword: value }); clearCoachFormError("confirmPassword", Boolean(value) && value === formData.password); }}
                      className="w-full rounded-none border border-gray-200 bg-gray-50 pl-10 pr-10 py-3 text-sm font-medium focus:bg-white focus:border-brand-500 outline-none transition-all h-12"
                      placeholder="Confirm Password"
                      aria-required="true"
                      aria-invalid={Boolean(coachFormErrors.confirmPassword)}
                      aria-describedby={coachFormErrors.confirmPassword ? "coach-confirm-password-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {coachFormErrors.confirmPassword && <p id="coach-confirm-password-error" role="alert" className="mt-1 text-sm text-error-600">{coachFormErrors.confirmPassword}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-none h-11 px-6">Discard</Button>
                <Button type="submit" disabled={createMutation.isPending} className="px-8 h-11 rounded-none text-sm font-medium">
                  {createMutation.isPending ? "Saving..." : "Add Coach"}
                </Button>
              </div>
            </form>
          </>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        title="Delete Coach"
        message="Are you sure you want to delete this coach? This action cannot be undone."
      />
    </div>
  );
};

export default CoachManagement;
