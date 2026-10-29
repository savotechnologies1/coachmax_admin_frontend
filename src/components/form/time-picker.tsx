import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Clock } from "lucide-react";

type TimePickerProps = {
  id?: string;
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  ariaLabel?: string;
  required?: boolean;
  error?: string;
  errorId?: string;
};

export default function TimePicker({
  id = "time-picker-" + Math.random().toString(36).substr(2, 9),
  value,
  onChange,
  placeholder = "Select time",
  className = "",
  leftIcon,
  ariaLabel,
  required = false,
  error,
  errorId,
}: TimePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const fp = flatpickr(inputRef.current, {
      enableTime: true,
      noCalendar: true,
      allowInput: true,
      dateFormat: "h:i K",
      time_24hr: false,
      defaultDate: value,
      onChange: (_selectedDates, dateStr) => {
        if (onChange) {
          onChange(dateStr);
        }
      },
    });

    return () => {
      fp.destroy();
    };
  }, []); // Empty dependency array to prevent re-initialization on every render

  return (
    <div className="relative w-full">
      {leftIcon && (
        <span className="absolute text-gray-400 -translate-y-1/2 pointer-events-none left-3.5 top-1/2 dark:text-gray-500 z-10">
          {leftIcon}
        </span>
      )}
      <input
        ref={inputRef}
        id={id}
        aria-label={ariaLabel}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? (errorId || `${id}-error`) : undefined}
        placeholder={placeholder}
        className={`h-[46px] w-full rounded-none border appearance-none ${
          leftIcon ? "pl-10" : "px-4"
        } pr-10 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 bg-white text-gray-800 border-gray-200 dark:border-gray-700 ${className}`}
      />
      <span className="absolute text-gray-400 -translate-y-1/2 pointer-events-none right-3.5 top-1/2 dark:text-gray-500">
        <Clock className="size-5" />
      </span>
    </div>
  );
}
