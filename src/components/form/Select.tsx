import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps {
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
  icon?: LucideIcon;
  iconSize?: number;
  triggerClassName?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  value,
  icon: Icon,
  iconSize = 14,
  triggerClassName,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}) => {
  const [internalValue, setInternalValue] = useState<string>(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((opt) => String(opt.value) === String(selectedValue));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const focusOption = (index: number) => {
    const optionCount = options.length;
    if (!optionCount) return;
    const normalizedIndex = (index + optionCount) % optionCount;
    optionRefs.current[normalizedIndex]?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Select Trigger */}
      <button
        type="button"
        ref={triggerRef}
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={ariaRequired}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !isOpen) {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => focusOption(Math.max(0, options.findIndex((option) => String(option.value) === String(selectedValue)))));
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        disabled={disabled}
        className={`coachmax-select-trigger ${triggerClassName || `h-11 w-full flex items-center justify-between appearance-none border px-4 py-2.5 text-sm shadow-theme-xs outline-hidden focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 transition-all ${disabled ? "opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" : "cursor-pointer group"}`}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={iconSize} className="text-gray-400 shrink-0 group-hover:text-brand-500 transition-colors" />}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-gray-400">{placeholder}</span>}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Select Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 min-w-full mt-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <ul className="py-1" role="listbox">
            {options.map((option, index) => (
              <li key={index}>
                <button
                  type="button"
                  ref={(node) => { optionRefs.current[index] = node; }}
                  role="option"
                  aria-selected={String(selectedValue) === String(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") { event.preventDefault(); focusOption(index + 1); }
                    else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (index === 0) triggerRef.current?.focus(); else focusOption(index - 1);
                    } else if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); }
                  }}
                  onClick={() => handleSelect(String(option.value))}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
                    ${
                      String(selectedValue) === String(option.value)
                        ? "bg-brand-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-4 py-3 text-xs text-center text-gray-400">
                No options
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Select;
