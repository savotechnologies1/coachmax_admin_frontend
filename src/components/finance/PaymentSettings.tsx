import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ComponentCard from "../common/ComponentCard";
import { getPaymentSettings, updatePaymentSettings } from "../../api/paymentApi";

interface SwitchProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: (checked: boolean) => void;
}

const CustomSwitch: React.FC<SwitchProps> = ({
  label,
  checked,
  disabled = false,
  loading = false,
  onChange,
}) => {
  const handleToggle = () => {
    if (disabled || loading) return;
    onChange(!checked);
  };

  const bgClass = checked ? "bg-brand-500" : "bg-gray-200 dark:bg-white/10";
  const knobClass = checked ? "translate-x-full" : "translate-x-0";

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
      <div className="flex items-center gap-3">
        <label
          className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
            disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700 dark:text-gray-400"
          }`}
          onClick={handleToggle}
        >
          <div className="relative">
            <div
              className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
                disabled ? "bg-gray-100 pointer-events-none dark:bg-gray-800" : bgClass
              }`}
            ></div>
            <div
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform bg-white ${knobClass}`}
            ></div>
          </div>
          <span className="font-semibold text-gray-800 dark:text-white/90">{label}</span>
        </label>
      </div>
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent" />
      )}
    </div>
  );
};

export default function PaymentSettings() {
  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [isCodEnabled, setIsCodEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOnline, setUpdatingOnline] = useState(false);
  const [updatingCod, setUpdatingCod] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getPaymentSettings();
        if (response && response.success && response.data) {
          setIsOnlineEnabled(response.data.isOnlineEnabled);
          setIsCodEnabled(response.data.isCodEnabled);
        }
      } catch (error) {
        console.error("Failed to fetch payment settings:", error);
        toast.error("Failed to load payment settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggleOnline = async (newValue: boolean) => {
    // Validation: Admin must not be able to disable both payment methods.
    if (!newValue && !isCodEnabled) {
      toast.error("At least one payment method is required.");
      return;
    }

    if (updatingOnline || updatingCod) return; // Prevent duplicate requests

    const previousState = isOnlineEnabled;
    setIsOnlineEnabled(newValue); // Optimistic UI update
    setUpdatingOnline(true);

    try {
      const response = await updatePaymentSettings({
        isOnlineEnabled: newValue,
        isCodEnabled: isCodEnabled,
      });
      if (response && response.success) {
        toast.success("Payment settings updated successfully.");
      } else {
        throw new Error("API responded with success: false");
      }
    } catch (error) {
      console.error("Failed to update online payment status:", error);
      setIsOnlineEnabled(previousState); // Revert on failure
      toast.error("Failed to update payment settings");
    } finally {
      setUpdatingOnline(false);
    }
  };

  const handleToggleCod = async (newValue: boolean) => {
    // Validation: Admin must not be able to disable both payment methods.
    if (!newValue && !isOnlineEnabled) {
      toast.error("At least one payment method is required.");
      return;
    }

    if (updatingOnline || updatingCod) return; // Prevent duplicate requests

    const previousState = isCodEnabled;
    setIsCodEnabled(newValue); // Optimistic UI update
    setUpdatingCod(true);

    try {
      const response = await updatePaymentSettings({
        isOnlineEnabled: isOnlineEnabled,
        isCodEnabled: newValue,
      });
      if (response && response.success) {
        toast.success("Payment settings updated successfully.");
      } else {
        throw new Error("API responded with success: false");
      }
    } catch (error) {
      console.error("Failed to update COD payment status:", error);
      setIsCodEnabled(previousState); // Revert on failure
      toast.error("Failed to update payment settings");
    } finally {
      setUpdatingCod(false);
    }
  };

  if (isLoading) {
    return (
      <ComponentCard title="Payment Settings">
        <div className="flex gap-4 items-center justify-center py-6 text-sm text-slate-500">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
          <span>Loading settings...</span>
        </div>
      </ComponentCard>
    );
  }

  const isAnyUpdating = updatingOnline || updatingCod;

  return (
    <ComponentCard title="Payment Settings" desc="Manage allowed payment methods for checkout.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CustomSwitch
          label="Online Payment"
          checked={isOnlineEnabled}
          loading={updatingOnline}
          disabled={isAnyUpdating}
          onChange={handleToggleOnline}
        />
        <CustomSwitch
          label="Cash on Delivery (COD)"
          checked={isCodEnabled}
          loading={updatingCod}
          disabled={isAnyUpdating}
          onChange={handleToggleCod}
        />
      </div>
    </ComponentCard>
  );
}
