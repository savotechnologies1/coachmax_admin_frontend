import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useProfile, useUpdateProfile } from "../../hooks/useAuth";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { UserRound } from "lucide-react";
import FormHeader from "../form/FormHeader";

interface UserInfoFormValues {
  firstName: string;
  lastName: string;
  email: string;
  // phone: string;  // Not supported by API
  // bio: string;    // Not supported by API
}

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: profileData, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const user = profileData?.data;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserInfoFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      // phone: "+09 363 398 46",  // Not supported by API
      // bio: "Team Manager",      // Not supported by API
    },
  });

  // Prefill form when data is loaded
  useEffect(() => {
    if (user) {
      const nameParts = user.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      setValue("firstName", firstName);
      setValue("lastName", lastName);
      setValue("email", user.email);
    }
  }, [user, setValue]);

  // Reset image state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setImageFile(null);
      setImageError(null);
    }
  }, [isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); } catch (reason) { setImageError(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "profile");
      if (validationError) {
        setImageError(validationError);
        e.target.value = "";
        return;
      }
      setImageError(null);
      setImageFile(normalized);
      setImagePreview(URL.createObjectURL(normalized));
    }
  };

  const onSubmit = (formData: UserInfoFormValues) => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    updateProfileMutation.mutate(
      {
        data: { name: fullName },  // email is readonly, not sent to API
        imageFile: imageFile ?? undefined,
      },
      {
        onSuccess: () => {
          closeModal();
        },
      }
    );
  };

  const nameParts = user?.name ? user.name.trim().split(/\s+/) : ["Super", "Admin"];
  const displayFirstName = nameParts[0] || "";
  const displayLastName = nameParts.slice(1).join(" ") || "";
  const displayEmail = user?.email || "admin@coachmax.com";
  const currentAvatar = getMediaUrl(user?.profileImage, getMediaFallback(user?.name || "Super Admin"));

  if (isLoading) {
    return (
      <div className="p-5 border border-gray-200 rounded-none dark:border-gray-800 lg:p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-none mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded-none"></div>
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded-none"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 border border-gray-200 rounded-none dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                First Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {displayFirstName}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Last Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {displayLastName}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {displayEmail}
              </p>
            </div>

            {/* Phone — not returned by API, commented out
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Phone
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                +09 363 398 46
              </p>
            </div> */}

            {/* Bio — not returned by API, commented out
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Bio
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Team Manager
              </p>
            </div> */}
          </div>
        </div>

        <button
          onClick={openModal}
          className="flex w-full items-center justify-center gap-2 rounded-none border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
        >
          <svg
            className="fill-current"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
              fill=""
            />
          </svg>
          Edit
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-none bg-white p-4 dark:bg-gray-900 lg:p-11">
          <FormHeader
            icon={UserRound}
            title="Edit Personal Information"
            description="Update your details to keep your profile up-to-date."
            className="mb-6 -mx-4 -mt-4 rounded-t-lg border-b border-[#082269] pr-14 lg:-mx-11 lg:-mt-11"
          />
          <form data-coachmax-form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            <div className="custom-scrollbar h-[420px] overflow-y-auto px-2 pb-3">
              {updateProfileMutation.isError && (
                <div className="mb-4 p-3 bg-error-500/10 border border-error-500/20 text-error-500 rounded-none text-sm">
                  {updateProfileMutation.error.message || "Failed to update profile."}
                </div>
              )}

              {/* Profile Image Upload */}
              <div className="mb-6">
                <h5 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
                  Profile Picture
                </h5>
                <div className="flex items-center gap-5">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 ring-2 ring-offset-2 ring-blue-500/0 group-hover:ring-blue-500/60 transition-all duration-200">
                      <img
                        src={imagePreview || currentAvatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="white" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 2L7.17157 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4H16.8284L15 2H9ZM12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18Z" fill="white" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-500 rounded-none hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    >
                      Change Photo
                    </button>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      JPEG, PNG, WebP, HEIC/HEIF · max 5MB
                    </p>
                    {imageError && <p className="mt-1 text-xs font-medium text-red-600">{imageError}</p>}
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="mt-1 text-xs text-red-500 hover:underline"
                      >
                        Remove new photo
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="mt-2">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="profile-first-name">First Name <span className="text-error-500">*</span></Label>
                    <Input
                      id="profile-first-name"
                      type="text"
                      error={!!errors.firstName}
                      hint={errors.firstName?.message}
                      {...register("firstName", { required: "First Name is required" })}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="profile-last-name">Last Name <span className="text-error-500">*</span></Label>
                    <Input
                      id="profile-last-name"
                      type="text"
                      error={!!errors.lastName}
                      hint={errors.lastName?.message}
                      {...register("lastName", { required: "Last Name is required" })}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="profile-email">
                      Email Address
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-normal text-gray-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C9.23858 2 7 4.23858 7 7V8H6C4.89543 8 4 8.89543 4 10V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V10C20 8.89543 19.1046 8 18 8H17V7C17 4.23858 14.7614 2 12 2ZM15 8V7C15 5.34315 13.6569 4 12 4C10.3431 4 9 5.34315 9 7V8H15ZM12 12C12.5523 12 13 12.4477 13 13V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V13C11 12.4477 11.4477 12 12 12Z" fill="currentColor" />
                        </svg>
                        Read only
                      </span>
                    </Label>
                    <Input
                      id="profile-email"
                      type="email"
                      readOnly
                      className="cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500"
                      {...register("email")}
                    />
                  </div>

                  {/* Phone — not supported by PATCH /auth/profile API
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input type="text" />
                  </div> */}

                  {/* Bio — not supported by PATCH /auth/profile API
                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Input type="text" />
                  </div> */}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button type="button" size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button type="submit" size="sm" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
