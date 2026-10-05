# Custom source friction — beta.10 / a3e8ef1

The source is 118 lines (`server/store/source.ts`), plus 5 lines of provider
binding. The finite JSON fixture is a demonstration, not an indexed production
CMS or an operationally certified adapter. It has one public authorization
policy and no external persistence or writes.

- Query glue: implement logical filters, sorting, projection and terminal modes;
  public document identity/body facts must remain when applying projection.
- Cursor glue: bind continuations to snapshot, ordering and collection scope;
  the query and route cursors have different scopes. Snapshot/ETag derive
  from the JSON corpus hash so a store edit invalidates prior cursors.
- Publishing glue: `authored.json` is canonical; `pnpm publish:store` uses the
  public parser to rebuild the persisted AST in `published.json`. No parser
  is called by the production source.
- Bridge glue: bind a public-only verified context at H3, register the module,
  and apply cache headers using the documented cache adapter. Revalidation
  returns 501 because this adapter has no host-cache purge capability.
- Deployment glue: disable Nuxt prerendering with route rules. The first
  Vercel build otherwise discovered and emitted static catalog pages.

## Retained findings

- C013: resolved contract omits `cms.label` (actual `undefined`). Routing/tree
  facts and searchable field override do survive. The supplied claim plan
  explicitly requires the generated contract to carry that label; this is
  an expected CMS-metadata loss, not a claim that every input CMS UI setting
  has a declared output field.
- K301 / D-02: data collection required `title` and `description` produce
  `fields: []`. No alternate field names replace the failing fixture.
- K302 / D-03: a default unlocalized fixture produces `CONTRACT_INVALID`,
  “The default locale must be declared in locales.”
- K303 / X303: the unchanged docs-site export stops at `CONTRACT_INVALID`,
  “defineNuxtConfig is not defined.” No shim, localization override, source
  copy, draft removal or link rewrite is used to make that export pass.
- C238: binder accepts a provider document with `score: NaN`, contradicting
  the documented JSON-purity boundary.
- K304: binder accepts a list with `skip: 99` for requested `skip: 0`.
  The documented single-query conformance helper rejects the same mismatch
  (C328 passes). The runtime query boundary is not inferred from this probe.
- C288: production docs SSR response omits the source freshness hint. Direct
  server-query response and local SSR headers are recorded separately so
  platform rewriting can be distinguished from hint propagation.

These are failing assertions, not expected-failure passes. See the committed
per-claim results and ignored raw logs for the exact observed errors. D-01
(body-renderer bundle includes parser) is not exercised: this demo uses the
normal ContentRenderer and has no body-renderer-specific claim assignment.
