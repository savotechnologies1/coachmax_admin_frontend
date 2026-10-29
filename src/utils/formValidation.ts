import { z, type ZodType } from "zod";

export type FormErrors = Record<string, string>;

export function zodIssuesToFieldErrors(error: z.ZodError): FormErrors {
  return error.issues.reduce<FormErrors>((errors, issue) => {
    const field = issue.path.map(String).join(".");
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

export function validateWithSchema<T>(schema: ZodType<T>, value: unknown): { success: true; data: T; errors: FormErrors } | { success: false; errors: FormErrors } {
  const result = schema.safeParse(value);
  if (result.success) return { success: true, data: result.data, errors: {} };
  return { success: false, errors: zodIssuesToFieldErrors(result.error) };
}

export const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);
