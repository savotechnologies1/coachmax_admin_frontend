import type { ReactNode } from "react";

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}

/** Shared label, helper text, and inline validation treatment for every form control. */
export default function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className = "",
  labelClassName = "",
}: FormFieldProps) {
  return (
    <div className={`coachmax-field min-w-0 ${className}`}>
      <label htmlFor={id} className={`coachmax-field-label mb-1.5 block text-[13px] font-semibold text-gray-700 dark:text-gray-300 ${labelClassName}`}>
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-error-600">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="coachmax-field-error mt-1.5 text-xs font-medium leading-5 text-error-600 dark:text-error-400">{error}</p>}
    </div>
  );
}
