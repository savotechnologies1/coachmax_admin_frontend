import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface FormHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  titleId?: string;
}

/** Shared branded title bar for create and edit forms across the admin app. */
export default function FormHeader({ icon: Icon, title, description, actions, className = "", titleId }: FormHeaderProps) {
  return (
    <header className={`coachmax-form-header flex items-center gap-3 bg-[#031549] px-5 py-4 text-white ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-base font-bold tracking-tight text-white sm:text-lg">{title}</h2>
        {description && <p className="mt-0.5 text-xs font-medium text-blue-100/80">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
