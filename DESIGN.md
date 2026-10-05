# Ginko Content demos: design

Purpose: prove every public claim of `@lupinum/ginko-content` on real, deployed
sites before 1.0. A claim is verified only when a demo shows it on a production
deployment and an automated browser or HTTP check passes against that URL.

Owner of this design: Opus (maintainer side). Builds: Codex, slice by slice.

## Rules that make the demos worth anything

1. **Use the package like a stranger would.** Only documented, public API, written
   the way the docs show it. No imports from `dist/`, `src/`, `#content/*` or other
   internals unless the docs tell users to do so.
2. **Never work around a failure.** If a documented feature does not work, keep the
   demo code that follows the docs, mark the check as failing, and record the claim
   id, the error and the docs source in `results/`. A failing check is a finding, not
   a bug in the demo.
3. **Plain UI.** Unstyled semantic HTML. Stable `data-testid` attributes for checks.
   No design work.
4. **Production is the target.** Every demo deploys to a Vercel production URL
   (`*.vercel.app`); checks run against that URL. Local runs are only for building.
5. **One package source for all demos.** A single root setting picks the package
   (`npm` version or a packed `.tgz` in `vendor/`). Switching to an RC is one command.

## Layout

```txt
ginko-content-demos/
  DESIGN.md
  README.md                 how to switch package, build, deploy, check
  package.json              pnpm workspace root; scripts: use-ginko, build, check
  pnpm-workspace.yaml
  vendor/                   packed ginko-content tarballs (committed)
  apps/<demo>/              one Nuxt app per demo, one Vercel project each
  checks/                   Playwright + HTTP checks, tagged by claim id
    claims-map.json         every claim id -> demo + check name, or "not-live" + reason
  results/<date>-<demo>.json  per-run claim results (pass/fail/blocked + evidence path)
```

## Demos

| Demo | Delivery | Covers |
|---|---|---|
| `quickstart` | SSR | The docs quickstart, copied verbatim. Install, one collection, catch-all page, 404. |
| `docs-site` | static (`nuxt generate`) | Navigation (numeric prefixes, `index.md`, `.navigation.yml`, tree helpers), MiniSearch search, MDC components, TOC, surround, drafts and partials, relative Markdown links, sitemap, agent output (`llms.txt`, `llms-full.txt`, Markdown routes, raw routes, Markdown 404 recovery). |
| `blog` | SSR (runtime) | Data collections, references and populate, backlinks, every `fields.*` type, query API (`one`, `many`, `count`, `resolveOne`, `surround`, `navigation`; where operators, sort incl. numeric fields, cursor and offset pagination, `only`/`without`), server helpers in Nitro routes, site data, cache hints and revalidation. |
| `multilingual` | static | `@nuxtjs/i18n`, shared slugs and translated slugs, fallback, language switch through alternates, hreflang sitemap, Pagefind search. |
| `custom-source` | SSR | A `ContentDataSource` over an in-repo JSON store, registered as documented; provider-owned search, cache hints, route enumeration; portability export/import and `cms-contract` usage run as scripts. |
| `scale` | static + SSR | 2,000 generated Markdown documents (EN + DE). Measures build time, peak memory, output size, client JS, query latency, search completeness (document 101+ and 2,000 must be findable). |

Edge runtime (claim C201) is not a demo yet: Opus decides whether 1.0 keeps that claim.

## Checks

- Playwright for pages, HTTP `fetch` for endpoints (`llms.txt`, sitemap, Markdown negotiation, query API).
- Each test name starts with its claim ids, e.g. `C104 C105 numeric sort orders ranks`.
- Every run writes `results/<date>-<demo>.json`: claim id, status, URL, evidence (screenshot or response file).
- Desktop 1440x900 and mobile 390x844 for every page check.
- Budgets recorded per demo: client JS (gzip) of the first page, Lighthouse mobile performance, build seconds.
