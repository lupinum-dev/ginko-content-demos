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
assertions inspect server-rendered HTML and the unknown route's HTTP status.
Browser checks assert both pages, app-owned 404 text, SSR payload reuse, client
navigation through the shell NuxtLink controls in both directions (the documented
Markdown link is a native anchor), no stale headings under delayed content
requests, and no console or page errors during the successful navigation journey.

`X001 in-content links navigate client-side` clicks the actual Markdown link and
requires a window marker to survive. It is intentionally failing on beta.10:
the content link is a native anchor and reloads the document. The shell NuxtLink
check remains separate. `checks/expectations.json` records expectation checks
and their rationale; they are reported beside claims and do not change the
365-claim inventory.

Test names begin with claim IDs or expectation IDs. `results/<UTC-date>-quickstart.json` contains one
aggregated record per quickstart claim; each retains the individual test,
viewport, failure, and evidence. Skipped/interrupted or unimplemented checks are
blocked, assertion failures are fail, and only completed successful checks pass.
Screenshots, HTTP responses, failure traces, build timing, client JS details, and
Lighthouse JSON go under `results/evidence/`. Run summaries in `results/*.json` are committed. Screenshots, traces, response
bodies, and measurement logs under `results/evidence/` stay git-ignored. `.vercelignore` also excludes results and generated
local build artifacts from CLI uploads. A same-day rerun replaces the run JSON
and Playwright artifacts; retain a copy inside `results/evidence/` before rerunning if needed.

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
explicitly deferred by DESIGN.md. Slice 1 implements quickstart; slice 2a implements docs-site except search and agent output.
The docs-site mapping marks those remaining claims `slice: "2b"`, so the reporter
does not count them as unimplemented 2a checks.

| Assignment | Claims |
| --- | ---: |
| quickstart | 4 |
| docs-site | 82 |
| blog | 78 |
| multilingual | 32 |
| custom-source | 91 |
| scale | 2 |
| not-live | 76 |
| **Total** | **365** |

The quickstart records C001 (module/two routes), C151 (SSR payload reuse), C152
(client navigation/stale-page suppression), C154 (app-owned 404). The unchanged
docs configuration prerenders the
two HTML pages, so C200 (serverless filesystem snapshot) is assigned to the
runtime blog demo. Successful quickstart fetches prove server-rendered HTML,
not runtime filesystem reads. The two-page fixture proves these scenarios;
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

## Docs site (slice 2a)

`apps/docs-site` is a static Nuxt app built with `nuxt generate`. It has 17 public
docs pages in three numbered sections, section `index.md` files, folder metadata,
a pathless group, a menu-hidden page, a sitemap-hidden page, a production draft,
a partial, and an ignored invalid source. Its sidebar and previous/next controls
come from the documented navigation queries; no route list is added to prerender
or sitemap configuration. `content.config.ts` defines the docs, internal-page,
and data collections. Agent output is explicitly disabled and search stays off
until slice 2b.

The ordinary docs pages show Markdown, relative Markdown file links, colon and
angle MDC syntax, inline and nested components, named slots, typed props, images,
code highlighting, repeated headings and TOC. `/inspect` shows tree helpers,
filtered navigation, surround boundaries, excerpt rendering, wrapper attributes,
inline Markdown editing, the fixed inline profile, and the public body renderer.
Summary delimiters use `<!-- more -->`, the Comark default. KaTeX CSS is explicitly
included, as the installed guide requires. Optional plugin peers match the
vendor package's declared ranges.

```sh
corepack pnpm --filter @ginko-demo/docs-site dev
corepack pnpm build docs-site
corepack pnpm --filter @ginko-demo/docs-site typecheck
corepack pnpm check docs-site
corepack pnpm check:map
```

A named build records `results/evidence/build-<demo>.json`. The check runner reads
only that demo's timing and does not reuse another demo's build time. Browser
artifacts use per-demo folders, so checking quickstart does not overwrite the
docs-site screenshots.

`X002 relative Markdown file links reach the intended page` covers same-folder
and cross-section authored file links. The guide recommends final public paths;
X002 is a visitor/author expectation, not an invented library claim. Deferred
non-live fixture requirements are explained per ID in `checks/claims-map.json`.
Partial claim coverage (such as search exposure of `navigation: false`, and
search/agent comment and draft exclusion) still needs slice 2b.

### Current generation blocker

