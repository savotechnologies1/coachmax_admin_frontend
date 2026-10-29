import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeIcon, EyeCloseIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import {
  useForgotPassword,
  useResendOtp,
  useVerifyOtp,
  useResetPassword,
} from "../../hooks/useAuth";

type Step = "SEND_OTP" | "VERIFY_OTP" | "RESET_PASSWORD";

export default function ForgotPasswordForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("SEND_OTP");
  const [email, setEmail] = useState("");
  const [role] = useState(() => new URLSearchParams(window.location.search).get("role") === "PARENT" ? "PARENT" : "ADMIN");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [timer, setTimer] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: forgotPassword, isPending: isSending } = useForgotPassword();
  const { mutate: resendOtp, isPending: isResending } = useResendOtp();
  const { mutate: verifyOtp, isPending: isVerifying } = useVerifyOtp();
  const { mutate: resetPassword, isPending: isResetting } = useResetPassword();

  // Countdown timer logic for OTP resend
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    forgotPassword(
      { email, role },
      {
        onSuccess: (res) => {
          setSuccessMessage(res.message || "OTP sent successfully to your email.");
          const returnedId = res.userId || res.parent_id || "";
          setUserId(returnedId);
          setTimer(60);
          setStep("VERIFY_OTP");
        },
        onError: (err) => setErrorMessage((err as any)?.response?.data?.message || err.message || "User not found"),
      }
    );
  };

  const handleResendOtp = () => {
    clearMessages();
    resendOtp(
      { email, role },
      {
        onSuccess: (res) => {
          setSuccessMessage(res.message || "OTP resent successfully.");
          setTimer(60);
        },
        onError: (err) => setErrorMessage((err as any)?.response?.data?.message || err.message || "User not found"),
      }
    );
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    verifyOtp(
      { userId, role, otp },
      {
        onSuccess: (res) => {
          setSuccessMessage(res.message || "OTP verified successfully. You may now reset your password.");
          setResetToken(res.resetToken || "");
          setStep("RESET_PASSWORD");
        },
        onError: (err) => setErrorMessage((err as any)?.response?.data?.message || err.message || "User not found"),
      }
    );
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    resetPassword(
      { userId, role, newPassword, resetToken },
      {
        onSuccess: (res) => {
          setSuccessMessage(res.message || "Password reset successful! Redirecting to login...");
          setTimeout(() => {
            navigate("/signin");
          }, 2000);
        },
        onError: (err) => setErrorMessage((err as any)?.response?.data?.message || err.message || "User not found"),
      }
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to Sign In
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-none shadow-sm p-8 sm:p-10 mb-10">
          <div className="flex justify-center mb-8">
            <img src="/images/logo/cm-logo2.png" alt="CoachMax Logo" className="h-12 object-contain" />
          </div>
          <div className="mb-5 sm:mb-8 text-center">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Forgot Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {step === "SEND_OTP" && "Enter your email to receive a verification OTP."}
              {step === "VERIFY_OTP" && "Enter the 6-digit OTP sent to your email."}
              {step === "RESET_PASSWORD" && "Enter your new secure password."}
            </p>
          </div>
          <div>
            {errorMessage && (
              <div className="mb-4 p-3 bg-error-500/10 border border-error-500/20 text-error-500 rounded-none text-sm">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-none text-sm">
                {successMessage}
              </div>
            )}

            {/* STEP 1: SEND OTP */}
            {step === "SEND_OTP" && (
              <form onSubmit={handleSendOtp}>
                <div className="space-y-6">

                  <div>
                    <Label>Email <span className="text-error-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="info@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Button type="submit" className="w-full" size="sm" disabled={isSending || !email}>
                      {isSending ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY OTP */}
            {step === "VERIFY_OTP" && (
              <form onSubmit={handleVerifyOtp}>
                <div className="space-y-6">
                  <div>
                    <Label>One Time Password (OTP) <span className="text-error-500">*</span></Label>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Button type="submit" className="w-full" size="sm" disabled={isVerifying || otp.length < 4}>
                      {isVerifying ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                  <div className="flex justify-center mt-4">
                    <button
                      type="button"
                      disabled={timer > 0 || isResending}
                      onClick={handleResendOtp}
                      className={`text-sm font-semibold ${timer > 0 ? "text-gray-400 cursor-not-allowed" : "text-brand-500 hover:text-brand-600"
                        }`}
                    >
                      {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: RESET PASSWORD */}
            {step === "RESET_PASSWORD" && (
              <form onSubmit={handleResetPassword}>
                <div className="space-y-6">
                  <div>
                    <Label>New Password <span className="text-error-500">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-[22px]"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Button type="submit" className="w-full" size="sm" disabled={isResetting || !newPassword}>
                      {isResetting ? "Resetting..." : "Set New Password"}
                    </Button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
