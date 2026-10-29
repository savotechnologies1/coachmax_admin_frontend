# Audit fixes: frontend validation

The latest requested UI format is **DD/MM/YYYY**. Calendar values sent to the API remain validated YYYY-MM-DD strings; timestamps are UTC instants. The shared DateInput and date helpers enforce this separation. Calendars and View All schedules start Monday.

Term views calculate U group from the term year. General player lists use the organization's current year. Set `VITE_APP_TIMEZONE` to match the backend organization timezone and `VITE_API_BASE_URL` to the actual API origin. Relative/signed media, HTTP and sockets use that origin. A 403 no longer destroys a valid login session.

## Checks

```text
npm ci
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --audit-level=moderate
```

The unit runner includes both `.test.mjs` and `.test.cjs` tests. Playwright launches the actual Vite application with network-mocked API responses; it blocks external traffic and asserts uncaught JavaScript errors/unconfigured requests. It covers term create/edit, Monday pickers, View All multi-day classes/actions, lazy roster loading, notes and clear-status behavior, multipart DOB submissions and failed-save state retention in Sydney and Los Angeles.

The backend has separate real HTTP/Mongo transaction and concurrency tests. Mocked browser responses do not replace an end-to-end staging run against the deployed backend, storage, email or native parent client. See the backend release procedure for coordinated migrations and API contracts.

Private chat files and payment proofs renew access grants when opened. Inline image/audio/video previews perform a bounded renewal after an expired-link error; failed previews expose an accessible fallback. Revoked socket sessions clear the current credentials and return to sign-in, while ordinary network failures retain valid authentication. Delayed events from an older connection cannot clear a newer sign-in.

Browser results are generated in `test-results/browser-report/index.html`, with screenshots/traces under `test-results/browser-artifacts`. Build output must be produced from the new source during release. Pre-existing local `dist` changes were preserved during this implementation; validation builds were written outside that folder.

The route split reduces the audited initial JavaScript bundle from about 3,103 kB to 514 kB (gzip 782 kB to 167 kB). Heavy charts and HEIC conversion remain deferred chunks. These are build sizes, not measurements of production response time or device performance.