The vendor beta.10 fixture remains unmodified. Relative link ingestion changes
`./3.first-note.md` into bare `first-note`; the renderer rejects that as an unsafe
URL. The enabled `security` plugin removes the typed `enabled=false` component
prop; rendering then rejects the required missing prop. `nuxt generate` exits 1
on these pages locally and on Vercel. No failure suppression, HTML copy, client-only
wrapper, link rewrite, or library patch is used. The project exists but has no
successful production deployment; the configured alias is not a live demo.
Committed results mark production claims blocked and keep local checks separate.
The check runner still executes both viewport projects against the production
URL. When Vercel returns `DEPLOYMENT_NOT_FOUND`, the reporter preserves the
actual assertion errors and marks claims blocked by infrastructure. It does not
report those 404s as library failures or measure the Vercel error page as the demo.

Project `ginko-demo-docs-site`, team `Lupinum OG` (`lupinum`), ID
`prj_rlMxOruQimGq6aWjBOYzZYuVER1F`, uses the Other preset, Node 24, root
`apps/docs-site`, build `pnpm build`, output `.output/public`, and install
`cd ../.. && corepack pnpm install --frozen-lockfile`. Source files outside the
root are included. Deployment protection is disabled only on this approved project.
The CLI upload uses the workspace root, linked explicitly to this project:

```sh
corepack pnpm --filter @ginko-demo/checks exec vercel link --project ginko-demo-docs-site --scope lupinum --yes --cwd ../
corepack pnpm --filter @ginko-demo/checks exec vercel deploy --prod --scope lupinum --yes --cwd ../
```

The CLI upload is independent of the existing quickstart GitHub deployment.
Inspect the project link before deploying; use explicit names and do not deploy
an unrelated project.

## Custom source demo

Production: <https://ginko-demo-custom-source.vercel.app>.
Project `ginko-demo-custom-source`, team `Lupinum OG` (`lupinum`), ID
`prj_Sk21Huih4USEH1pWUD2UvMNBF6wr`. The Nuxt SSR project uses Node 24,
root `apps/custom-source`, build `pnpm build`, and install
`cd ../.. && corepack pnpm install --frozen-lockfile`, with workspace source
outside the root included and deployment protection disabled.

The product catalog and docs come from an in-repo JSON `ContentDataSource`.
The 118-line source advertises equality, offset and cursor pagination; implements
navigation, surroundings, provider search, site data and paged route enumeration;
and excludes unpublished entries on every surface. Pages use collection handles,
`useContentPage`, `many`, `navigation`, `useContentSearch` and `ContentRenderer`.
`authored.json` is canonical; the public portable parser rebuilds `published.json`
at the explicit publishing step. Nuxt route rules keep page delivery at runtime.
The finite fixture has public read authorization and is not a production CMS.

```sh
corepack pnpm --filter @ginko-demo/custom-source publish:store
corepack pnpm --filter @ginko-demo/custom-source dev
corepack pnpm --filter @ginko-demo/custom-source typecheck
corepack pnpm test
corepack pnpm check:custom-source:scripts
corepack pnpm build custom-source
corepack pnpm check custom-source
corepack pnpm check:map
```

The two documented conformance suites run through the real binder. The script
command reads the prepared contract, tests CMS/MDC/portable codecs and V1/V2
policies, round-trips a separate four-document portable directory and rebuilds
its manifest, and attempts the unchanged filesystem docs-site export. Scripts
and conformance are recorded as build-only and conformance evidence, never as
hosted proof. Per-claim summaries remain committed; raw evidence stays ignored.
Every unverified or partial assigned claim has a reason in the claim map.

The checks retain library failures, including data-field loss, default locale
export failure, inability to load the normal docs-site Nuxt config, accepted
invalid binder results, omitted CMS label and missing SSR cache freshness.
[Custom source friction](apps/custom-source/FRICTION.md) describes the glue and
limits. These findings do not have package patches or fallback implementations.

The project has `GINKO_CONTENT_REVALIDATE_TOKEN` configured as a production
secret. The cache adapter only applies standard headers and omits `invalidate`.
A valid HMAC-signed request therefore returns the documented
`501 revalidation_not_supported`; unsigned requests are rejected. To rerun the
signed assertion, supply the same secret through the process environment (never
print it). If absent, the signed check reports an explicit credential skip.
No external cache purge or writable catalog endpoint is added.

Production checks cover desktop 1440×900 and mobile 390×844. Budgets include
first-page unique script gzip, Lighthouse mobile, local build time, and p50/p95
for 20 sequential full-body requests to `/docs/start`. These are observations,
not performance guarantees.
