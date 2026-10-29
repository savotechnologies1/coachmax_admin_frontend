import React from "react";
import { Link } from "react-router";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  path?: string;
}

export interface PageBreadcrumbProps {
  pageTitle: string;
  subtitle?: string;
  items?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  pageTitle,
  subtitle,
  items,
  children,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {pageTitle}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {subtitle}
          </p>
        )}
        <nav aria-label="Breadcrumb" className="mt-1.5">
          <ol className="flex items-center gap-1.5 text-xs font-medium">
            <li>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0047FF] dark:hover:text-[#0047FF] transition-colors"
              >
                <Home size={13} className="text-[#0047FF] shrink-0" />
                <span>Home</span>
              </Link>
            </li>

            {items &&
              items.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <ChevronRight size={12} className="text-slate-400 dark:text-slate-600 shrink-0" />
                  {item.path ? (
                    <Link
                      to={item.path}
                      className="text-slate-500 dark:text-slate-400 hover:text-[#0047FF] dark:hover:text-[#0047FF] transition-colors"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.name}
                    </span>
                  )}
                </li>
              ))}

            <li className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-slate-400 dark:text-slate-600 shrink-0" />
              <span className="font-bold text-[#0047FF] dark:text-blue-400">
                {pageTitle}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageBreadcrumb;
