import { dateOnlyFormValue } from "../../utils/dateTime";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import apiClient from "../../api/apiClient";
import { addTemporaryPlayer, TemporaryPlayerPayload } from "../../api/coaches";
import { useCategories } from "../../hooks/useCategories";
import { useCurrentTerm, useCurrentDate } from "../../hooks/useCurrentTerm";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import DatePicker from "../form/date-picker";
import MultiSelect from "../form/MultiSelect";
import { Image as ImageIcon, X } from "lucide-react";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormActions from "../form/FormActions";

const temporaryPlayerSchema = z.object({
  name: z.string().trim().min(1, "Player name is required."),
  dob: z.string().min(1, "Date of birth is required."),
  parentName: z.string().trim().min(1, "Parent name is required."),
  parentEmail: z.string().trim().email("Enter a valid parent email address."),
  parentPhone: z.string().trim().min(7, "Enter a valid parent phone number.").max(20, "Phone number must be 20 characters or fewer.").regex(/^[+()\d\s.-]+$/, "Enter a valid parent phone number."),
  emergencyContact: z.string().trim().min(7, "Enter a valid emergency contact number.").max(20, "Contact number must be 20 characters or fewer.").regex(/^[+()\d\s.-]+$/, "Enter a valid emergency contact number."),
  isMedicalCondition: z.enum(["YES", "NO"]),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  classId: z.string().min(1, "Please select at least one class."),
  sessionDate: z.string().min(1, "Session date is required."),
  selectedCategory: z.string().min(1, "Please select a main category."),
  selectedProgram: z.string().min(1, "Please select a program."),
  selectedYear: z.string().min(1, "Please select a year."),
  preferredTerm: z.string().min(1, "Please select a term."),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).or(z.literal("")).refine((value) => value !== "", "Please select gender."),
  prefferedFoot: z.enum(["RIGHT", "LEFT", "BOTH"]).or(z.literal("")).refine((value) => value !== "", "Please select preferred foot."),
  preferredClasses: z.array(z.string()).min(1, "Please select at least one class."),
}).refine((value) => value.isMedicalCondition !== "YES" || Boolean(value.medicalConditions?.trim()), {
  path: ["medicalConditions"],
  message: "Please provide details.",
});

interface ClassItem {
  classId?: string;
  _id?: string;
  className?: string;
  name?: string;
  location: string;
  startTime: string;
  dayOfWeek: string;
}

