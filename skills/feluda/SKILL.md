---
name: feluda
description: Analyze project dependency licenses using Feluda — a Rust CLI tool for license auditing, restrictive license detection, compatibility checks, and SBOM generation. Use when the user explicitly asks about license compliance, restrictive dependencies, SBOM generation, OSI status, or auditing project dependencies. Supports Rust, Node, Go, Python, C, C++, R, and .NET projects. Do not use for general open-source licensing questions or legal advice — this skill teaches Feluda usage only.
---

# Feluda

Feluda is a CLI for analyzing dependency licenses in a codebase. This skill is a **usage guide**, not a legal advisor.

## When to use this skill

Use it only when the user explicitly asks for:
- license checks
- dependency license audits
- restrictive license detection
- compatibility against a project license
- SBOM generation
- OSI approval status

Do **not** use it for:
- "Which license should I choose for my project?"
- general legal advice
- broad open-source policy discussions

## Before using the tools

1. Confirm the user is asking about their codebase or dependencies.
2. If they did not specify a path, use the current working directory.
3. If Feluda is missing, explain how to install it instead of pretending the tool can run.

## Install Feluda if missing

Common install options:
- macOS: `brew install feluda`
- universal fallback: `cargo install feluda`
- Debian/Ubuntu: install the `.deb` from GitHub releases
- Fedora/RHEL: install the `.rpm` from GitHub releases
- Arch: `paru -S feluda`
- NetBSD: `pkgin install feluda`

Recommend Feluda v1.13+.

## Available pi tools

### `scan_licenses`
Use for a full dependency license inventory.

Inputs:
- `path?`
- `language?` (`rust`, `node`, `go`, `python`, `c`, `cpp`, `r`, `dotnet`)
- `osi?` (`approved`, `not-approved`, `unknown`)
- `noLocal?`

Typical use:
- "Check the licenses in this repo"
- "Show only OSI-approved dependencies"

### `check_restrictive`
Use when the user asks whether a repo has restrictive or risky dependency licenses.

Inputs:
- `path?`
- `language?`
- `noLocal?`

Typical use:
- "Do I have any restrictive licenses?"
- "Find copyleft-ish dependencies in this project"

### `check_compatibility`
Use when the user provides a project license and wants compatibility analysis.

Inputs:
- `projectLicense` (required)
- `path?`
- `language?`
- `incompatibleOnly?`

Typical use:
- "Is this repo compatible with MIT?"
- "Show me only the incompatible dependencies for Apache-2.0"

### `generate_sbom`
Use when the user explicitly asks for SPDX, CycloneDX, or a general SBOM.

Inputs:
- `format` (`spdx`, `cyclonedx`, `all`)
- `output?`
- `path?`

Typical use:
- "Generate an SPDX SBOM for this repo"
- "Create both SBOM formats and save them"

## Reporting guidance

When reporting Feluda results:
- summarize key counts first
- call out restrictive or incompatible dependencies explicitly
- mention the project license when using compatibility mode
- keep raw JSON details secondary to the summary
- if Feluda returns nothing, say so plainly

## Configuration notes

Feluda supports `.feluda.toml` for custom restrictive and ignored licenses. If a user asks why something is marked restrictive, mention that local Feluda configuration may affect results.

Feluda may use the GitHub API for license lookups. If the user hits rate limits, suggest setting:

```bash
export GITHUB_TOKEN=...
```

## Legal disclaimer

Feluda helps inspect dependency licenses. It is **not** a substitute for legal review. Do not claim the tool provides legal advice or definitive compliance guarantees.
