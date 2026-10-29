import type { ReactNode } from "react";
import { Check } from "lucide-react";

export interface FormStep {
  label: string;
  description?: string;
}

interface FormStepIndicatorProps {
  steps: FormStep[];
  currentStep: number;
  onStepSelect?: (step: number) => void;
  className?: string;
  trailing?: ReactNode;
}

/** Accessible progress indicator shared by multi-step forms. */
export default function FormStepIndicator({ steps, currentStep, onStepSelect, className = "", trailing }: FormStepIndicatorProps) {
  return (
    <nav aria-label="Form progress" className={`coachmax-step-indicator flex flex-wrap items-center gap-2 ${className}`}>
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const number = index + 1;
          const complete = number < currentStep;
          const active = number === currentStep;
          const Content = (
            <>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-brand-600 text-white" : complete ? "bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                {complete ? <Check size={14} aria-hidden="true" /> : number}
              </span>
              <span className="min-w-0 text-left">
                <span className={`block text-xs font-semibold ${active ? "text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-gray-300"}`}>{step.label}</span>
                {step.description && <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">{step.description}</span>}
              </span>
            </>
          );
          return (
            <li key={`${number}-${step.label}`} className="flex min-w-0 flex-1 items-center gap-2">
              {onStepSelect && number <= currentStep ? (
                <button type="button" aria-current={active ? "step" : undefined} aria-label={`Step ${number}: ${step.label}`} onClick={() => onStepSelect(number)} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-gray-800">
                  {Content}
                </button>
              ) : (
                <div aria-current={active ? "step" : undefined} className="flex min-w-0 items-center gap-2 px-2 py-1.5">{Content}</div>
              )}
              {index < steps.length - 1 && <span aria-hidden="true" className="hidden h-px min-w-3 flex-1 bg-gray-200 sm:block dark:bg-gray-700" />}
            </li>
          );
        })}
      </ol>
      {trailing}
    </nav>
  );
}
