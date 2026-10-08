# Contributing

Please follow repository standards for architecture, testing, and security.

## Catalog Changes

- Change a spec in its provider repository first; this catalog only mirrors merged provider specs. Do not edit `openapi/*.yaml` here first.
- A mirror PR copies the provider file unchanged (same file name), updates its entry in `catalog/index.json` and regenerates `docs/API_CATALOGUE.md`. See the flow in `docs/API_CATALOGUE.md`.
- Run `npm test` (catalog index check) and `npx -y @redocly/cli@1.27.1 lint openapi/*.yaml` before opening the PR; `ci/test` also runs the oasdiff and FAPI/DPoP guards.

## Publication-Safe Contribution Rules

- Do not commit local machine paths (absolute paths into a user's home directory on macOS, Windows or Linux).
- Do not commit personal identifiers in logs, examples, or screenshots.
- Do not commit secrets, credentials, private keys, or tokens.
- Keep README/document links valid and repository-local (or explicit public URLs).
