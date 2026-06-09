# feluda-pi-extension

A [pi](https://pi.dev) package that exposes [Feluda](https://github.com/anistark/feluda) as:

- a **skill** for narrow, explicit license-audit workflows
- four **typed tools** for project license analysis and SBOM generation

## What it does

This package helps pi agents answer requests like:

- “Check the licenses in this repo”
- “Do I have any restrictive dependencies?”
- “Is this project compatible with MIT?”
- “Generate an SPDX SBOM for this codebase”

It is intentionally **reactive** and **narrowly triggered**.
It does **not** try to answer general legal questions or choose a license for the user.

## Included tools

### `scan_licenses`
Full dependency license scan.

Parameters:
- `path?`
- `language?` — `rust | node | go | python | c | cpp | r | dotnet`
- `osi?` — `approved | not-approved | unknown`
- `noLocal?`

### `check_restrictive`
Shows only restrictive dependencies.

Parameters:
- `path?`
- `language?`
- `noLocal?`

### `check_compatibility`
Checks dependency licenses against a project license.

Parameters:
- `projectLicense` (required)
- `path?`
- `language?`
- `incompatibleOnly?`

### `generate_sbom`
Generates SPDX or CycloneDX SBOM output.

Parameters:
- `format` — `spdx | cyclonedx | all`
- `path?`
- `output?`

## Included skill

Skill name: **`feluda`**

The skill only triggers when the user explicitly asks about:
- license compliance
- restrictive dependencies
- SBOM generation
- OSI status
- dependency-license auditing

It does **not** trigger for:
- “Which license should I choose?”
- legal advice
- generic open-source policy questions

## Prerequisites

You must have the `feluda` CLI installed.

Common install options:

### macOS
```bash
brew install feluda
```

### universal fallback
```bash
cargo install feluda
```

### Linux
- install the `.deb` or `.rpm` from Feluda releases
- Arch: `paru -S feluda`
- NetBSD: `pkgin install feluda`

Recommended: **Feluda v1.12+**

## Install in pi

### From npm
```bash
pi install npm:feluda-pi-extension
```

### From a local path
```bash
pi install /absolute/path/to/feluda-pi-extension
```

### Temporary run
```bash
pi -e /absolute/path/to/feluda-pi-extension
```

## Local development

```bash
npm install
npm run typecheck
npm test
```

## Release and publish

This repo includes two GitHub Actions workflows:

- `CI` — runs on pushes to `main` and pull requests
- `Publish to npm` — runs when a GitHub release is published

### Required secret

Add this repository secret before cutting a release:

- `NPM_TOKEN` — an npm automation token with permission to publish this package

### Release flow

1. Bump `package.json` version
2. Push the change to `main`
3. Create a GitHub release for that version/tag
4. GitHub Actions will run typecheck + tests and then publish to npm

## Verified status

This package has been validated with:
- unit tests for CLI args, parsing, summaries, tool behavior, and errors
- live execution against a real local `feluda` binary
- smoke-tested tool flows on Feluda’s sample Rust project

## Example prompts

- `Check the licenses in this project`
- `Show me any restrictive dependencies here`
- `Is this repo compatible with MIT?`
- `Generate a CycloneDX SBOM for this project`

## Notes and limitations

- Feluda may emit spinner/progress output even in `--json` mode; this package strips and extracts the JSON payload.
- Empty restrictive-result runs are treated as a successful zero-result case.
- This package summarizes Feluda output for the agent, but it does not replace legal review.

## Legal disclaimer

Feluda and this pi package help inspect dependency licenses.
They do **not** provide legal advice or definitive compliance guarantees.
