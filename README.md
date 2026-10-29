# coachmax_admin_frontend

## Production deployment

The `main` branch runs the quality checks on every push. To enable automatic
deployment after those checks pass, set the repository Actions variable
`DEPLOY_ENABLED` to `true` and configure:

- Variables: `DEPLOY_USER`, `DEPLOY_PATH`, and optionally `DEPLOY_HOST` (defaults
  to `50.6.44.47`) and `DEPLOY_PORT` (defaults to `22`). `DEPLOY_PATH` must be
  the document root for `admin.coachmax.server24.in`.
- Secret: `DEPLOY_SSH_KEY`, the private SSH key whose public key is authorized
  for that server account.
- Optional variable: `VITE_API_BASE_URL` (defaults to
  `https://coachmax.server24.in`).

The deploy job uploads the production build only after lint, tests, build, and
the existing browser checks pass. Manual deployment is available through
`workflow_dispatch` on `main`.
