import { forwardRef, useEffect, useImperativeHandle, useRef, type ChangeEvent, type InputHTMLAttributes } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { dateOnlyToLocalDate, toDateOnly } from "../../utils/dateTime";

/** Controlled replacement for native date inputs. Visible dates are DD/MM/YYYY;
 * existing form handlers still receive the canonical YYYY-MM-DD value. */
const DateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function DateInput({ value, onChange, min, max, disabled, required, className, ...props }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useImperativeHandle(ref, () => inputRef.current!, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const originalId = input.id;
    const originalShowPicker = input.showPicker;
    const picker = flatpickr(input, {
      dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y",
      locale: { firstDayOfWeek: 1 }, disableMobile: true,
      onChange: () => onChangeRef.current?.({ target: input, currentTarget: input, type: "change" } as ChangeEvent<HTMLInputElement>),
      onReady: (_, __, instance) => {
        if (instance.altInput) {
          instance.altInput.placeholder = "DD/MM/YYYY";
          instance.altInput.setAttribute("aria-label", input.getAttribute("aria-label") || "Date (DD/MM/YYYY)");
          // Keep external labels pointing to the visible, focusable input.
          if (input.id) { instance.altInput.id = input.id; input.id = `${input.id}-iso`; }
          instance.altInput.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" || event.key === "Delete") {
              event.preventDefault();
              instance.clear();
            }
          });
        }
      },
    });
    pickerRef.current = picker;
    input.showPicker = () => picker.open();
    return () => { picker.destroy(); input.id = originalId; input.showPicker = originalShowPicker; pickerRef.current = null; };
  }, []);

  useEffect(() => {
    const normalized = typeof value === "string" ? toDateOnly(value) : "";
    pickerRef.current?.setDate(normalized ? dateOnlyToLocalDate(normalized)! : [], false);
  }, [value]);
  useEffect(() => {
    pickerRef.current?.set("minDate", typeof min === "string" ? dateOnlyToLocalDate(min) || undefined : undefined);
    pickerRef.current?.set("maxDate", typeof max === "string" ? dateOnlyToLocalDate(max) || undefined : undefined);
  }, [min, max]);
  useEffect(() => {
    if (pickerRef.current?.altInput) {
      pickerRef.current.altInput.disabled = Boolean(disabled);
      pickerRef.current.altInput.required = Boolean(required);
    }
  }, [disabled, required]);

  // Flatpickr creates the visible DD/MM/YYYY alternate input and keeps this
  // input as the canonical value for form state. Keep its React type hidden so
  // later renders cannot expose the internal YYYY-MM-DD value beside it.
  return <input {...props} className={className || "h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"} disabled={disabled} required={required} value={value ?? ""} type="hidden" ref={inputRef} placeholder="DD/MM/YYYY" />;
});
export default DateInput;
