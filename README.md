# Ginko Content demos

Production demos and claim checks for `@lupinum/ginko-content` before 1.0.
[DESIGN.md](DESIGN.md) defines the scope and rules. Library failures remain findings;
change only demo or harness bugs here.

## Package and workspace

Use Node 24 (tested with 24.21.0) and Corepack. Nuxt is pinned to 4.5.2, matching
the library's querying example. Vue is 3.5.40.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
# Stop the dev server with Ctrl-C.
corepack pnpm build
corepack pnpm --filter @ginko-demo/quickstart typecheck
```

`ginko-source.json` is the canonical package source. App dependency entries and
`pnpm-lock.yaml` are generated installation inputs. Always change the source with:

```sh
corepack pnpm use-ginko vendor/lupinum-ginko-content-1.0.0-beta.10-a3e8ef1.tgz
corepack pnpm use-ginko 1.0.0-rc.1
```

The npm command above is an example; the requested version must exist. Use an
exact version. Copy alternative tarballs into `vendor/` before switching so remote
builds use the same source. Calling `pnpm use-ginko` without arguments reinstalls
the configured source and regenerates every app's dependency entry. Commit source,
manifests, tarball (when applicable), and lockfile together.

The committed default tarball was packed from library commit `a3e8ef1`, version
`1.0.0-beta.10`, in a separate detached worktree with frozen install and
`pnpm release:pack`. Its SHA-256 is
`f4f02db3d90bd312519bdef3e94e43b247f928b8f75503c090b0dc7cc27a84c0`.
The worktree was removed. The original library checkout was not built or edited.

## Quickstart

The code blocks for `nuxt.config.ts`, `content.config.ts`, both Markdown files,
and the catch-all page are copied verbatim from beta.10's
`docs/content/docs/1.get-started/1.quickstart.md`. The docs' manual install path
uses the vendor tarball because beta.10 is not on npm. A separate unstyled app
shell provides Home/Guide links and stable `data-testid` attributes. The error UI
is Nuxt's default fatal error page, as requested by the documented `createError`.

Routes: `/`, `/guide`, `/missing` (404).
Production: <https://ginko-demo-quickstart.vercel.app>.

Ginko warns that its enabled sitemap integration has no `@nuxtjs/sitemap` module.
The quickstart does not install that module; its configuration stays unchanged.
Slice 1 does not assert sitemap behavior.

## Production checks

```sh
corepack pnpm --filter @ginko-demo/checks exec playwright install chromium
corepack pnpm check
# Optional override for a deployment-specific production alias:
BASE_URL=https://ginko-demo-quickstart.vercel.app corepack pnpm check quickstart
corepack pnpm check:map
# Compare to the maintainer's original source when it is available:
node scripts/verify-claims.mjs /path/to/library/.audit/claims/claims.json
```

`checks/targets.json` supplies each demo's `BASE_URL`; the environment can override
it. Checks use Chromium only at desktop 1440×900 and mobile 390×844. Plain fetch
assertions inspect SSR HTML and the unknown route's HTTP status. Browser checks
assert both pages, app-owned 404 text, SSR payload reuse, client navigation in both
directions, no stale headings under delayed content requests, and no console or
page errors during the successful navigation journey.

Test names begin with claim IDs. `results/<UTC-date>-quickstart.json` contains one
aggregated record per quickstart claim; each retains the individual test,
viewport, failure, and evidence. Skipped/interrupted or unimplemented checks are
blocked, assertion failures are fail, and only completed successful checks pass.
Screenshots, HTTP responses, failure traces, build timing, client JS details, and
Lighthouse JSON go under `results/evidence/`. Results are git-ignored local
artifacts, never committed. A same-day rerun replaces the run JSON and Playwright
artifacts; retain a copy inside `results/evidence/` before rerunning if needed.

The first claim record also stores measured budgets: cold mobile first-load
unique script-response gzip bytes (Node gzip defaults, not transfer size), one
Lighthouse mobile performance score (0–100), and local build seconds. These are
measurements, not promised thresholds. A failed measurement is reported with a
null value and an issue, never an invented score. Lighthouse can vary by network,
server cold start, and runner load.

## Claim plan

`checks/claims-source.json` is the supplied 365-claim snapshot.
`checks/claims-map.json` assigns every ID exactly once. A planned check is not
verification; only passing production results prove a hosted claim. `not-live`
entries need the stated type, build, CLI, filesystem, or platform check; C201 is
explicitly deferred by DESIGN.md. This slice implements only quickstart.

| Assignment | Claims |
| --- | ---: |
| quickstart | 5 |
| docs-site | 94 |
| blog | 77 |
| multilingual | 32 |
| custom-source | 91 |
| scale | 2 |
| not-live | 64 |
| **Total** | **365** |

The quickstart records C001 (module/two routes), C151 (SSR payload reuse), C152
(client navigation/stale-page suppression), C154 (app-owned 404), and C200
(serverless filesystem snapshot). The two-page fixture proves these scenarios;
it does not prove every possible configuration of those APIs.

## Vercel

Repository: <https://github.com/lupinum-dev/ginko-content-demos>.
Project: `ginko-demo-quickstart` in `Lupinum OG` (`lupinum`).
Project ID: `prj_AMLcxTVpL2f0LTVfVowvoO3ZRf7J`.

The project uses Nuxt, Node 24, root directory `apps/quickstart`, build command
`pnpm build`, and install command
`cd ../.. && corepack pnpm install --frozen-lockfile`. Include source files outside
the root directory so the workspace and `vendor/` are available. Deployment
protection is disabled for this new public demo project only. The GitHub
integration deploys `main` to production.

To deploy this existing project explicitly with the pinned CLI:

```sh
corepack pnpm --filter @ginko-demo/checks exec vercel link --repo --yes --scope lupinum --cwd ../
corepack pnpm --filter @ginko-demo/checks exec vercel deploy --prod --yes --scope lupinum --cwd ../
```

Run production checks after each package switch/deployment. Inspect the target
project before issuing deployment commands; do not reuse an existing library or
client project. No custom domains or external data services are used.
