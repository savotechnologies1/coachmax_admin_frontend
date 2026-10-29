import type { ReactNode } from "react";

interface FormActionsProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

/** Consistent divider, alignment, and responsive wrapping for form actions. */
export default function FormActions({ children, className = "", sticky = false }: FormActionsProps) {
  return (
    <footer className={`coachmax-form-actions flex flex-col-reverse gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-end sm:px-6 ${sticky ? "sticky bottom-0 z-10" : ""} ${className}`}>
      {children}
    </footer>
  );
}
