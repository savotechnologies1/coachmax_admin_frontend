import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Shared section heading and spacing for long forms. */
export default function FormSection({ title, description, icon: Icon, children, className = "", contentClassName = "" }: FormSectionProps) {
  return (
    <section className={`coachmax-form-section min-w-0 ${className}`} aria-label={title}>
      <div className="mb-4 flex items-start gap-2.5 border-b border-gray-200 pb-3 dark:border-gray-700">
        {Icon && <Icon aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />}
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-wide text-gray-900 dark:text-white">{title}</h3>
          {description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      <div className={`coachmax-form-section-content ${contentClassName}`}>{children}</div>
    </section>
  );
}