export default function AddTempPlayerscomp() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const currentDate = useCurrentDate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof temporaryPlayerSchema>, unknown, z.output<typeof temporaryPlayerSchema>>({
    resolver: zodResolver(temporaryPlayerSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      dob: "",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      emergencyContact: "",
      isMedicalCondition: "NO",
      medicalConditions: "",
      allergies: "",
      classId: "",
      sessionDate: currentDate,
      selectedCategory: "",
      selectedProgram: "",
      selectedYear: "",
      preferredTerm: "",
      gender: "MALE",
      prefferedFoot: "",
      preferredClasses: [],
    },
  });

  const watchMedical = watch("isMedicalCondition");
  const watchDob = watch("dob");
  const watchSessionDate = watch("sessionDate");

  const watchCategory = watch("selectedCategory");
  const watchProgram = watch("selectedProgram");
  const watchTerm = watch("preferredTerm");
  const watchYear = watch("selectedYear");
  const watchPreferredClasses = watch("preferredClasses") || [];

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    let normalized: File;
    try {
      normalized = await normalizeUploadImage(file);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not convert this image.");
      input.value = "";
      return;
    }
    const validationError = await validateUploadFile(normalized, "profile");
    if (validationError) {
      toast.error(validationError);
      input.value = "";
      return;
    }

    setProfileImageFile(normalized);
    const reader = new FileReader();
    reader.onloadend = () => setProfileImagePreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(normalized);
  };

  const { categories, isLoading: loadingCategories } = useCategories({ isEvent: "all" });
  const { allTerms, availableYears: years, currentTerm, isLoading: loadingTerms } = useCurrentTerm();
  const { programs, isLoading: loadingPrograms } = useProgramsByCategory(watchCategory);

  // Set default preferred term and year if not selected
  useEffect(() => {
    if (currentTerm) {
      if (!watchTerm) setValue("preferredTerm", currentTerm._id);
      if (!watchYear && currentTerm.year) setValue("selectedYear", currentTerm.year.toString());
    }
  }, [currentTerm, watchTerm, watchYear, setValue]);

  useEffect(() => {
    const fetchFilteredClasses = async () => {
      if (!watchCategory || !watchProgram || !watchTerm) {
        setClasses([]);
        setValue("classId", "");
        return;
      }

      setLoadingClasses(true);
      try {
        const response = await apiClient.get("/api/user/classes", {
          params: {
            category: watchCategory,
            program: watchProgram,
            term: watchTerm,
          },
        });
        const classesList = response && response.data ? response.data : [];
        const parsedClasses = Array.isArray(classesList) 
          ? classesList 
          : (Array.isArray(classesList.data) ? classesList.data : []);
        
        setClasses(parsedClasses);
      } catch (error) {
        console.error("Failed to fetch filtered classes:", error);
        toast.error("Failed to load matching classes");
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchFilteredClasses();
  }, [watchCategory, watchProgram, watchTerm, setValue]);

  const handleCategoryChange = (_categoryId?: string) => {
    setValue("selectedProgram", "");
  };

  const handleYearChange = () => {
    setValue("preferredTerm", "");
  };

  const handleRemoveProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    if (profileImageInputRef.current) profileImageInputRef.current.value = "";
  };

  const handleClearForm = () => {
    handleRemoveProfileImage();
    reset({
      name: "",
      dob: "",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      emergencyContact: "",
      isMedicalCondition: "NO",
      medicalConditions: "",
      allergies: "",
      classId: "",
      sessionDate: currentDate,
      selectedCategory: "",
      selectedProgram: "",
      selectedYear: "",
      preferredTerm: "",
      gender: "",
      prefferedFoot: "",
      preferredClasses: [],
    });
  };

  const onSubmit = async (data: z.output<typeof temporaryPlayerSchema>) => {
    setSubmitting(true);
    try {
      const payload: TemporaryPlayerPayload = {
        name: data.name,
        dob: data.dob,
        parentName: data.parentName,
        parentEmail: data.parentEmail,
        parentPhone: data.parentPhone,
        emergencyContact: data.emergencyContact,
        isMedicalCondition: data.isMedicalCondition === "YES",
        medicalConditions: data.isMedicalCondition === "YES" ? data.medicalConditions : "",
        allergies: undefined,
        classId: data.classId,
        sessionDate: data.sessionDate,
        categories: data.selectedCategory ? [data.selectedCategory] : [],
        programs: data.selectedProgram ? [data.selectedProgram] : [],
        preferredTerm: data.preferredTerm || undefined,
        preferredClasses: data.preferredClasses || [],
        prefferedFoot: data.prefferedFoot || undefined,
        preferredFoot: data.prefferedFoot || undefined,
        gender: data.gender || undefined,
        profileImage: profileImageFile || undefined,
      };
      const result = await addTemporaryPlayer(payload);
      toast.success(result?.message || (result?.emailSent ? "Player added. Parent access email sent." : "Player added. No parent access email was sent."));
      handleClearForm();
    } catch (error: any) {
      console.error("Failed to add temporary player:", error);
      const msg = error?.response?.data?.message || "Failed to add player.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] p-6 sm:p-8 shadow-sm">
      <form data-coachmax-form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Player Details</h4>

            <div>
              <Label>Player Name <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder="e.g. Trial Player Name"
                error={!!errors.name}
                hint={errors.name?.message}
                {...register("name")}
              />
            </div>

            <div className="flex items-center gap-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
              <button
                type="button"
                onClick={() => profileImageInputRef.current?.click()}
                aria-label="Choose player profile image"
                className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center hover:border-brand-500 transition-colors"
              >
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Player profile preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <Label>Profile Image <span className="font-medium normal-case text-gray-400">(optional)</span></Label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => profileImageInputRef.current?.click()} className="text-xs font-bold text-brand-500 hover:underline">
                    {profileImagePreview ? "Change image" : "Choose image"}
                  </button>
                  {profileImagePreview && (
                    <button type="button" onClick={handleRemoveProfileImage} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600">
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-gray-500">JPEG, PNG, WebP, HEIC/HEIF · max 5MB</p>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input type="hidden" id="dob-value" {...register("dob")} />
                <DatePicker
                  id="temp-player-dob"
                  label="Date of Birth *"
                  required
                  error={errors.dob?.message}
                  defaultDate={watchDob || undefined}
                  placeholder="Select Date of Birth"
                  options={{ maxDate: "today" }}
                  onChange={([selectedDate]) => {
                    if (selectedDate) {
                      const localDateStr = dateOnlyFormValue(selectedDate);
                      setValue("dob", localDateStr);
                      trigger("dob");
                    }
                  }}
                />
                {errors.dob && (
                  <p id="temp-player-dob-error" role="alert" className="mt-1.5 text-xs font-medium text-error-600">{errors.dob.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender <span className="text-error-500">*</span></Label>
                  <select
                    className="h-11 w-full border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 transition-all cursor-pointer"
                    aria-invalid={Boolean(errors.gender)}
                    aria-describedby={errors.gender ? "temp-player-gender-error" : undefined}
                    {...register("gender")}
                  >
                    <option value="">Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.gender && (
                    <p id="temp-player-gender-error" role="alert" className="mt-1 text-xs font-medium text-error-600">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <Label>Foot <span className="text-error-500">*</span></Label>
                  <select
                    className="h-11 w-full border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 transition-all cursor-pointer"
                    aria-invalid={Boolean(errors.prefferedFoot)}
                    aria-describedby={errors.prefferedFoot ? "temp-player-foot-error" : undefined}
                    {...register("prefferedFoot")}
                  >
                    <option value="">Foot</option>
                    <option value="RIGHT">Right</option>
                    <option value="LEFT">Left</option>
                    <option value="BOTH">Both</option>
                  </select>
                  {errors.prefferedFoot && (
                    <p id="temp-player-foot-error" role="alert" className="mt-1 text-xs font-medium text-error-600">{errors.prefferedFoot.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Medical Conditions or Allergies</Label>
              <select {...register("isMedicalCondition")} className="h-11 w-full border border-gray-300 px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white">
                <option value="NO">NO</option><option value="YES">YES</option>
              </select>
            </div>
            {watchMedical === "YES" && <div>
              <Label>Please provide details</Label>
              <Input type="text" placeholder="Describe medical conditions and any allergies" error={!!errors.medicalConditions} hint={errors.medicalConditions?.message}
                {...register("medicalConditions")} />
            </div>}
          </div>

          {/* Parent/Contact details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Contact Details</h4>

            <div>
              <Label>Parent Full Name <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder="e.g. Parent Full Name"
                error={!!errors.parentName}
                hint={errors.parentName?.message}
                {...register("parentName")}
              />
            </div>

            <div>
              <Label>Parent Email <span className="text-error-500">*</span></Label>
              <Input
                type="email"
                placeholder="e.g. parent.trial@example.com"
                error={!!errors.parentEmail}
                hint={errors.parentEmail?.message}
                {...register("parentEmail")}
              />
            </div>

            <div>
              <Label>Parent Phone <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder="e.g. +61400000000"
                error={!!errors.parentPhone}
                hint={errors.parentPhone?.message}
                {...register("parentPhone")}
              />
              <p className="mt-1 text-xs text-gray-500">No email or phone OTP is required here. If an existing parent account is reused, its saved contact details stay unchanged.</p>
            </div>

            <div>
              <Label>Emergency Contact <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder="e.g. +61400000001"
                error={!!errors.emergencyContact}
                hint={errors.emergencyContact?.message}
                {...register("emergencyContact")}
              />
            </div>
          </div>
        </div>

        {/* Session / Class parameters */}
        <div className="border-t border-gray-100 dark:border-white/[0.05] pt-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Session Assignment</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Select Year <span className="text-error-500">*</span></Label>
              <select
                  className="h-11 w-full border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 transition-all cursor-pointer"
                disabled={loadingTerms}
                {...register("selectedYear", { onChange: () => handleYearChange() })}
              >
                <option value="">{loadingTerms ? "Loading years..." : "Select Year"}</option>
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              {errors.selectedYear && (
                <p className="mt-1 text-xs text-error-500 font-semibold">{errors.selectedYear.message}</p>
              )}
            </div>

            <div>
              <Label>Preferred Term <span className="text-error-500">*</span></Label>
              <select
                  className="h-11 w-full border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 transition-all cursor-pointer disabled:bg-gray-100 disabled:opacity-50 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed"
                disabled={!watchYear}
                {...register("preferredTerm")}
              >
                <option value="">{!watchYear ? "Select Year first" : "Select Term"}</option>
                {watchYear && allTerms
                  .filter((t: any) => t.year?.toString() === watchYear)
                  .map((term: any) => (
                    <option key={term._id} value={term._id}>
                      {term.name}
                    </option>
                  ))}
              </select>
              {errors.preferredTerm && (
                <p className="mt-1 text-xs text-error-500 font-semibold">{errors.preferredTerm.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Main Category <span className="text-error-500">*</span></Label>
              <select
                className="h-11 w-full border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 transition-all cursor-pointer"
                disabled={loadingCategories}
                {...register("selectedCategory", { onChange: (e) => handleCategoryChange(e.target.value) })}
              >
                <option value="">{loadingCategories ? "Loading categories..." : "Select Main Category"}</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.selectedCategory && (
                <p className="mt-1 text-xs text-error-500 font-semibold">{errors.selectedCategory.message}</p>
              )}
            </div>

            <div>
              <Label>Sub Category (Program) <span className="text-error-500">*</span></Label>
              <select
                className="h-11 w-full border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 transition-all cursor-pointer disabled:bg-gray-100 disabled:opacity-50 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed"
                disabled={!watchCategory || loadingPrograms}
                {...register("selectedProgram")}
              >
                <option value="">
                  {loadingPrograms
                    ? "Loading programs..."
                    : !watchCategory
                    ? "Select Main Category first"
                    : "Select Program"}
                </option>
                {watchCategory && programs.map((prog) => (
                  <option key={prog._id} value={prog._id}>
                    {prog.name}
                  </option>
                ))}
              </select>
              {errors.selectedProgram && (
                <p className="mt-1 text-xs text-error-500 font-semibold">{errors.selectedProgram.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Assign Class <span className="text-error-500">*</span></Label>
              <MultiSelect
                placeholder={
                  loadingClasses 
                    ? "Loading classes..." 
                    : (!watchCategory || !watchProgram || !watchTerm) 
                      ? "Select Category, Program & Term first" 
                      : "Select Target Classes"
                }
                disabled={loadingClasses || !watchCategory || !watchProgram || !watchTerm}
                options={classes.map((c) => {
                  const id = c.classId || c._id || "";
                  const name = c.className || c.name || "";
                  return {
                    value: id,
                    text: `${name} (${c.dayOfWeek} at ${c.startTime}) - ${c.location}`
                  };
                })}
                value={watchPreferredClasses}
                onChange={(selected) => {
                  setValue("preferredClasses", selected);
                  setValue("classId", selected[0] || "");
                  trigger(["preferredClasses", "classId"]);
                }}
              />
              {errors.preferredClasses && (
                <p className="mt-1 text-xs text-error-500 font-semibold">{errors.preferredClasses.message}</p>
              )}
            </div>

            <div>
              <input type="hidden" {...register("sessionDate")} />
              <DatePicker
                label="Session Date"
                defaultDate={watchSessionDate || currentDate}
                placeholder="Select Session Date"
                options={{ minDate: "today", position: "above", static: false }}
                onChange={([selectedDate]) => {
                  if (selectedDate) {
                    const localDateStr = dateOnlyFormValue(selectedDate);
                    setValue("sessionDate", localDateStr);
                    trigger("sessionDate");
                  }
                }}
              />
              {errors.sessionDate && (
                <p className="mt-1.5 text-xs text-error-500 font-semibold">{errors.sessionDate.message}</p>
              )}
            </div>
          </div>
        </div>

        <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-lg sm:-mx-8 sm:-mb-8">
          <Button variant="outline" type="button" onClick={handleClearForm}>
            Clear Form
          </Button>
          <Button type="submit" disabled={submitting} className="px-10 h-12 rounded-none text-xs font-bold uppercase tracking-widest">
            {submitting ? "Adding..." : "Add Player"}
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
