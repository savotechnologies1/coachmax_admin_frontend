import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useChangePassword } from "../../hooks/useAuth";
import toast from "react-hot-toast";

export default function ChangePasswordCard() {
  const [isEditing, setIsEditing] = useState(false);
  const changePasswordMutation = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    const payload = {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    };
    changePasswordMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Password changed successfully!");
        setIsEditing(false);
        reset();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || "Failed to change password");
      },
    });
  };

  if (!isEditing) {
    return (
      <div className="p-5 border border-gray-200 rounded-none dark:border-gray-800 lg:p-6 mt-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-2">
              Security
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your account password to stay secure.
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center gap-2 rounded-none border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            Change Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 border border-gray-200 rounded-none dark:border-gray-800 lg:p-6 mt-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Change Password
      </h4>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Old Password</Label>
          <Input
            type="password"
            {...register("oldPassword", { required: "Old password is required" })}
          />
          {errors.oldPassword && (
            <p className="text-sm text-rose-500 mt-1">{errors.oldPassword.message?.toString()}</p>
          )}
        </div>
        <div>
          <Label>New Password</Label>
          <Input
            type="password"
            {...register("newPassword", { required: "New password is required", minLength: { value: 8, message: "Use at least 8 characters" }, maxLength: { value: 128, message: "Use at most 128 characters" } })}
          />
          {errors.newPassword && (
            <p className="text-sm text-rose-500 mt-1">{errors.newPassword.message?.toString()}</p>
          )}
        </div>
        <div>
          <Label>Confirm Password</Label>
          <Input
            type="password"
            {...register("confirmPassword", { required: "Confirm password is required" })}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-rose-500 mt-1">{errors.confirmPassword.message?.toString()}</p>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              reset();
            }}
            type="button"
          >
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? "Saving..." : "Save Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
