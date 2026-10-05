# Isolated library failures

These fixtures use public APIs from the installed beta.10 docs. They are not
modules of the main blog and do not patch or suppress errors.

- **K201 / C014:** `reference()` without a collection is documented under
  `reference/content-config.md#references`. Nuxt prepare rejects it with
  `Field "favorite" has invalid relation cardinality or target.` The main app
  uses declared constrained relations; the targetless example stays failing.
- **K202 / X205 (audit E-A005):** malformed JSON should be rejected. A separate
  production-built filesystem fixture returns HTTP 200 and a body-null empty
  document. The JSON5 and valid JSON production claims remain separate.

Run `node checks/blog-local.mjs` before `pnpm check blog`. Logs, isolated runtime
responses, and output inspection are saved under ignored
`results/evidence/blog/`. The claim reporter includes this local evidence but
it does not turn an isolated local fixture into a public production deployment.
- **K203 / C200 C208:** `content.agent.delivery: 'runtime'` removes HTML from
  `.output/public` but the Nitro Vercel preset retains 32 page HTML files in
  `.vercel/output/static`. Production serves those static files, so same-URL
  Markdown negotiation also fails C212. Source: the installed agent-readable
  output guide's runtime-delivery section and resources/deployment.md. The main
  configured example remains unchanged; no output deletion or host rewrite is
  added. Reproduce with `NITRO_PRESET=vercel pnpm build blog`, then run
  `node checks/blog-local.mjs` and `pnpm check blog`.
