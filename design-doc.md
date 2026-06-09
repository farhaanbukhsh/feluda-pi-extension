# Feluda Pi Extension — Design Document

## 1. Overview

A [pi](https://github.com/badlogic/pi) extension that gives AI agents the ability to analyze project dependency licenses using [Feluda](https://github.com/anistark/feluda), a Rust-based CLI license analyzer. The extension provides both a **skill** (progressive-disclosure usage guide) and **tools** (typed wrappers around Feluda's CLI) so agents can run license scans, detect restrictive licenses, check compatibility, and generate SBOMs — without needing to know Feluda's entire CLI surface.

## 2. Goals

- **Reactive license analysis**: The agent runs Feluda scans when a user explicitly asks about licensing, SBOMs, or compliance.
- **Clear, summarized output**: JSON from Feluda's CLI is transformed into human-readable summaries before reaching the agent.
- **Self-contained onboarding**: The skill guides users through installing Feluda if it's not already on the system.
- **Public distribution quality**: Robust error handling, automated tests, and clear documentation.
- **Narrow triggering**: The skill description only fires on explicit license/SBOM/compliance intent signals — no false positives.

## 3. Non-Goals

- **Licensing education**: The skill teaches Feluda usage, not open-source licensing law. The agent defers legal interpretation to the user.
- **Proactive surfacing**: The agent does not volunteer license info during unrelated tasks (code review, dependency suggestions). v1 is reactive only.
- **CI/CD features**: SARIF output, GitHub Actions integration, Jenkins support — these are out of scope.
- **Compliance file generation**: NOTICE/THIRD_PARTY_LICENSES file generation is out of scope.
- **TUI/GUI**: Feluda's interactive modes are not exposed.

## 4. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Pi Agent                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐ │
│  │   feluda Skill      │    │   feluda Tools (4)        │ │
│  │   (SKILL.md)        │    │                           │ │
│  │   - Usage guide     │    │  scan_licenses            │ │
│  │   - Install guide   │    │  check_restrictive        │ │
│  │   - Flag reference  │    │  check_compatibility      │ │
│  │   - Examples        │    │  generate_sbom            │ │
│  └─────────────────────┘    └──────────┬───────────────┘ │
└────────────────────────────────────────┼─────────────────┘
                                         │
                              ┌──────────▼───────────────┐
                              │   CLI Wrapper Layer       │
                              │   - Binary detection      │
                              │   - CLI arg construction  │
                              │   - Execution + capture   │
                              │   - JSON parse + summarize│
                              │   - Error mapping         │
                              └──────────┬───────────────┘
                                         │
                              ┌──────────▼───────────────┐
                              │   Feluda CLI Binary       │
                              │   (~/.cargo/bin/feluda)   │
                              │   → GitHub API            │
                              └──────────────────────────┘
```

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `SKILL.md` | Progressive-disclosure skill file with usage guide, install instructions, and flag reference. Loaded by pi when trigger conditions match. |
| `scan_licenses` tool | Runs `feluda --json` with optional path, language, and OSI filter. Returns a summary of all dependency licenses. |
| `check_restrictive` tool | Runs `feluda --restrictive --json`. Returns only dependencies with restrictive licenses. |
| `check_compatibility` tool | Runs `feluda --project-license <X> --json`. Returns compatibility status for each dependency against the project license. |
| `generate_sbom` tool | Runs `feluda sbom <format> --output <file>`. Returns the generated SBOM file path and a summary. |
| CLI wrapper | Shared layer that checks for the Feluda binary, constructs CLI args, executes, captures stdout/stderr, parses JSON, and produces a human-readable markdown summary. |
| Error handler | Maps Feluda exit codes and OS-level errors (ENOENT, network failures) into descriptive messages. |

## 5. Tool Schemas

### 5.1 `scan_licenses`

Full dependency license scan for a project.

```typescript
// Input
{
  path?: string;        // Project directory (default: cwd)
  language?: string;    // Force language: rust|node|go|python|java|maven|gradle|c|cpp|r
  osi?: string;         // Filter: "approved" | "not-approved" | "unknown"
  no_local?: boolean;   // Skip local file checks, force network lookup
}

// Output (summary)
{
  project_path: string;
  language_detected: string;
  total_dependencies: number;
  restrictive_count: number;
  incompatible_count?: number;
  dependencies: Array<{
    name: string;
    version: string;
    license: string;
    is_restrictive: boolean;
    osi_status: string;
  }>;
  // Human-readable markdown summary also included
  summary_markdown: string;
}
```

**Feluda CLI mapping**:

```
feluda --path <path> --language <lang> --osi <filter> --json [--no-local]
```

### 5.2 `check_restrictive`

Check for dependencies with restrictive licenses only.

```typescript
// Input
{
  path?: string;
  language?: string;
  no_local?: boolean;
}

// Output
{
  restrictive_dependencies: Array<{
    name: string;
    version: string;
    license: string;
  }>;
  total_restrictive: number;
  summary_markdown: string;
}
```

**Feluda CLI mapping**:

```
feluda --path <path> --language <lang> --restrictive --json [--no-local]
```

### 5.3 `check_compatibility`

Check if dependency licenses are compatible with a specific project license.

```typescript
// Input
{
  project_license: string;  // Required: MIT, Apache-2.0, GPL-3.0, etc.
  path?: string;
  language?: string;
  incompatible_only?: boolean;  // Only show incompatible deps
}

// Output
{
  project_license: string;
  total_dependencies: number;
  compatible_count: number;
  incompatible_count: number;
  unknown_count: number;
  dependencies: Array<{
    name: string;
    version: string;
    license: string;
    compatibility: "Compatible" | "Incompatible" | "Unknown";
  }>;
  summary_markdown: string;
}
```

**Feluda CLI mapping**:

```
feluda --project-license <license> --path <path> --language <lang> --json [--incompatible]
```

### 5.4 `generate_sbom`

Generate a Software Bill of Materials.

```typescript
// Input
{
  format: "spdx" | "cyclonedx" | "all";  // Required
  output?: string;   // Output file path (default: auto-generated)
  path?: string;
  language?: string;
}

// Output
{
  format: string;
  output_file: string;
  dependency_count: number;
  summary_markdown: string;
}
```

**Feluda CLI mapping**:

```
feluda sbom <format> --output <file> --path <path> --language <lang>
```

## 6. Error Handling Strategy

| Scenario | Detection | Response |
|----------|-----------|----------|
| Feluda not installed | `which feluda` / `command -v feluda` fails | Installation guide with OS-specific instructions (cargo, brew, dpkg, rpm, AUR) |
| Unsupported language | User specifies a language Feluda doesn't support | Clear error listing supported languages |
| Network failure | Process exits with network error, GitHub API timeout | Retry suggestion, mention `--no-local` and caching |
| No dependencies found | Empty JSON array from Feluda | "No dependencies detected for this project" |
| Invalid project directory | Feluda returns error | Clear error with the invalid path |
| Permission denied | Process exits with EACCES | Guide to check file/directory permissions |
| GitHub rate limit | Feluda reports rate limit error | Suggest `GITHUB_TOKEN` env var or `--github-token` flag |

## 7. Skill Design (`SKILL.md`)

### Frontmatter

```yaml
---
name: feluda
description: |-
  Analyze project dependency licenses using Feluda — a Rust CLI tool for license auditing, restrictive license detection, compatibility checks, and SBOM generation. 
  Use when the user asks about license compliance, restrictive dependencies, SBOM generation, or auditing project licenses. 
  Supports Rust, Node, Go, Python, Java, C/C++, and R projects. 
  Do not use for general open-source licensing questions or legal advice — this skill teaches Feluda usage only.
---
```

### Skill Content Outline

1. **Quick start** — Basic `feluda` invocation, what it does
2. **Installation guide** — OS-specific install instructions (cargo, brew, dpkg, rpm, AUR, NetBSD pkgin)
3. **Tool reference** — One section per tool with input params, what Feluda command runs, and example output
4. **Supported languages** — Table of languages and their detection mechanisms
5. **Configuration** — `.feluda.toml` for custom restrictive/ignore lists
6. **GitHub token** — Rate limit workaround with `GITHUB_TOKEN`
7. **Troubleshooting** — Common errors and fixes
8. **Legal disclaimer** — Feluda is not a substitute for legal advice

### Trigger Scope

The description triggers only on **explicit license/SBOM/compliance intent**:
- Keywords: `license`, `licensing`, `SBOM`, `restrictive`, `compliance`, `osi`, `check deps`, `audit dependencies`
- Does NOT trigger on: general open-source questions, "which license should I choose?", legal advice questions

## 8. Directory Structure

```
feluda/
├── SKILL.md                    # Skill file (progressive disclosure)
├── package.json                # Extension manifest
├── src/
│   ├── index.ts                # Extension entry point, tool registration
│   ├── cli.ts                  # Feluda CLI wrapper (detect, execute, capture)
│   ├── tools/
│   │   ├── scan-licenses.ts    # scan_licenses tool
│   │   ├── check-restrictive.ts # check_restrictive tool
│   │   ├── check-compatibility.ts # check_compatibility tool
│   │   └── generate-sbom.ts    # generate_sbom tool
│   ├── summarizer.ts           # JSON → markdown summary logic
│   ├── errors.ts               # Error detection and mapping
│   └── install-guide.ts        # OS-specific install guidance
├── tests/
│   ├── cli.test.ts             # CLI wrapper tests (mocked Feluda)
│   ├── tools.test.ts           # Tool logic tests
│   ├── summarizer.test.ts      # Summarization tests
│   ├── errors.test.ts          # Error handling tests
│   └── fixtures/               # Sample Feluda JSON outputs
│       ├── basic-scan.json
│       ├── restrictive.json
│       ├── compatibility.json
│       └── sbom.json
├── tsconfig.json
└── vitest.config.ts
```

## 9. Dependencies

- **pi SDK**: `@earendil-works/pi-coding-agent` — for tool registration, types
- **Feluda CLI**: Must be installed on the user's system (pre-requisite)
- **Node.js/TypeScript**: For the extension runtime
- **Vitest**: For automated test suite

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Feluda CLI breaking changes between versions | Pin a minimum Feluda version in docs; the CLI wrapper is version-agnostic where possible. |
| GitHub API rate limits (60 req/hr unauthenticated) | Document `GITHUB_TOKEN` setup prominently in the skill. |
| False trigger of the skill | Narrow description with explicit keyword gates; tested approach learned from claude-api fix. |
| Large project output overwhelming context | Summarizer truncates output to reasonable limits; raw JSON available on request. |
| Different Feluda output across language ecosystems | Tests cover all 8 languages with representative fixture data. |

## 11. Future Extensions (v2+)

- Proactive license awareness during code review
- CI/CD tool integration (SARIF output)
- Compliance file generation
- Feluda configuration management via tools
- Cache warming/management tools
