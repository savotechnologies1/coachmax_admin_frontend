# CoachMax Form Design System

This document is the UI and validation contract for CoachMax admin forms. Use the same patterns for create, edit, and nested modal forms so staff can move between sections without relearning controls.

## Brand foundation

Use the existing tokens in `src/index.css` rather than introducing page-specific colors.

| Use | Token / value |
| --- | --- |
| Primary action and focus | `brand-500` `#0047FF` |
| Primary hover | `brand-600` `#0039CC` |
| Dark navigation and form headers | `#031549` |
| Main text | `gray-900` `#101828` |
| Muted text | `gray-500` `#667085` |
| Field border | `gray-300` `#D0D5DD` |
| Error | `error-600` `#D92D20` |
| Success | `success-600` `#039855` |
| Typeface | Outfit, with the existing sans-serif fallback |

Use the brand blue for primary buttons, links, selected controls, and focus rings. Reserve red for field errors and destructive actions. Use white/gray surfaces, subtle borders, and the existing navy in headings or navigation accents. Do not use colored backgrounds as the only way to communicate a field state.

## Layout and fields

- Keep one clear page or modal title, a short explanation, and grouped sections with descriptive headings.
- Use a responsive one-column layout on narrow screens and two-column grids for related fields on larger screens. Keep related inputs together and full-width fields (descriptions, addresses, rich text) across the form.
- Give every control a persistent visible label. Show `*` and `required` for mandatory fields; describe optional fields as optional when upload or content is commonly skipped.
- Use 44 px minimum height for text, number, date, and select controls; 8 px corner radius; 14 px control text; 16 px horizontal padding; and 8 px label-to-control spacing. Use 12–14 px help text below the control.
- Placeholders are examples, not substitutes for labels. Keep units and accepted formats in help text adjacent to the field.
- Keep the primary submit action visually dominant. Disable it only while saving; when required fields are empty, allow submit so the user sees actionable validation.
- On small screens, stack actions and field groups without horizontal overflow. Keep keyboard focus visible and maintain a logical tab order.

## Selects, dates, and numbers

- Use the shared select styling and keep a clear empty option such as “Select a term”. Do not silently select the first option when the user must make a meaningful choice.
- When a selection depends on year, filter its options by the selected year and clear an incompatible dependent selection when the year changes.
- Display the year with the term wherever it appears in an option, selected value, table row, confirmation, or summary. Store the selected year in the submitted payload; do not derive the displayed year from the browser’s current year when the record already has one.
- Use native numeric constraints (`min`, `max`, `step`) and validate the parsed value, not only whether the string is non-empty. Reject negative stock, fee, price, and capacity values where the domain does not permit them.
- Date ranges must be valid calendar dates and start must not be after end. Keep the display format and serialized date-only format consistent with the existing date utilities. Term submissions use the existing API contract of `DD/MM/YYYY`; do not change it to ISO unless the API contract changes too.

## Validation and submission

- Validate on submit and show field-level messages beside the invalid controls. Use `aria-invalid="true"` and associate each message with `aria-describedby`.
- After an invalid submit, focus the first invalid field or the error summary. Preserve entered values; do not close the form or clear data after a failed request.
- Trim text before submitting. Reject whitespace-only required values, invalid email/URL/phone formats, invalid ranges, and missing dependent selections.
- Keep server errors visible and specific. Prevent duplicate submissions while a request is in flight and restore the button after either success or failure.
- Optional content (including images) stays optional unless the workflow/API explicitly requires it. Use one consistent `*` legend per form when mandatory markers are present.
- Associate labels and controls with `htmlFor`/`id`, give icon-only actions accessible names, and announce validation and upload errors with `role="alert"`.

## Image upload, placeholder, and crop standards

The image upload policy in `src/utils/fileValidation.ts` is authoritative. Show a placeholder at the final display ratio, state the recommended pixel dimensions and file limit before upload, crop to the configured output dimensions, and show the same crop in the preview and submitted file. Use `object-fit: cover` for cropped thumbnails and `contain` for uncropped documents. Alt text should describe the image’s purpose, not repeat the filename.

| Image field | Placeholder ratio and recommended size | Crop output | File limit |
| --- | --- | --- | --- |
| Player/profile image | 1:1, 512 × 512 px | 512 × 512 px | 5 MB |
| Team/league logo | 1:1, 512 × 512 px | 512 × 512 px | 2 MB |
| Holiday/event banner | 16:9, 1920 × 1080 px | 1920 × 1080 px | 8 MB |
| Sponsor banner | 3:1, 1200 × 400 px | 1200 × 400 px | 5 MB |
| News article image | 16:9, 1200 × 675 px | 1200 × 675 px | 5 MB |
| Gallery image | 1:1, 1200 × 1200 px or larger | Keep original ratio | 5 MB |
| Product image | 1:1, 1200 × 1200 px | 1200 × 1200 px | 5 MB per image |
| QR code | 1:1, 1024 × 1024 px | 1024 × 1024 px | 2 MB |
| Payment proof/document | Original scan/photo; do not force a crop | Keep original | 10 MB |

Accept only the formats listed by the matching upload policy (JPEG, PNG, WebP, HEIC/HEIF, and PDF only where allowed). Validate the file type and size before opening the cropper, normalize HEIC/HEIF before previewing, let the user reposition/zoom, and validate the cropped result before submit. Revoke preview object URLs when they are replaced or the form unmounts. Keep upload optional unless the field is explicitly marked required.

## Forms covered by this standard

Apply the shared field surface (`data-coachmax-form`) and the matching validation/upload rules to:

- Teams: `TeamManagement` and the create-team dialog inside a league.
- Leagues: create/edit league wizard and year/term selection.
- Holiday programs: event create/edit wizard and generated session rates.
- Store: add/edit product and store category management modal.
- News: add article and edit article, including banner upload.
- Academy categories: create/edit category.
- Terms: create/edit term, including year and date range.
- Classes: create/edit/duplicate class, including year-filtered term selection and schedule constraints.

Before release, exercise create and edit submissions with valid and invalid data, inspect the serialized year and date values, upload a representative image through crop and verify its output dimensions, and confirm server failures preserve form contents.
